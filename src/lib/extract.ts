import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

export interface ExtractedArticle {
  text: string;
  /** True if we got a full-length article body, false if only a short snippet. */
  isFullText: boolean;
}

const MIN_FULL_TEXT_LENGTH = 800;
// Below this, a "real" excerpt isn't worth summarizing on its own — treat it
// the same as no content at all rather than let Claude pad it out.
const MIN_USABLE_LENGTH = 40;

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

const STOPWORDS = new Set([
  "with", "from", "that", "this", "have", "will", "about", "after", "over",
  "into", "their", "there", "which", "what", "when", "where", "would",
  "could", "should", "these", "those", "than", "them", "then", "some",
  "such", "more", "most", "also", "only", "just", "still", "even",
  "being", "been", "were", "says", "said",
  "med", "fra", "som", "har", "skal", "blir", "ikke", "eller", "denne",
  "dette", "disse", "hvor", "hvordan", "etter", "over", "under", "også",
  "kommer", "flere", "mellom", "gjennom", "være",
]);

/** Lowercased, punctuation-stripped words of 4+ letters, minus common stopwords. */
function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * True if none of the title's significant words appear anywhere in the
 * extracted body — a strong signal the scraper grabbed the wrong block on
 * the page (e.g. a "related articles" widget) instead of the real article,
 * which happens on some paywalled pages where Readability-style extraction
 * scores a well-formed teaser box higher than the sparse real content.
 */
function looksUnrelatedToTitle(title: string, body: string): boolean {
  const words = significantWords(title);
  if (words.length === 0) return false; // nothing distinctive to check against
  const bodyLower = body.toLowerCase();
  return !words.some((w) => bodyLower.includes(w));
}

// Login/paywall-wall boilerplate that carries zero article-specific
// information — summarizing it just invites the model to invent detail
// from the title alone.
const BOILERPLATE_PATTERNS = [
  /subscriber access/i,
  /sign in to continue/i,
  /log in to continue/i,
  /subscribe (to|now)/i,
  /for uninterrupted access/i,
  /create a free account/i,
  /this content is for subscribers/i,
  /register to (read|continue)/i,
];

function isBoilerplateOnly(text: string): boolean {
  // Long enough that real content plus an incidental paywall note is more
  // likely than the whole thing being a login wall.
  if (text.length > 500) return false;
  return BOILERPLATE_PATTERNS.some((p) => p.test(text));
}

/**
 * Fetches the article page and pulls out the main body text.
 * Falls back to the RSS description if extraction fails, mismatches the
 * article's own title, or is a paywall/login wall with no real content —
 * the caller decides how to flag access level.
 */
export async function extractArticleText(
  articleUrl: string,
  title: string,
  rssFallback: string | undefined,
): Promise<ExtractedArticle> {
  try {
    const article = await extract(articleUrl, undefined, fetchWithUserAgent);

    const bodyHtml = article?.content;
    if (bodyHtml) {
      const text = htmlToText(bodyHtml);
      if (
        text.length > 0 &&
        !looksUnrelatedToTitle(title, text) &&
        !isBoilerplateOnly(text)
      ) {
        if (text.length >= MIN_FULL_TEXT_LENGTH) {
          return { text, isFullText: true };
        }
        return { text, isFullText: false };
      }
    }
  } catch {
    // Extraction failed (paywall, blocked, network error) — fall through.
  }

  const fallback = (rssFallback ?? "").trim();
  if (fallback.length < MIN_USABLE_LENGTH || isBoilerplateOnly(fallback)) {
    return { text: "", isFullText: false };
  }
  return {
    text: fallback,
    isFullText: fallback.length >= MIN_FULL_TEXT_LENGTH,
  };
}
