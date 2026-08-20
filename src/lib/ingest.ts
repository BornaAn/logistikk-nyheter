import { prisma } from "./prisma";
import { enabledSources } from "./sources";
import { fetchFeed } from "./rss";
import { extractArticleText } from "./extract";
import { summarizeArticle } from "./summarize";

// Cost/safety controls for the Claude API step.
const MAX_SUMMARIES_PER_RUN = 30;
const MAX_ARTICLE_AGE_HOURS_FOR_SUMMARY = 24 * 7; // don't burn quota backfilling very old items
const RAW_EXCERPT_MAX_LENGTH = 20000;

// Extraction (full-page scrape per article) is the slow step — capping how
// many new articles we create per run keeps each cron invocation well
// within a serverless function's time limit. A large backlog (e.g. the
// very first run) just gets picked up gradually over the next few runs,
// since already-seen URLs are skipped on every pass.
const MAX_NEW_ARTICLES_PER_RUN = 30;

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

  for (const source of enabledSources()) {
    if (created >= MAX_NEW_ARTICLES_PER_RUN) break;

    let items;
    try {
      items = await fetchFeed(source);
      sourcesOk++;
    } catch (err) {
      sourcesFailed++;
      errors.push(`[${source.name}] feed-henting feilet: ${(err as Error).message}`);
      continue;
    }

    found += items.length;

    for (const item of items) {
      if (created >= MAX_NEW_ARTICLES_PER_RUN) break;

      try {
        const existing = await prisma.article.findUnique({
          where: { articleUrl: item.articleUrl },
          select: { id: true },
        });
        if (existing) continue;

        const extracted = await extractArticleText(item.articleUrl, item.rssText);
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

  const pending = await prisma.article.findMany({
    where: {
      summaryStatus: "pending",
      publishedAt: { gte: cutoff },
      rawExcerpt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    take: MAX_SUMMARIES_PER_RUN,
  });

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

  return result;
}
