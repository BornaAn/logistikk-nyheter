import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

export interface ExtractedArticle {
  text: string;
  /** True if we got a full-length article body, false if only a short snippet. */
  isFullText: boolean;
}

const MIN_FULL_TEXT_LENGTH = 800;

const USER_AGENT =
  "Mozilla/5.0 (compatible; LogistikkNyhetsbot/1.0; +https://example.com/bot)";

function fetchWithUserAgent(url: string): Promise<Response> {
  return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, figure, iframe").remove();
  return $.text().replace(/\s+/g, " ").trim();
}

/**
 * Fetches the article page and pulls out the main body text.
 * Falls back to the RSS description if extraction fails or the page
 * is behind a paywall (short/empty result) — the caller decides how to
 * flag access level.
 */
export async function extractArticleText(
  articleUrl: string,
  rssFallback: string | undefined,
): Promise<ExtractedArticle> {
  try {
    const article = await extract(articleUrl, undefined, fetchWithUserAgent);

    const bodyHtml = article?.content;
    if (bodyHtml) {
      const text = htmlToText(bodyHtml);
      if (text.length >= MIN_FULL_TEXT_LENGTH) {
        return { text, isFullText: true };
      }
      if (text.length > 0) {
        return { text, isFullText: false };
      }
    }
  } catch {
    // Extraction failed (paywall, blocked, network error) — fall through.
  }

  const fallback = (rssFallback ?? "").trim();
  return {
    text: fallback,
    isFullText: fallback.length >= MIN_FULL_TEXT_LENGTH,
  };
}
