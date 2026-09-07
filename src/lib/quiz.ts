import { concepts } from "./concepts";

export interface QuizQuestion {
  conceptSlug: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

const OPTION_MAX_LENGTH = 100;

/** Truncates at a word boundary instead of splitting on ". " — several
 * definitions use "f.eks." and similar abbreviations, which a naive
 * sentence-split would cut in the wrong place. */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : maxLength)}…`;
}

/** Deterministic PRNG seeded from a string (mulberry32) — same seed always
 * produces the same sequence, so "today's" quiz is identical for every
 * visitor without needing a database, and different every day. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** One question per concept: "what does X mean?" with the real definition
 * plus three decoy definitions drawn from other concepts. */
function buildQuestionPool(rand: () => number): QuizQuestion[] {
  return concepts.map((concept) => {
    const decoyPool = concepts.filter((c) => c.slug !== concept.slug);
    const decoys = seededShuffle(decoyPool, rand).slice(0, 3);
    const correctText = truncate(concept.definition, OPTION_MAX_LENGTH);
    const options = seededShuffle(
      [correctText, ...decoys.map((d) => truncate(d.definition, OPTION_MAX_LENGTH))],
      rand,
    );
    return {
      conceptSlug: concept.slug,
      prompt: concept.name,
      options,
      correctIndex: options.indexOf(correctText),
    };
  });
}

/** Today's route: `count` questions, same for every visitor on a given
 * calendar day (UTC date string as the seed), different each day. */
export function getDailyChallenge(date: Date, count = 5): QuizQuestion[] {
  const seed = date.toISOString().slice(0, 10);
  const rand = seededRandom(seed);
  const pool = buildQuestionPool(rand);
  return seededShuffle(pool, rand).slice(0, count);
}

export function todaysDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}
