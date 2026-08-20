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

    const publishedAt = item.isoDate
      ? new Date(item.isoDate)
      : item.pubDate
        ? new Date(item.pubDate)
        : new Date();

    const rssText = item.contentEncoded
      ? stripHtml(item.contentEncoded)
      : (item.contentSnippet ?? item.content ?? "").trim();

    items.push({
      title: item.title.trim(),
      articleUrl: item.link.trim(),
      publishedAt: Number.isNaN(publishedAt.getTime())
        ? new Date()
        : publishedAt,
      rssText,
    });
  }

  return items;
}
