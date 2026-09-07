import { prisma } from "./prisma";
import { enabledSources, KEYWORD_FILTER, type Source } from "./sources";
import { scrapedSources, type ScrapedSource } from "./scrapers";

const INDEX_SOURCE_NAMES = new Set(scrapedSources.map((s) => s.name));
import { fetchFeed, type FeedItem } from "./rss";
import { extractArticleText } from "./extract";
import { summarizeArticle } from "./summarize";

/** Runs `fn` over `items` with at most `concurrency` in flight at once.
 * Each item's own DB write only touches its own row, so running several
 * Claude calls (the slowest single step in the pipeline) in parallel is
 * safe — it just shrinks the wall-clock time of a run, which matters given
 * Vercel Hobby's real 60s function ceiling. */
async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

/** What the ingest pipeline actually needs from a source, regardless of
 * whether it came from sources.ts (RSS) or scrapers.ts (custom scrape). */
type IngestSource = Pick<Source | ScrapedSource, "name" | "homepageUrl" | "defaultCategory"> & {
  paywalled?: boolean;
  keywordFilter?: boolean;
};

// Cost/safety controls for the Claude API step.
//
// Vercel's Hobby plan hard-caps serverless function execution at 60s
// regardless of the `maxDuration` route export (that only matters on Pro+) —
// there is no error, no thrown exception, the function is just killed
// mid-request. Since every article write commits individually but FetchLog
// is only written at the very end, a kill shows up as: articles keep
// appearing, but no new FetchLog row, and summaries stop progressing. That's
// exactly what happened once source count grew past ~30 (RSS + scraper
// listing fetches alone started eating a large chunk of the 60s). These caps
// were raised to 60/60 back when there were 14 sources and comfortably fit;
// they don't anymore. Pulled back down to fit real work (parallel feed
// fetch + sequential extraction + sequential Claude calls) inside 60s with
// margin. A once-daily cron at this size can't clear a large backlog by
// itself — see README for the external multi-trigger-per-day setup.
const MAX_SUMMARIES_PER_RUN = 12;
const MAX_ARTICLE_AGE_HOURS_FOR_SUMMARY = 24 * 7; // don't burn quota backfilling very old items
const RAW_EXCERPT_MAX_LENGTH = 20000;
const MAX_NEW_ARTICLES_PER_RUN = 12;

export interface IngestResult {
  sourcesOk: number;
  sourcesFailed: number;
  articlesFound: number;
  articlesNew: number;
  summariesOk: number;
  summariesFailed: number;
  errors: string[];
}

async function ingestNewArticles(): Promise<{
  sourcesOk: number;
  sourcesFailed: number;
  found: number;
  created: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sourcesOk = 0;
  let sourcesFailed = 0;
  let found = 0;
  let created = 0;

  // Fetch every feed up front so we can interleave sources fairly below —
  // otherwise a single high-volume source (e.g. FreightWaves) drains the
  // whole run's cap before lower-volume sources ever get a turn. RSS
  // sources and custom-scraped sources (market indices etc.) are merged
  // into the same list here — downstream code doesn't need to know which
  // is which.
  //
  // Run all fetches concurrently rather than one-by-one: with ~35+ sources
  // now (some of them full-page scrapes, not just small RSS files),
  // fetching sequentially could alone eat a large share of Vercel's 60s
  // (Hobby plan) function budget before extraction/summarization even
  // start. In parallel this phase is bounded by the single slowest source
  // instead of the sum of all of them.
  const perSource: { source: IngestSource; items: FeedItem[] }[] = [];

  const fetchTasks: { source: IngestSource; fetch: () => Promise<FeedItem[]> }[] = [
    ...enabledSources().map((source) => ({ source, fetch: () => fetchFeed(source) })),
    ...scrapedSources
      .filter((s) => s.enabled)
      .map((source) => ({ source, fetch: source.fetchItems })),
  ];

  const fetchResults = await Promise.allSettled(
    fetchTasks.map(async ({ source, fetch }) => {
      let items = await fetch();
      if (source.keywordFilter) {
        items = items.filter((i) => KEYWORD_FILTER.test(`${i.title} ${i.rssText}`));
      }
      return { source, items };
    }),
  );

  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i];
    const { source } = fetchTasks[i];
    if (result.status === "fulfilled") {
      sourcesOk++;
      found += result.value.items.length;
      perSource.push(result.value);
    } else {
      sourcesFailed++;
      errors.push(`[${source.name}] feed-henting feilet: ${(result.reason as Error).message}`);
    }
  }

  // One batched dedup query instead of one per article.
  const allUrls = perSource.flatMap((s) => s.items.map((i) => i.articleUrl));
  const existingUrls = new Set(
    allUrls.length
      ? (
          await prisma.article.findMany({
            where: { articleUrl: { in: allUrls } },
            select: { articleUrl: true },
          })
        ).map((a) => a.articleUrl)
      : [],
  );

  const queues = perSource.map(({ source, items }) => ({
    source,
    queue: items.filter((i) => !existingUrls.has(i.articleUrl)),
  }));

  // Round-robin one candidate per source per round, so every source gets a
  // fair share of the cap instead of whichever source comes first in the
  // list. This pass only *selects* which items to process — no I/O — so the
  // actual extraction (the slow part, one real HTTP fetch per article) can
  // run concurrently below instead of one at a time.
  const selected: { source: IngestSource; item: FeedItem }[] = [];
  let progressed = true;
  while (selected.length < MAX_NEW_ARTICLES_PER_RUN && progressed) {
    progressed = false;

    for (const { source, queue } of queues) {
      if (selected.length >= MAX_NEW_ARTICLES_PER_RUN) break;
      const item = queue.shift();
      if (!item) continue;
      progressed = true;
      selected.push({ source, item });
    }
  }

  await mapWithConcurrency(selected, 5, async ({ source, item }) => {
    try {
      // A scraper that already captured the real content while building
      // the item list (e.g. Drewry's same-URL weekly update) skips
      // re-fetching articleUrl — that content already is the complete
      // public commentary, not a preview, so it's never "limited".
      const extracted = item.fullText
        ? { text: item.fullText, isFullText: true }
        : await extractArticleText(item.articleUrl, item.title, item.rssText);
      const isLimited = Boolean(source.paywalled) || !extracted.isFullText;

      await prisma.article.create({
        data: {
          title: item.title,
          sourceName: source.name,
          sourceUrl: source.homepageUrl,
          articleUrl: item.articleUrl,
          publishedAt: item.publishedAt,
          rawExcerpt: extracted.text.slice(0, RAW_EXCERPT_MAX_LENGTH) || null,
          accessLevel: isLimited ? "limited" : "full",
          category: source.defaultCategory,
          summaryStatus: extracted.text ? "pending" : "failed",
          summaryError: extracted.text ? null : "Ingen tekst kunne hentes ut",
        },
      });
      created++;
    } catch (err) {
      errors.push(
        `[${source.name}] "${item.title}" kunne ikke lagres: ${(err as Error).message}`,
      );
    }
  });

  return { sourcesOk, sourcesFailed, found, created, errors };
}

async function runSummaryQueue(): Promise<{
  ok: number;
  failed: number;
  errors: string[];
}> {
  const cutoff = new Date(
    Date.now() - MAX_ARTICLE_AGE_HOURS_FOR_SUMMARY * 60 * 60 * 1000,
  );

  // Pull more candidates than the cap so the round-robin below has enough
  // per-source depth to draw from — a flat `take: MAX_SUMMARIES_PER_RUN`
  // ordered by publishedAt would let a high-frequency source's newest items
  // crowd out everything else, the same fairness bug as article creation.
  const candidates = await prisma.article.findMany({
    where: {
      summaryStatus: "pending",
      publishedAt: { gte: cutoff },
      rawExcerpt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    take: MAX_SUMMARIES_PER_RUN * 6,
  });

  const bySource = new Map<string, typeof candidates>();
  for (const article of candidates) {
    const list = bySource.get(article.sourceName) ?? [];
    list.push(article);
    bySource.set(article.sourceName, list);
  }
  const queues = [...bySource.values()];

  const pending: typeof candidates = [];
  let progressed = true;
  while (pending.length < MAX_SUMMARIES_PER_RUN && progressed) {
    progressed = false;
    for (const queue of queues) {
      if (pending.length >= MAX_SUMMARIES_PER_RUN) break;
      const article = queue.shift();
      if (!article) continue;
      progressed = true;
      pending.push(article);
    }
  }

  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  await mapWithConcurrency(pending, 4, async (article) => {
    try {
      const result = await summarizeArticle({
        title: article.title,
        sourceName: article.sourceName,
        extractedText: article.rawExcerpt ?? "",
        explainRelevance: INDEX_SOURCE_NAMES.has(article.sourceName),
      });

      if (!result.sufficientContent) {
        // Claude itself flagged the extracted text as mismatched with the
        // title or too thin to summarize reliably (e.g. extraction grabbed
        // an unrelated "related articles" block, or a paywall wall slipped
        // through). Don't publish a summary built on bad input — treat it
        // like any other extraction failure instead.
        failed++;
        errors.push(
          `[${article.sourceName}] "${article.title}": Kildeteksten var utilstrekkelig eller matchet ikke tittelen (${result.summary})`,
        );
        await prisma.article.update({
          where: { id: article.id },
          data: {
            summaryStatus: "failed",
            summaryError: `Utilstrekkelig/feil kildeinnhold: ${result.summary}`,
          },
        });
        return;
      }

      await prisma.article.update({
        where: { id: article.id },
        data: {
          aiSummary: result.summary,
          category: result.category,
          summaryStatus: "done",
          summarizedAt: new Date(),
          summaryError: null,
        },
      });
      ok++;
    } catch (err) {
      failed++;
      const message = (err as Error).message;
      errors.push(`[${article.sourceName}] "${article.title}": ${message}`);
      await prisma.article.update({
        where: { id: article.id },
        data: { summaryStatus: "failed", summaryError: message },
      });
    }
  });

  return { ok, failed, errors };
}

/**
 * runSummaryQueue only ever considers articles newer than
 * MAX_ARTICLE_AGE_HOURS_FOR_SUMMARY — anything older that's still "pending"
 * (e.g. from before that source's turn came up in the round-robin) will
 * never be picked up again and would otherwise sit there forever, making
 * the pending count a mix of "will process soon" and "permanently
 * abandoned". A single cheap updateMany keeps that count meaningful.
 */
async function expireStalePending(): Promise<number> {
  const cutoff = new Date(Date.now() - MAX_ARTICLE_AGE_HOURS_FOR_SUMMARY * 60 * 60 * 1000);
  const result = await prisma.article.updateMany({
    where: { summaryStatus: "pending", publishedAt: { lt: cutoff } },
    data: {
      summaryStatus: "failed",
      summaryError: "For gammel til å bli oppsummert (utenfor retry-vinduet)",
    },
  });
  return result.count;
}

/**
 * Full ingestion pass: pull new articles from every enabled feed, then run
 * the AI-summary queue over whatever is pending. Errors from individual
 * sources or articles are collected, not thrown, so one bad feed/article
 * never stops the rest of the run.
 */
export async function runIngest(): Promise<IngestResult> {
  const fetchResult = await ingestNewArticles();
  const summaryResult = await runSummaryQueue();
  await expireStalePending();

  const result: IngestResult = {
    sourcesOk: fetchResult.sourcesOk,
    sourcesFailed: fetchResult.sourcesFailed,
    articlesFound: fetchResult.found,
    articlesNew: fetchResult.created,
    summariesOk: summaryResult.ok,
    summariesFailed: summaryResult.failed,
    errors: [...fetchResult.errors, ...summaryResult.errors],
  };

  try {
    // A logging failure (e.g. a dropped connection after a long run)
    // shouldn't turn an otherwise-successful ingest into an error response —
    // every article was already committed above.
    await prisma.fetchLog.create({
      data: {
        sourcesOk: result.sourcesOk,
        sourcesFailed: result.sourcesFailed,
        articlesFound: result.articlesFound,
        articlesNew: result.articlesNew,
        summariesOk: result.summariesOk,
        summariesFailed: result.summariesFailed,
        errors: result.errors.length ? result.errors.join("\n") : null,
      },
    });
  } catch (err) {
    result.errors.push(`Kunne ikke lagre FetchLog: ${(err as Error).message}`);
  }

  return result;
}
