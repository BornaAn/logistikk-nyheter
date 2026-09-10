import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { concepts as allConcepts } from "@/lib/concepts";
import { getCoursePensumConcepts, currentIsoWeek, type CourseSlug } from "@/lib/semesterPensum";
import { getDailyChallenge, todaysDateKey } from "@/lib/quiz";
import { generateDailyQuiz } from "@/lib/dailyQuiz";

const MODES = ["generell", "oal121", "oal118"] as const;
type Mode = (typeof MODES)[number];

function poolForMode(mode: Mode) {
  if (mode === "generell") return allConcepts;
  return getCoursePensumConcepts(mode as CourseSlug, currentIsoWeek());
}

// Serves "Dagens spill"'s questions, generated fresh by Claude once per
// day per mode and cached in DailyQuiz — every visitor who opens the same
// mode on the same day gets the identical five questions, but they're
// freshly written each day rather than picked from a small fixed set of
// pre-written texts. Falls back to the old fully-static generator in
// quiz.ts (still varies day to day, just less creatively) if the Claude
// call or the DB is unavailable, so the game never fully breaks.
export async function GET(request: NextRequest, { params }: { params: Promise<{ mode: string }> }) {
  const { mode: rawMode } = await params;
  if (!MODES.includes(rawMode as Mode)) {
    return NextResponse.json({ error: "Ukjent variant" }, { status: 404 });
  }
  const mode = rawMode as Mode;
  const pool = poolForMode(mode);
  const key = `${todaysDateKey()}-${mode}`;

  try {
    const cached = await prisma.dailyQuiz.findUnique({ where: { key } });
    if (cached) {
      return NextResponse.json({ questions: cached.data });
    }
  } catch (err) {
    console.error("Klarte ikke å lese quiz-cache", err);
    // Fall through to a fresh (uncached) generation attempt below.
  }

  try {
    const questions = await generateDailyQuiz(pool);
    try {
      await prisma.dailyQuiz.create({ data: { key, data: questions as object } });
    } catch (err) {
      // A duplicate key here just means a concurrent request won the race
      // to cache first — not an error, the game still works either way.
      console.error("Klarte ikke å cache quiz-runden", err);
    }
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Quiz-generering feilet, faller tilbake til statisk quiz", err);
    const fallback = getDailyChallenge(todaysDateKey(), 5, pool, mode);
    return NextResponse.json({ questions: fallback, fallback: true });
  }
}
