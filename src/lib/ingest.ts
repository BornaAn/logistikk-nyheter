import { prisma } from "./prisma";
import { enabledSources, KEYWORD_FILTER, type Source } from "./sources";
import { fetchFeed, type FeedItem } from "./rss";
import { extractArticleText } from "./extract";
import { summarizeArticle } from "./summarize";

// Cost/safety controls for the Claude API step.
const MAX_SUMMARIES_PER_RUN = 60;
const MAX_ARTICLE_AGE_HOURS_FOR_SUMMARY = 24 * 7; // don't burn quota backfilling very old items
const RAW_EXCERPT_MAX_LENGTH = 20000;

// Extraction (full-page scrape per article) is the slow step — capping how
// many new articles we create per run keeps each cron invocation well
// within a serverless function's time limit. A large backlog (e.g. the
// very first run) just gets picked up gradually over the next few runs,
// since already-seen URLs are skipped on every pass. A first production
// run at 30/30 completed successfully well past the 280s a client-side
// curl waited on, so this is raised to 60/60 for better same-day coverage
// across 14 sources on the once-daily cron — revisit if a run ever times
// out (check Vercel's function logs for the /api/cron invocation).
const MAX_NEW_ARTICLES_PER_RUN = 60;

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
  // whole run's cap before lower-volume sources ever get a turn.
  const perSource: { source: Source; items: FeedItem[] }[] = [];
  for (const source of enabledSources()) {
    try {
      let items = await fetchFeed(source);
      sourcesOk++;
      found += items.length;

      if (source.keywordFilter) {
        items = items.filter((i) => KEYWORD_FILTER.test(`${i.title} ${i.rssText}`));
      }

      perSource.push({ source, items });
    } catch (err) {
      sourcesFailed++;
      errors.push(`[${source.name}] feed-henting feilet: ${(err as Error).message}`);
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

  // Round-robin one candidate per source per round, so every source gets
  // a fair share of the cap instead of whichever source comes first in
  // the list.
  let progressed = true;
  while (created < MAX_NEW_ARTICLES_PER_RUN && progressed) {
    progressed = false;

    for (const { source, queue } of queues) {
      if (created >= MAX_NEW_ARTICLES_PER_RUN) break;
      const item = queue.shift();
      if (!item) continue;
      progressed = true;

      try {
        const extracted = await extractArticleText(item.articleUrl, item.title, item.rssText);
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
    }
  }

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

  for (const article of pending) {
    try {
      const result = await summarizeArticle({
        title: article.title,
        sourceName: article.sourceName,
        extractedText: article.rawExcerpt ?? "",
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
        continue;
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
  }

  return { ok, failed, errors };
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
