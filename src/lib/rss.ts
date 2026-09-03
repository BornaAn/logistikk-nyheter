import Parser from "rss-parser";
import * as cheerio from "cheerio";
import type { Source } from "./sources";

type CustomItem = {
  contentEncoded?: string;
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; LogistikkNyhetsbot/1.0; +https://example.com/bot)",
    // Some servers (seen on wto.org) return 406 Not Acceptable without an
    // explicit Accept header even though curl's default is fine.
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

export interface FeedItem {
  title: string;
  articleUrl: string;
  publishedAt: Date;
  /** Best text we could get straight from the feed (content:encoded > contentSnippet). */
  rssText: string;
}

function stripHtml(html: string): string {
  return cheerio.load(html).text().replace(/\s+/g, " ").trim();
}

export async function fetchFeed(source: Source): Promise<FeedItem[]> {
  if (!source.feedUrl) return [];

  const feed = await parser.parseURL(source.feedUrl);
  const items: FeedItem[] = [];

  for (const item of feed.items) {
    if (!item.link || !item.title) continue;

    const now = new Date();
    const rawPublishedAt = item.isoDate
      ? new Date(item.isoDate)
      : item.pubDate
        ? new Date(item.pubDate)
        : now;

    // Some feeds (seen on Transport Topics' sponsored items) report a
    // publish date days in the future — a bad/placeholder value on their
    // end. Trusting it would both misrender as "just now" and unfairly
    // pin the item at the top of the "newest first" sort indefinitely, so
    // clamp anything after the moment we're fetching it to right now.
    const publishedAt =
      Number.isNaN(rawPublishedAt.getTime()) || rawPublishedAt > now
        ? now
        : rawPublishedAt;

    const rssText = item.contentEncoded
      ? stripHtml(item.contentEncoded)
      : (item.contentSnippet ?? item.content ?? "").trim();

    items.push({
      title: item.title.trim(),
      articleUrl: item.link.trim(),
      publishedAt,
      rssText,
    });
  }

  return items;
}
