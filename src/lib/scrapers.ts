import * as cheerio from "cheerio";
import type { Category } from "@prisma/client";
import type { SourceCountry } from "./sources";
import type { FeedItem } from "./rss";

/**
 * A source that isn't RSS at all — market indices and similar sites that
 * publish real, freely-readable commentary but no feed. Each one scrapes
 * its own listing/page and returns items shaped exactly like FeedItem, so
 * the rest of the ingest pipeline (dedup, round-robin, extraction,
 * Claude summarization, sufficientContent safety check) doesn't need to
 * know the difference between this and a normal RSS source.
 */
export interface ScrapedSource {
  slug: string;
  name: string;
  homepageUrl: string;
  country: SourceCountry;
  defaultCategory: Category;
  paywalled?: boolean;
  enabled: boolean;
  fetchItems: () => Promise<FeedItem[]>;
}

const UA = "Mozilla/5.0 (compatible; LogistikkNyhetsbot/1.0; +https://example.com/bot)";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fra ${url}`);
  return res.text();
}

// --- Drewry World Container Index ---------------------------------------
// Same URL updates in place every Thursday — there's no dated permalink to
// dedup against, so we build a synthetic one from the date in the page's
// own "Our detailed assessment for <date>" heading. The #fragment is
// ignored by browsers, so the "Les hele saken" link still opens the real,
// current page.

async function fetchDrewry(): Promise<FeedItem[]> {
  const url =
    "https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry";
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const heading = $("h4")
    .filter((_, el) => $(el).text().includes("Our detailed assessment"))
    .first();
  if (!heading.length) return [];

  const headingText = heading.text().trim();
  const dateStr = headingText.replace(/^.*for\s+/i, "").trim();
  const parsedDate = new Date(dateStr);
  const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const bullets = heading
    .next("ul")
    .find("li")
    .map((_, li) => $(li).text().trim())
    .get()
    .filter(Boolean);
  if (bullets.length === 0) return [];

  const fullText = bullets.join("\n\n");
  const dateKey = publishedAt.toISOString().slice(0, 10);

  return [
    {
      title: `Drewry World Container Index – oppdatering for ${dateStr}`,
      articleUrl: `${url}#wci-${dateKey}`,
      publishedAt,
      rssText: fullText,
      fullText,
    },
  ];
}

// --- Xeneta weekly market updates -----------------------------------------
// The /news listing is a real (non-JS-rendered) page with a data-sort
// timestamp (ms) on every entry — reliable ordering without needing to
// parse inconsistent date formats out of the URL slugs. Each item has its
// own real permalink, so no synthetic key needed; generic extraction
// handles the article body fine (verified: HubSpot blog, clean markup).

async function fetchXeneta(): Promise<FeedItem[]> {
  const html = await fetchHtml("https://www.xeneta.com/news");
  const $ = cheerio.load(html);
  const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000; // skip the historical archive
  const items: FeedItem[] = [];

  $(".resources-item.news").each((_, el) => {
    const $el = $(el);
    const ts = parseInt($el.attr("data-sort") ?? "", 10);
    if (Number.isNaN(ts) || ts < cutoff) return;

    const href = $el.find("a").first().attr("href");
    const title = $el.find("h3").first().text().trim();
    if (!href || !title) return;

    items.push({
      title,
      articleUrl: href,
      publishedAt: new Date(ts),
      rssText: "",
    });
  });

  return items;
}

// --- ISM Manufacturing/Services PMI (via PR Newswire) ----------------------
// ismworld.org's own report pages require a subscriber login. PR Newswire
// mirrors ISM's full press releases (incl. the Chair's complete quote) with
// no paywall. Filter the newsroom listing to just the two headline PMI
// reports — it also carries unrelated ISM announcements.

async function fetchIsmPmi(): Promise<FeedItem[]> {
  const html = await fetchHtml("https://www.prnewswire.com/news/institute-for-supply-management/");
  const $ = cheerio.load(html);
  const items: FeedItem[] = [];

  $("a.newsreleaseconsolidatelink").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (!href || !/manufacturing-pmi|services-pmi/i.test(href)) return;

    const h3 = $el.find("h3").first();
    const dateText = h3.find("small").first().text().trim(); // "Sep 01, 2026, 10:00 ET"
    const title = h3.clone().children("small").remove().end().text().trim();
    if (!title) return;

    const datePart = dateText.split(",").slice(0, 2).join(",").trim(); // "Sep 01, 2026"
    const parsedDate = new Date(datePart);

    items.push({
      title,
      articleUrl: href.startsWith("http") ? href : `https://www.prnewswire.com${href}`,
      publishedAt: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      rssText: "",
    });
  });

  return items;
}

export const scrapedSources: ScrapedSource[] = [
  {
    slug: "drewry-wci",
    name: "Drewry World Container Index",
    homepageUrl:
      "https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry",
    country: "INT",
    defaultCategory: "shipping",
    enabled: true,
    fetchItems: fetchDrewry,
  },
  {
    slug: "xeneta-news",
    name: "Xeneta",
    homepageUrl: "https://www.xeneta.com/news",
    country: "INT",
    defaultCategory: "shipping",
    enabled: true,
    fetchItems: fetchXeneta,
  },
  {
    slug: "ism-pmi",
    name: "ISM (Institute for Supply Management)",
    homepageUrl: "https://www.ismworld.org",
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: true,
    fetchItems: fetchIsmPmi,
  },
];
