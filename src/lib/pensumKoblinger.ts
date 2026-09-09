/**
 * Fetches and types the teacher's separately-built pensum-mapping feed
 * (her own tool, her own curriculum data — we just display it). Schema is
 * exactly what she specified over email; kept flat (temaer[] carries its
 * own emne/uke per entry, since the same tema can recur across her
 * courses) rather than nested, since that's simpler to filter here too.
 *
 * PENSUM_KOBLINGER_URL isn't set yet — she hasn't given us a real file/URL,
 * only the schema — so this currently always returns null and the UI that
 * depends on it just doesn't render. Nothing else needs to change once she
 * does: set the env var in Vercel and this starts returning real data.
 */

export interface PensumTema {
  tema_id: string;
  tema: string;
  emne: string;
  uke: number;
  kilde_pensum: string;
  styrke: "svak" | "moderat" | "sterk";
  begrunnelse: string;
}

export interface PensumFagligVurdering {
  fenomen: string;
  modell: string;
  tallfestbart: string;
  mangler: string;
}

export interface PensumKildekritikk {
  type: string;
  forbehold: string | null;
}

export interface PensumKobling {
  sak_id: string;
  tittel: string;
  url: string;
  temaer: PensumTema[];
  faglig_vurdering: PensumFagligVurdering;
  kildekritikk: PensumKildekritikk;
  opphav: string;
}

interface PensumFeed {
  skjema_versjon: number;
  generert: string;
  koblinger: PensumKobling[];
}

function isValidFeed(data: unknown): data is PensumFeed {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as PensumFeed).koblinger)
  );
}

/**
 * Returns a lookup from sak_id (== our Article.id) to its pensum-koblinger,
 * or null if the feed isn't configured or couldn't be fetched — callers
 * should treat null exactly like "no koblinger available", not an error.
 *
 * Cached for an hour (matches "endrer seg maks én gang i døgnet" — we're
 * conservative, not exact) via Next's fetch cache. A failed revalidation
 * keeps serving the last successful response automatically as long as this
 * runs inside Next's data cache, which covers her "fall back to the last
 * successful fetch" ask without extra plumbing.
 */
export async function getPensumKoblinger(): Promise<Map<string, PensumKobling> | null> {
  const url = process.env.PENSUM_KOBLINGER_URL;
  if (!url) return null;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!isValidFeed(data)) return null;

    return new Map(data.koblinger.map((k) => [k.sak_id, k]));
  } catch {
    // Network error, invalid JSON, etc. — degrade to "no koblinger" rather
    // than breaking the page.
    return null;
  }
}
