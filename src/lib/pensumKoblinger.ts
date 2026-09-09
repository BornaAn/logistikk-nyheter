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

import { prisma } from "./prisma";

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

const CACHE_ROW_ID = "singleton";

function isValidFeed(data: unknown): data is PensumFeed {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as PensumFeed).koblinger)
  );
}

/** Reads the last successfully fetched feed back out of the DB — the
 * explicit, durable fallback for when the live fetch fails. */
async function readCachedFeed(): Promise<PensumFeed | null> {
  try {
    const row = await prisma.pensumFeedCache.findUnique({ where: { id: CACHE_ROW_ID } });
    if (!row) return null;
    return isValidFeed(row.data) ? row.data : null;
  } catch {
    return null;
  }
}

/** Persists a freshly-fetched, validated feed as the new fallback. Never
 * throws — a cache-write failure shouldn't turn a successful fetch into an
 * error response. */
async function cacheFeed(feed: PensumFeed): Promise<void> {
  try {
    await prisma.pensumFeedCache.upsert({
      where: { id: CACHE_ROW_ID },
      create: { id: CACHE_ROW_ID, data: feed as object },
      update: { data: feed as object, fetchedAt: new Date() },
    });
  } catch {
    // Best-effort — the current request still got real data either way.
  }
}

/**
 * Returns a lookup from sak_id (== our Article.id) to its pensum-koblinger,
 * or null if the feed isn't configured and there's no cached fallback
 * either — callers should treat null exactly like "no koblinger
 * available", not an error.
 *
 * Tries a live fetch first (Next's fetch cache also avoids re-hitting the
 * source within the hour on top of this). If that fails for any reason —
 * network error, bad status, malformed JSON — falls back to the last
 * successfully fetched version stored in the database, explicitly and
 * verifiably, rather than depending on framework-level cache internals.
 * "Litt gamle koblinger er bedre enn ingen."
 */
export async function getPensumKoblinger(): Promise<Map<string, PensumKobling> | null> {
  const url = process.env.PENSUM_KOBLINGER_URL;
  if (!url) return null;

  let feed: PensumFeed | null = null;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data: unknown = await res.json();
      if (isValidFeed(data)) {
        feed = data;
        await cacheFeed(data);
      }
    }
  } catch {
    // Network error, timeout, etc. — fall through to the cached version.
  }

  if (!feed) {
    feed = await readCachedFeed();
  }

  if (!feed) return null;
  return new Map(feed.koblinger.map((k) => [k.sak_id, k]));
}
