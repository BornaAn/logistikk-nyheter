"use client";

import { useEffect, useMemo, useState } from "react";
import { getDailyChallenge, todaysDateKey, type QuizQuestion } from "@/lib/quiz";
import { concepts as allConcepts, type Concept } from "@/lib/concepts";
import {
  getCoursePensumConcepts,
  currentIsoWeek,
  currentIsoWeekKey,
  type CourseSlug,
} from "@/lib/semesterPensum";

type Mode = "generell" | CourseSlug;

interface ModeInfo {
  mode: Mode;
  title: string;
  description: string;
}

const WEEK = currentIsoWeek();

const MODES: ModeInfo[] = [
  {
    mode: "generell",
    title: "Generell",
    description: "Blander begreper fra hele ordlisten — begge fag, alle uker. Nye spørsmål hver dag.",
  },
  {
    mode: "oal121",
    title: "Kun ØAL121",
    description: `Bare begreper fra ØAL121-pensum til og med uke ${WEEK}. Samme fem spørsmål hele uken, så du kan øve deg.`,
  },
  {
    mode: "oal118",
    title: "Kun ØAL118",
    description: `Bare begreper fra ØAL118-pensum til og med uke ${WEEK}. Samme fem spørsmål hele uken, så du kan øve deg.`,
  },
];

interface SavedResult {
  correctCount: number;
  total: number;
  answers: number[];
}

function storageKey(dateKey: string, mode: Mode): string {
  return `truckgame-${dateKey}-${mode}`;
}

function TruckRoad({ total, current }: { total: number; current: number }) {
  const progress = total === 0 ? 0 : (current / total) * 100;
  return (
    <div className="relative mb-8 mt-2">
      <div className="h-2 rounded-full bg-card-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to right, var(--accent), var(--gold))",
          }}
        />
      </div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0">
        {Array.from({ length: total + 1 }, (_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 -mt-1 transition-colors ${
              i <= current
                ? "border-accent bg-accent"
                : "border-card-border bg-background"
            }`}
            style={{ marginLeft: i === 0 ? 0 : undefined }}
            aria-hidden
          />
        ))}
      </div>
      <div
        className="absolute -top-6 text-2xl transition-all duration-500 ease-out"
        style={{ left: `calc(${progress}% - 14px)`, transform: "scaleX(-1)" }}
        aria-hidden
      >
        🚚
      </div>
      <div className="flex justify-between mt-3 text-xs text-muted">
        <span>A</span>
        <span>B</span>
      </div>
    </div>
  );
}

/** Chosen course pools are computed once per module load (not per render) —
 * cheap regex work over 46 concepts, but no reason to redo it per mode
 * switch. `generell` needs no pool at all, it uses the full glossary. */
const COURSE_POOLS: Record<CourseSlug, Concept[]> = {
  oal121: getCoursePensumConcepts("oal121", WEEK),
  oal118: getCoursePensumConcepts("oal118", WEEK),
};

function poolForMode(mode: Mode): Concept[] {
  return mode === "generell" ? allConcepts : COURSE_POOLS[mode];
}

function ModeSelector({ onSelect }: { onSelect: (mode: Mode) => void }) {
  return (
    <div className="rounded-lg border border-card-border bg-card card-shadow p-5 sm:p-6">
      <h2 className="font-serif text-lg font-bold mb-1">Velg dagens rute</h2>
      <p className="text-xs text-muted mb-4">
        Samme rute for alle som velger samme variant samtidig — se beskrivelsen under hver for
        hvor ofte den fornyes.
      </p>
      <div className="flex flex-col gap-2.5">
        {MODES.map((m) => {
          const thin = m.mode !== "generell" && poolForMode(m.mode).length < 5;
          return (
            <button
              key={m.mode}
              type="button"
              onClick={() => onSelect(m.mode)}
              className="text-left rounded-md border border-card-border px-4 py-3 transition-colors hover:border-accent hover:bg-accent/5 cursor-pointer"
            >
              <p className="font-serif font-bold text-foreground">{m.title}</p>
              <p className="text-xs text-muted mt-0.5">{m.description}</p>
              {thin && (
                <p className="text-[0.7rem] text-amber-700 dark:text-amber-400 mt-1">
                  Tidlig i semesteret — færre spørsmål enn vanlig ({poolForMode(m.mode).length}{" "}
                  tilgjengelige begreper).
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TruckGame() {
  const [dateKey] = useState(todaysDateKey);
  const [mode, setMode] = useState<Mode | null>(null);
  const questions = useMemo<QuizQuestion[]>(() => {
    if (!mode) return [];
    const pool = poolForMode(mode);
    // Generell reseeds daily (fresh trivia); the course modes reseed weekly
    // (currentIsoWeekKey) so a student gets the same five questions all
    // week to actually practice, not a new random five every day.
    const seedKey = mode === "generell" ? todaysDateKey() : currentIsoWeekKey();
    return getDailyChallenge(seedKey, 5, pool, mode);
  }, [mode]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!mode) return;
    // Reads previously-saved external state (localStorage) on mount, the
    // same justified pattern ThemeToggle uses for the DOM theme class.
    let result: SavedResult | null = null;
    try {
      const raw = localStorage.getItem(storageKey(dateKey, mode));
      if (raw) result = JSON.parse(raw);
    } catch {
      // Private-mode/blocked storage — just play without persistence.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedResult(result);
    setHydrated(true);
  }, [dateKey, mode]);

  if (!mode) return <ModeSelector onSelect={setMode} />;
  if (!hydrated) return null;

  const modeTitle = MODES.find((m) => m.mode === mode)?.title ?? "Generell";

  function changeMode() {
    setMode(null);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setSavedResult(null);
    setHydrated(false);
  }

  const finished = savedResult !== null || current >= questions.length;
  const correctCount =
    savedResult?.correctCount ??
    answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  if (finished) {
    const total = savedResult?.total ?? questions.length;
    const allCorrect = correctCount === total;
    return (
      <div className="rounded-lg border border-card-border bg-card card-shadow p-6 text-center">
        <div className="text-4xl mb-3" aria-hidden>
          {allCorrect ? "🏁" : "🚚"}
        </div>
        <h2 className="font-serif text-xl font-bold mb-1">
          {allCorrect ? "Lastebilen kom helt frem til B!" : "Lastebilen kom frem til B"}
        </h2>
        <p className="text-sm text-muted mb-4">
          Du svarte riktig på {correctCount} av {total} flaskehalser i dag — variant «{modeTitle}».
        </p>
        <div className="flex justify-center gap-1.5 mb-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className="text-lg" aria-hidden>
              {i < correctCount ? "🟢" : "⚪"}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted mt-4 mb-3">Kom tilbake i morgen for en ny rute.</p>
        <button
          type="button"
          onClick={changeMode}
          className="text-xs font-semibold text-accent hover:underline underline-offset-2 cursor-pointer"
        >
          Prøv en annen variant →
        </button>
      </div>
    );
  }

  const question = questions[current];

  function selectOption(index: number) {
    if (selected !== null) return;
    setSelected(index);
  }

  function next() {
    if (selected === null || !mode) return;
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);

    if (current + 1 >= questions.length) {
      const result: SavedResult = {
        correctCount: nextAnswers.filter((a, i) => a === questions[i].correctIndex).length,
        total: questions.length,
        answers: nextAnswers,
      };
      try {
        localStorage.setItem(storageKey(dateKey, mode), JSON.stringify(result));
      } catch {
        // Ignore — the round still finishes, it just won't be remembered.
      }
      setSavedResult(result);
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  }

  const isCorrect = selected === question.correctIndex;

  return (
    <div className="rounded-lg border border-card-border bg-card card-shadow p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif text-lg font-bold">Dagens lastebiltur</h2>
        <span className="text-xs text-muted">
          Flaskehals {current + 1} av {questions.length}
        </span>
      </div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">
          Svar riktig for å komme forbi flaskehalsen og videre mot B.
        </p>
        <span className="shrink-0 rounded-full border border-card-border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
          {modeTitle}
        </span>
      </div>

      <TruckRoad total={questions.length} current={current} />

      <div className="rounded-md border border-gold/40 bg-gold/10 px-3.5 py-2.5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold mb-0.5">
          Flaskehalsen
        </p>
        <p className="text-sm text-foreground/85 leading-snug">{question.scenario}</p>
      </div>

      {question.kind === "definition" ? (
        <>
          <p className="text-sm text-muted mb-1.5">Hva betyr dette begrepet?</p>
          <h3 className="font-serif text-xl font-bold mb-4">{question.prompt}</h3>
        </>
      ) : (
        <>
          <p className="text-sm text-muted mb-1.5">Hvilket begrep beskriver denne situasjonen?</p>
          <p className="font-serif text-lg font-semibold leading-snug mb-4">{question.prompt}</p>
        </>
      )}

      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => {
          const isSelected = selected === i;
          const revealCorrect = selected !== null && i === question.correctIndex;
          const revealWrong = isSelected && !isCorrect;
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectOption(i)}
              disabled={selected !== null}
              className={`text-left rounded-md border px-3.5 py-2.5 text-sm transition-colors ${
                revealCorrect
                  ? "border-green-600 bg-green-600/10 text-green-800 dark:text-green-400"
                  : revealWrong
                    ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                    : selected !== null
                      ? "border-card-border text-foreground/50"
                      : "border-card-border hover:border-accent hover:bg-accent/5 cursor-pointer"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-4 flex items-center justify-between">
          <p className={`text-sm font-medium ${isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {isCorrect ? "Riktig! Lastebilen kjører videre." : "Ikke helt — men lastebilen fortsetter likevel."}
          </p>
          <button
            type="button"
            onClick={next}
            className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95 cursor-pointer"
          >
            {current + 1 >= questions.length ? "Se resultat" : "Neste flaskehals →"}
          </button>
        </div>
      )}
    </div>
  );
}
