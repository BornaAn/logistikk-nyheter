"use client";

import { useEffect, useState } from "react";
import { getDailyChallenge, todaysDateKey, type QuizQuestion } from "@/lib/quiz";

interface SavedResult {
  correctCount: number;
  total: number;
  answers: number[];
}

function storageKey(dateKey: string): string {
  return `truckgame-${dateKey}`;
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
        style={{ left: `calc(${progress}% - 14px)` }}
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

export function TruckGame() {
  const [dateKey] = useState(todaysDateKey);
  const [questions] = useState<QuizQuestion[]>(() => getDailyChallenge(new Date(), 5));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Reads previously-saved external state (localStorage) on mount, the
    // same justified pattern ThemeToggle uses for the DOM theme class.
    let result: SavedResult | null = null;
    try {
      const raw = localStorage.getItem(storageKey(dateKey));
      if (raw) result = JSON.parse(raw);
    } catch {
      // Private-mode/blocked storage — just play without persistence.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedResult(result);
    setHydrated(true);
  }, [dateKey]);

  if (!hydrated) return null;

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
          Du svarte riktig på {correctCount} av {total} flaskehalser i dag.
        </p>
        <div className="flex justify-center gap-1.5 mb-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className="text-lg" aria-hidden>
              {i < correctCount ? "🟢" : "⚪"}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">Kom tilbake i morgen for en ny rute.</p>
      </div>
    );
  }

  const question = questions[current];

  function selectOption(index: number) {
    if (selected !== null) return;
    setSelected(index);
  }

  function next() {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);

    if (current + 1 >= questions.length) {
      const result: SavedResult = {
        correctCount: nextAnswers.filter((a, i) => a === questions[i].correctIndex).length,
        total: questions.length,
        answers: nextAnswers,
      };
      try {
        localStorage.setItem(storageKey(dateKey), JSON.stringify(result));
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
      <p className="text-xs text-muted mb-4">
        Svar riktig for å komme forbi flaskehalsen og videre mot B.
      </p>

      <TruckRoad total={questions.length} current={current} />

      <p className="text-sm text-muted mb-1.5">Hva betyr dette begrepet?</p>
      <h3 className="font-serif text-xl font-bold mb-4">{question.prompt}</h3>

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
