import { concepts, type Concept } from "./concepts";

/**
 * Week-by-week chapter coverage for both courses, transcribed from the
 * teacher's own semester plans (ØAL121_semesterplan_2026_2027_rev3.xlsx and
 * Høst_2026_Oversikt_undervisning_ØAL118_MAS227_rev9.xlsx). Both plans use
 * real ISO week numbers, so "which week are we in" is just today's ISO week
 * — no separate course calendar to maintain.
 *
 * ØAL121 has one compendium track. ØAL118 has two (hovedkompendium +
 * Obeya-kompendiet), taught in parallel each week with independent chapter
 * numbering — and Obeya chapters recur across weeks (the same chapter gets
 * revisited from a different angle), so "cumulative pensum" for Obeya is a
 * running union of chapters seen so far, not a simple "chapter <= N" range
 * like the other three tracks.
 */
const OAL121_WEEK_CHAPTERS: Record<number, number[]> = {
  34: [1, 2, 3, 4, 5],
  35: [6, 7, 8, 9, 10],
  36: [11, 12, 13, 14, 15],
  37: [16, 17, 18, 19, 20],
  38: [21, 22],
  39: [23, 24],
  40: [25, 26],
  41: [27, 28],
  42: [29, 30],
  43: [31, 32],
  44: [33],
  45: [34, 35, 36, 37, 38, 39, 40],
};

const OAL118_HOVED_WEEK_CHAPTERS: Record<number, number[]> = {
  35: [1, 2, 3, 4, 5],
  36: [6, 7, 8, 9, 10],
  37: [11, 12, 13, 14, 15],
  38: [16, 17, 18, 19, 20],
  39: [21, 22],
  40: [23],
  41: [24, 25],
  42: [26, 27],
  43: Array.from({ length: 27 }, (_, i) => i + 1), // OBEYA-SEMINAR: integrasjon av kap. 1-27
};

const OAL118_OBEYA_WEEK_CHAPTERS: Record<number, number[]> = {
  35: [1, 2, 5, 6, 7, 8, 11],
  36: [1, 3, 5, 8, 11, 14, 20],
  37: [4, 5, 6, 7, 12, 14],
  38: [9, 10, 12, 13, 15, 18],
  39: [3, 5, 6, 7, 11, 17, 19],
  40: [3, 5, 6, 8, 11, 17, 19, 20],
  41: [2, 5, 6, 7, 8, 11, 16],
  42: [6, 7, 14, 15, 16, 18, 20],
};

/** Union of every week's chapters up to and including `throughWeek` — a
 * running set, not a range, since Obeya chapters repeat non-sequentially. */
function cumulativeChapters(schedule: Record<number, number[]>, throughWeek: number): Set<number> {
  const set = new Set<number>();
  for (const [week, chapters] of Object.entries(schedule)) {
    if (Number(week) <= throughWeek) {
      for (const c of chapters) set.add(c);
    }
  }
  return set;
}

interface ParsedRef {
  course: "oal121" | "oal118";
  track: "hoved" | "obeya" | null;
  /** Set when kilde references the separate "Begreper og pensum" glossary
   * doc directly by week (e.g. "uke 38") rather than by chapter number —
   * that doc IS organized by week, so no chapter->week lookup is needed. */
  week: number | null;
  chapters: number[];
}

/** Parses the free-text `kilde` field (e.g. "ØAL121, kapittel 6 og 10",
 * "ØAL118, Obeya-kompendiet, kapittel 2", "ØAL118, Begreper og pensum uke
 * 38") into structured refs. A kilde can name two refs at once, separated
 * by " / " (e.g. rotårsaksanalyse is sourced from both courses) — the
 * second half doesn't always repeat the course name, so it inherits the
 * previous part's course when omitted. */
function parseKilde(kilde: string): ParsedRef[] {
  const parts = kilde.split(" / ");
  const refs: ParsedRef[] = [];
  let lastCourse: "oal121" | "oal118" | null = null;

  for (const part of parts) {
    const course: "oal121" | "oal118" | null = part.includes("ØAL121")
      ? "oal121"
      : part.includes("ØAL118")
        ? "oal118"
        : lastCourse;
    if (!course) continue;
    lastCourse = course;

    const track = /Obeya-kompendiet/i.test(part)
      ? "obeya"
      : /hovedkompendiet/i.test(part)
        ? "hoved"
        : course === "oal121"
          ? "hoved"
          : null;

    const ukeMatch = part.match(/uke\s+(\d+)/i);
    const kapMatch = part.match(/kapit(?:tel|ler)\s+([\d–\-\sog,]+)/i);
    let chapters: number[] = [];
    if (kapMatch) {
      chapters = kapMatch[1].split(/,|\bog\b/).flatMap((chunk) => {
        const trimmed = chunk.trim();
        const range = trimmed.match(/^(\d+)\s*[–-]\s*(\d+)$/);
        if (range) {
          const a = parseInt(range[1], 10);
          const b = parseInt(range[2], 10);
          return Array.from({ length: b - a + 1 }, (_, i) => a + i);
        }
        const n = parseInt(trimmed, 10);
        return Number.isNaN(n) ? [] : [n];
      });
    }

    refs.push({ course, track, week: ukeMatch ? parseInt(ukeMatch[1], 10) : null, chapters });
  }
  return refs;
}

export type CourseSlug = "oal121" | "oal118";

/** Every concept genuinely covered by `course`'s pensum up to and including
 * `throughWeek` (ISO week number) — "so far this semester", not just the
 * single current week, since a single week's slice is too thin (2-3
 * concepts) to build a real quiz from. */
export function getCoursePensumConcepts(course: CourseSlug, throughWeek: number): Concept[] {
  const hovedSet = cumulativeChapters(
    course === "oal121" ? OAL121_WEEK_CHAPTERS : OAL118_HOVED_WEEK_CHAPTERS,
    throughWeek,
  );
  const obeyaSet = course === "oal118" ? cumulativeChapters(OAL118_OBEYA_WEEK_CHAPTERS, throughWeek) : null;

  return concepts.filter((concept) => {
    const refs = parseKilde(concept.kilde);
    return refs.some((ref) => {
      if (ref.course !== course) return false;
      if (ref.week !== null) return ref.week <= throughWeek;
      if (ref.track === "obeya") return obeyaSet ? ref.chapters.some((c) => obeyaSet.has(c)) : false;
      return ref.chapters.some((c) => hovedSet.has(c));
    });
  });
}

export function currentIsoWeek(date: Date = new Date()): number {
  // Standard ISO-8601 week-number algorithm (Thursday-of-the-week trick).
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
