export interface Sector {
  slug: string;
  name: string;
  /** Shown to Claude alongside the name so it can judge genuine relevance
   * — kept short and concrete, not a marketing description. */
  description: string;
}

// Curated from a keyword pass over two weeks of real articles (see the
// 2026-09-10 session): these six are the ones with enough daily volume to
// support their own filtered view. Sectors with too little real coverage
// (e.g. farmasi/helse, ~1/day) were deliberately left out rather than
// shipped as a near-empty page.
export const sectors: Sector[] = [
  {
    slug: "sjomat",
    name: "Sjømat og fiskeri",
    description: "Fangst, oppdrett, eksport og transport av fisk og sjømatprodukter.",
  },
  {
    slug: "olje_gass",
    name: "Olje og gass",
    description: "Utvinning, raffinering, tankfrakt og energihandel.",
  },
  {
    slug: "dagligvare_handel",
    name: "Dagligvare og handel",
    description: "Varehandel, netthandel og detaljhandelens forsyningskjeder.",
  },
  {
    slug: "bygg_anlegg",
    name: "Bygg og anlegg",
    description: "Byggevarer, entreprenørvirksomhet og anleggslogistikk.",
  },
  {
    slug: "bilindustri",
    name: "Bilindustri",
    description: "Kjøretøyprodusenter, bildeler og elbil-forsyningskjeder.",
  },
  {
    slug: "landbruk",
    name: "Landbruk",
    description: "Jordbruk, gårdsdrift, mat- og fôrproduksjon.",
  },
];

export const SECTOR_SLUGS = sectors.map((s) => s.slug);

export function findSector(slug: string): Sector | undefined {
  return sectors.find((s) => s.slug === slug);
}
