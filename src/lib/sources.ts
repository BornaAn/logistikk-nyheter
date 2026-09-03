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
  /**
   * True for a general-interest source (a full front-page feed, not a
   * dedicated trade/business publication) — every item is checked against
   * `KEYWORD_FILTER` before ingestion, and anything that doesn't match
   * (sports, culture, crime, weather, etc.) is skipped. Without this,
   * "broader regional coverage" quietly turns into concert listings.
   */
  keywordFilter?: boolean;
  /** Set to false to keep a source defined but skip it during ingestion. */
  enabled: boolean;
}

/**
 * Norwegian + English terms marking an item as plausibly logistics/
 * transport/trade/economy-relevant. Matched case-insensitively against
 * title + RSS teaser for any source with `keywordFilter: true`.
 */
export const KEYWORD_FILTER = new RegExp(
  [
    "transport", "logistikk", "logistics", "frakt", "freight", "spedis",
    "forward(ing|er)", "havn\\w*", "port\\b", "skip\\w*", "shipping",
    "sjøfart", "maritim", "maritime", "rederi", "vogntog", "lastebil",
    "trucking", "gods\\w*", "cargo", "vareeksport", "vareimport", "eksport",
    "import\\b", "export\\b", "toll\\b", "tariff", "handel\\w*", "trade\\b",
    "forsyningskjede", "supply.?chain", "næringsliv", "økonomi\\w*",
    "economy", "economic", "samferdsel", "lager\\w*", "warehous",
    "distribusjon", "logistikk\\w*", "jernbane", "railway", "rail\\b",
    "luftfrakt", "container\\w*", "flåte\\w*", "fleet\\b", "bunkers?",
    "drivstoff\\w*", "diesel", "fuel\\b", "kanal\\b", "canal\\b",
    "verft\\b", "shipyard",
  ].join("|"),
  "i",
);

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

  // --- Lagt til etter kildeliste fra faglærer (2026-09-03) ---
  {
    slug: "maritimebergen",
    name: "Maritime Bergen",
    homepageUrl: "https://www.maritimebergen.no",
    feedUrl: "https://www.maritimebergen.no/feed/",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "nlf",
    name: "Norges Lastebileier-Forbund (NLF)",
    homepageUrl: "https://www.lastebil.no",
    feedUrl: "https://www.lastebil.no/rss",
    country: "NO",
    defaultCategory: "trucking",
    enabled: true,
  },
  {
    slug: "vegvesen",
    name: "Statens vegvesen",
    homepageUrl: "https://www.vegvesen.no",
    feedUrl: "https://www.vegvesen.no/rss",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "kystverket",
    name: "Kystverket",
    homepageUrl: "https://www.kystverket.no",
    // Kystverket har ingen egen RSS — dette er deres offisielle pressemeldinger
    // via NTB Kommunikasjon, filtrert på deres publisher-ID.
    feedUrl: "https://kommunikasjon.ntb.no/rss/releases/latest?publisherId=2088704",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "sdir",
    name: "Sjøfartsdirektoratet",
    homepageUrl: "https://www.sdir.no",
    // Samme NTB Kommunikasjon-mønster som Kystverket, egen publisher-ID.
    feedUrl: "https://kommunikasjon.ntb.no/rss/releases/latest?publisherId=17849089",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "wto",
    name: "World Trade Organization (WTO)",
    homepageUrl: "https://www.wto.org",
    // Eldre URL som ikke lenger lenkes fra nettsiden, men fortsatt aktiv og
    // med fyldig innhold direkte i feeden.
    feedUrl: "https://www.wto.org/library/rss/latest_news_e.xml",
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: true,
  },
  {
    slug: "ssb-utenriksokonomi",
    name: "SSB (Utenriksøkonomi)",
    homepageUrl: "https://www.ssb.no/utenriksokonomi",
    // SSBs emne-RSS-er er ujevne — mange forsøkte emneslugger (utenrikshandel,
    // godstransport, sjofart, containertrafikk m.fl.) ga en gyldig, men tom
    // feed. "utenriksokonomi" er den som faktisk har innhold: reelle
    // statistikkslipp om handelsbalanse, import/eksport og lakseeksportpriser.
    feedUrl: "https://www.ssb.no/rss/utenriksokonomi",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "freightos",
    name: "Freightos",
    homepageUrl: "https://www.freightos.com",
    // Ekte WordPress-RSS, funnet under research på markedsindekser — inkl.
    // deres ukentlige "Freightos Weekly Update" med fraktratekommentar.
    feedUrl: "https://www.freightos.com/feed/",
    country: "INT",
    defaultCategory: "shipping",
    enabled: true,
  },
  {
    slug: "dn",
    name: "Dagens Næringsliv (DN)",
    homepageUrl: "https://www.dn.no",
    // Norges hovedavis for næringsliv/økonomi — hele avisen er allerede
    // næringslivsstoff, så ingen nøkkelordfiltrering nødvendig (i motsetning
    // til BA/BT som er vanlige aviser med alt fra sport til konserter).
    feedUrl: "https://services.dn.no/api/feed/rss/",
    country: "NO",
    defaultCategory: "norge",
    paywalled: true,
    enabled: true,
  },
  {
    slug: "aftenposten-okonomi",
    name: "Aftenposten (Økonomi)",
    homepageUrl: "https://www.aftenposten.no/okonomi",
    // Bekreftet reelt avgrenset til økonomi-seksjonen (i motsetning til BTs
    // tilsvarende feed) — kanaltittelen er rett og slett "Økonomi".
    feedUrl: "https://www.aftenposten.no/rss/okonomi",
    country: "NO",
    defaultCategory: "norge",
    paywalled: true,
    enabled: true,
  },
  {
    slug: "avinor",
    name: "Avinor",
    homepageUrl: "https://avinor.no",
    // Ingen egen RSS på avinor.no — pressemeldinger via NTB Kommunikasjon,
    // samme mønster som Kystverket/Sjøfartsdirektoratet.
    feedUrl: "https://kommunikasjon.ntb.no/rss/releases/latest?publisherId=17421123",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "innovasjon-norge",
    name: "Innovasjon Norge",
    homepageUrl: "https://www.innovasjonnorge.no",
    // Samme NTB Kommunikasjon-mønster. Ikke transport-/logistikkspesifikk,
    // men eksport-/handelsrelevant nok til å inkluderes direkte.
    feedUrl: "https://kommunikasjon.ntb.no/rss/releases/latest?publisherId=89989",
    country: "NO",
    defaultCategory: "norge",
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
    // Ikke autodiscoverable/på vanlige stier — funnet innebygd i
    // forsidens JSON-navigasjonsdata, på et eget services.-subdomene.
    feedUrl: "https://services.tradewindsnews.com/api/feed/rss",
    country: "INT",
    defaultCategory: "shipping",
    paywalled: true, // kun tittel + kort ingress i feeden
    enabled: true,
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
    // Kjører Labrador CMS (norsk mediepublisering) — feeden krever
    // ?lab_viewport=rss, usynlig for vanlige /rss-stier.
    feedUrl: "https://www.logistikkinside.no/?lab_viewport=rss",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
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
    // Samme publikasjon som "Moderne Transport" i faglærers kildeliste —
    // omdøpt til "Tidsskriftet Logistikk". Samme Labrador CMS-plattform og
    // ?lab_viewport=rss-triks som Logistikk Inside.
    homepageUrl: "https://www.mtlogistikk.no",
    feedUrl: "https://www.mtlogistikk.no/?lab_viewport=rss",
    country: "NO",
    defaultCategory: "norge",
    enabled: true,
  },
  {
    slug: "bergenhavn",
    name: "Bergen og Omland havnevesen",
    homepageUrl: "https://www.bergenhavn.no",
    feedUrl: null, // Nuxt-app uten RSS-autodiscovery, ingen vanlig feed-sti virker
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },
  {
    slug: "vestlandfylke",
    name: "Vestland fylkeskommune",
    homepageUrl: "https://www.vestlandfylke.no",
    feedUrl: null, // ingen RSS-autodiscovery, gjettede feed-stier gir feilside
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },
  {
    slug: "gceocean",
    name: "GCE Ocean Technology",
    homepageUrl: "https://www.gceocean.no",
    feedUrl: null, // ingen RSS-autodiscovery, vanlige mønstre gir 404
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },
  {
    slug: "unctad",
    name: "UNCTAD",
    homepageUrl: "https://unctad.org",
    // Uavklart, ikke bekreftet fraværende: nettsiden er beskyttet av en
    // interaktiv Cloudflare-sjekk ("er du et menneske?") som blokkerer
    // automatisk henting. Verifiser manuelt i nettleser senere.
    feedUrl: null,
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },
  {
    slug: "oecd",
    name: "OECD",
    homepageUrl: "https://www.oecd.org",
    feedUrl: null, // hadde RSS tidligere (/newsroom/index.xml), men den redirecter nå til HTML — ser ut til å være fjernet ved siste redesign
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },
  {
    slug: "oslohavn",
    name: "Oslo Havn",
    homepageUrl: "https://www.oslohavn.no",
    feedUrl: null, // Episerver/Optimizely uten RSS-modul, ingen vanlig feed-sti virker
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },
  {
    slug: "oslo-bymiljoetaten",
    name: "Oslo kommune / Bymiljøetaten",
    homepageUrl: "https://www.oslo.kommune.no",
    // Det gamle nyhetsrom.bymiljoetaten.no (WordPress) er nå NXDOMAIN —
    // nedlagt/flyttet inn i oslo.kommune.no, som ikke har RSS.
    feedUrl: null,
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },
  {
    slug: "rederi",
    name: "Norges Rederiforbund",
    homepageUrl: "https://rederi.no",
    feedUrl: null, // ingen RSS-autodiscovery, vanlige mønstre gir 404
    country: "NO",
    defaultCategory: "shipping",
    enabled: false,
  },
  {
    slug: "e24",
    name: "E24",
    homepageUrl: "https://e24.no",
    // Har en fungerende feed (e24.no/rss), men feedens egen <description>
    // forbyr uttrykkelig bruk til LLM-trening/tekst- og datautvinning uten
    // skriftlig tillatelse fra E24. Respekterer det og lar kilden stå
    // avslått — spør E24 om tillatelse hvis dette er ønskelig.
    feedUrl: null,
    country: "NO",
    defaultCategory: "norge",
    enabled: false,
  },

  // --- Markedsindekser og statistikk: vurdert, men ikke bygget scraper for ---
  {
    slug: "kiel-trade-indicator",
    name: "Kiel Trade Indicator",
    homepageUrl: "https://www.kielinstitut.de/research/topics/international-trade/kiel-trade-indicator/",
    // Ekte og offentlig når den publiseres, men uklar nåværende kadence —
    // fant ingen Trade Indicator-spesifikk sak i de siste ~3 månedene med
    // nyhetsoppføringer på instituttets side. Bygg scraper når/hvis
    // publiseringsmønsteret er bekreftet stabilt.
    feedUrl: null,
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },
  {
    slug: "gscpi",
    name: "Global Supply Chain Pressure Index (NY Fed)",
    homepageUrl: "https://www.newyorkfed.org/research/policy/gscpi",
    // Offentlig og oppdateres månedlig, men innholdet er en kort
    // databeskrivelse (2 setninger), ikke en artikkel — lavere prioritet.
    feedUrl: null,
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },
  {
    slug: "baltic-dry",
    name: "Baltic Dry Index",
    homepageUrl: "https://tradingeconomics.com/commodity/baltic",
    // Selve Baltic Exchange-indeksen er bak betalingsmur. Trading Economics
    // har korte, generiske "news stream"-notiser om daglige bevegelser,
    // men uten permalink per notis — lavere prioritet.
    feedUrl: null,
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },
  {
    slug: "sp-global-pmi",
    name: "S&P Global PMI",
    homepageUrl: "https://www.pmi.spglobal.com",
    // Nedprioritert: URL-ene er ugjennomsiktige GUID-er uten offentlig
    // oversiktsside, innholdet leveres som PDF, og direkte HTTP-henting
    // (ikke nettleser) ga 403 — konsistent med bot-beskyttelse.
    feedUrl: null,
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    enabled: false,
  },

  // --- Generelle nyhetskilder (bredere, men nøkkelordfiltrert — se README) ---
  {
    slug: "ba",
    name: "Bergensavisen",
    homepageUrl: "https://www.ba.no",
    // Kun forsiden, ingen egen næringsliv-/samferdselsseksjon — filtreres
    // derfor mot KEYWORD_FILTER før noe lagres, ellers hadde alt fra
    // konsertdatoer til sport kommet med.
    feedUrl: "https://www.ba.no/service/rss",
    country: "NO",
    defaultCategory: "norge",
    keywordFilter: true,
    enabled: true,
  },
  {
    slug: "bt-okonomi",
    name: "Bergens Tidende (Økonomi)",
    homepageUrl: "https://www.bt.no",
    // "Økonomi"-scoped, men fortsatt bred nok (boligpriser m.m.) til å
    // trenge nøkkelordfiltrering på toppen.
    feedUrl: "https://www.bt.no/rss?kat=nyheter/okonomi",
    country: "NO",
    defaultCategory: "norge",
    keywordFilter: true,
    enabled: true,
  },
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
    // Hovedsiden er Cloudflare-blokkert, men et eget feeds.-subdomene
    // (ikke lenket/annonsert noe sted) serverer fungerende feeds — brukte
    // "industries" som nærmest handel/logistikk av variantene som fantes.
    feedUrl: "https://feeds.bloomberg.com/industries/news.rss",
    country: "INT",
    defaultCategory: "globalt_geopolitikk",
    keywordFilter: true,
    enabled: true,
  },
];

export function enabledSources(): Source[] {
  return sources.filter((s) => s.enabled && s.feedUrl);
}
