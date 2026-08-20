import type { Category } from "@prisma/client";

export type SourceCountry = "NO" | "INT";

export interface Source {
  /** Stable slug used for filtering/storage. */
  slug: string;
  /** Display name. */
  name: string;
  /** Source homepage. */
  homepageUrl: string;
  /**
   * RSS/Atom feed URL. `null` means we don't have a confirmed feed —
   * the source is defined here but disabled until one is found. See
   * README for the current list of sources still needing manual RSS
   * setup (e.g. via rss.app or RSSHub) or a custom scraper.
   */
  feedUrl: string | null;
  country: SourceCountry;
  defaultCategory: Category;
  /**
   * Known paywall/limited-access source, or a feed that only ever exposes
   * a short teaser (never the real article body). Articles from these are
   * always stored with accessLevel "limited", regardless of how much text
   * we manage to extract, since even a full extract is usually just the
   * free ingress.
   */
  paywalled?: boolean;
  /** Set to false to keep a source defined but skip it during ingestion. */
  enabled: boolean;
}

export const sources: Source[] = [
  // --- Bekreftet RSS (verifisert direkte mot feed-URL-en) ---
  {
    slug: "freightwaves",
    name: "FreightWaves",
    homepageUrl: "https://www.freightwaves.com",
    feedUrl: "https://www.freightwaves.com/feed",
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: true,
  },
  {
    slug: "joc",
    name: "Journal of Commerce (JOC)",
    homepageUrl: "https://www.joc.com",
    feedUrl: "https://www.joc.com/rssfeed",
    country: "INT",
    defaultCategory: "shipping",
    enabled: true,
  },
  {
    slug: "supplychaindive",
    name: "Supply Chain Dive",
    homepageUrl: "https://www.supplychaindive.com",
    feedUrl: "https://www.supplychaindive.com/feeds/news/",
    country: "INT",
    defaultCategory: "lager_forsyningskjede",
    enabled: true,
  },
  {
    slug: "transporttopics",
    name: "Transport Topics",
    homepageUrl: "https://www.ttnews.com",
    feedUrl: "https://www.ttnews.com/rss.xml/",
    country: "INT",
    defaultCategory: "trucking",
    enabled: true,
  },
  {
    slug: "supplychainbrain",
    name: "Supply Chain Brain",
    homepageUrl: "https://www.supplychainbrain.com",
    feedUrl: "https://www.supplychainbrain.com/rss/articles",
    country: "INT",
    defaultCategory: "lager_forsyningskjede",
    enabled: true,
  },
  {
    slug: "inboundlogistics",
    name: "Inbound Logistics",
    homepageUrl: "https://www.inboundlogistics.com",
    feedUrl: "https://www.inboundlogistics.com/feed/?post_type=articles",
    country: "INT",
    defaultCategory: "lager_forsyningskjede",
    enabled: true,
  },
  {
    slug: "theloadstar",
    name: "The Loadstar",
    homepageUrl: "https://theloadstar.com",
    feedUrl: "https://theloadstar.com/feed/",
    country: "INT",
    defaultCategory: "shipping",
    enabled: true,
  },
  {
    slug: "gcaptain",
    name: "gCaptain",
    homepageUrl: "https://gcaptain.com",
    feedUrl: "https://gcaptain.com/feed/",
    country: "INT",
    defaultCategory: "shipping",
    enabled: true,
  },
  {
    slug: "splash247",
    name: "Splash247",
    homepageUrl: "https://splash247.com",
    feedUrl: "https://splash247.com/feed/",
    country: "INT",
    defaultCategory: "shipping",
    enabled: true,
  },
  {
    slug: "tungt",
    name: "Tungt.no (Transportmagasinet)",
    homepageUrl: "https://www.tungt.no/logistikk",
    feedUrl: "https://www.tungt.no/xml/rss2/articles",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "nholt",
    name: "NHO Logistikk og Transport",
    homepageUrl: "https://www.nholt.no",
    feedUrl: "https://www.nholt.no/rss",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "transportlogistikk",
    name: "Transport & Logistikk",
    homepageUrl: "https://transportlogistikk.no",
    feedUrl: "https://www.transportlogistikk.no/feed/",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "logistikkforeningen",
    name: "Logistikkforeningen",
    homepageUrl: "https://www.logistikkforeningen.no",
    feedUrl: "https://logistikkforeningen.no/feed/",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "ft-transport",
    name: "Financial Times",
    homepageUrl: "https://www.ft.com/transport",
    feedUrl: "https://www.ft.com/transport?format=rss",
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    paywalled: true, // feed only exposes the paywalled teaser paragraph
    enabled: true,
  },

  // --- Ingen fungerende RSS funnet (se README for detaljer og forslag til løsning) ---
  {
    slug: "scdigest",
    name: "Supply Chain Digest",
    homepageUrl: "https://www.scdigest.com",
    feedUrl: null, // <link> annonserer /rssfeeds.xml, men den svarer 200 med 0 bytes — forlatt feed
    country: "INT",
    defaultCategory: "lager_forsyningskjede",
    enabled: false,
  },
  {
    slug: "supplychain247",
    name: "Supply Chain 24/7",
    homepageUrl: "https://www.supplychain247.com",
    feedUrl: null, // hele siden blokkert av Cloudflare-botsjekk
    country: "INT",
    defaultCategory: "lager_forsyningskjede",
    enabled: false,
  },
  {
    slug: "tradewinds",
    name: "TradeWinds",
    homepageUrl: "https://www.tradewindsnews.com",
    feedUrl: null, // betalingsmur, ingen RSS funnet
    country: "INT",
    defaultCategory: "shipping",
    paywalled: true,
    enabled: false,
  },
  {
    slug: "lloydslist",
    name: "Lloyd's List",
    homepageUrl: "https://lloydslist.com",
    feedUrl: null, // betalingsmur, ingen RSS funnet
    country: "INT",
    defaultCategory: "shipping",
    paywalled: true,
    enabled: false,
  },
  {
    slug: "logistikkinside",
    name: "Logistikk Inside",
    homepageUrl: "https://www.logistikkinside.no",
    feedUrl: null, // ingen RSS-referanse i HTML, vanlige mønstre gir 404
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },
  {
    slug: "logistikknyhetene",
    name: "Logistikknyhetene",
    homepageUrl: "https://www.logistikknyhetene.no",
    feedUrl: null, // domenet svarer ikke lenger (NXDOMAIN) — siden ser nedlagt ut
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },
  {
    slug: "mtlogistikk",
    name: "MTLogistikk",
    homepageUrl: "https://www.mtlogistikk.no",
    feedUrl: null, // ingen RSS-referanse i HTML, vanlige mønstre gir 404
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },

  // --- Generelle nyhetskilder (krever nøkkelordfiltrering, utenfor MVP) ---
  {
    slug: "reuters-business",
    name: "Reuters Business",
    homepageUrl: "https://www.reuters.com/business/",
    feedUrl: null, // Reuters la ned offentlig RSS for flere år siden
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },
  {
    slug: "bloomberg",
    name: "Bloomberg",
    homepageUrl: "https://www.bloomberg.com",
    feedUrl: null, // ingen offentlig RSS funnet
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },
];

export function enabledSources(): Source[] {
  return sources.filter((s) => s.enabled && s.feedUrl);
}
