"use client";

import { useState } from "react";
import type { DisruptionAnalysisResult } from "@/lib/disruptionAnalysis";

const PROFILE_STAGES: { key: string; label: string }[] = [
  { key: "forberedelse", label: "Forberedelse" },
  { key: "utløsende_hendelse", label: "Utløsende hendelse" },
  { key: "første_respons", label: "Første respons" },
  { key: "full_effekt", label: "Full effekt" },
  { key: "gjenoppretting", label: "Gjenoppretting" },
  { key: "langsiktig_effekt", label: "Langsiktig effekt" },
];

const KLASSIFISERING_LABELS: Record<string, string> = {
  naturhendelse: "Naturhendelse",
  geopolitikk: "Geopolitikk",
  arbeidskonflikt: "Arbeidskonflikt",
  cyber: "Cyber",
  regulatorisk: "Regulatorisk",
  finansiell: "Finansiell",
  etterspørselssjokk: "Etterspørselssjokk",
  annet: "Annet",
};

function PensumBadge({ utenforPensum }: { utenforPensum: boolean }) {
  return utenforPensum ? (
    <span className="inline-flex items-center rounded-full border border-amber-700/30 bg-amber-700/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400">
      Utenfor delt pensum
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
      Pensum-forankret (SCOR)
    </span>
  );
}

function Stepper({ activeKey }: { activeKey: string }) {
  const activeIndex = PROFILE_STAGES.findIndex((s) => s.key === activeKey);
  return (
    <div className="flex items-center gap-1">
      {PROFILE_STAGES.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
          <div
            title={s.label}
            className={`h-1.5 flex-1 rounded-full ${
              i === activeIndex
                ? "bg-red-600 dark:bg-red-400"
                : i < activeIndex
                  ? "bg-red-600/30 dark:bg-red-400/30"
                  : "bg-card-border"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

export function DisruptionAnalysisPanel({ articleId }: { articleId: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; data: DisruptionAnalysisResult }
  >({ status: "idle" });

  async function runAnalysis() {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/artikkel/${articleId}/forstyrrelse`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: json.error ?? "Noe gikk galt" });
        return;
      }
      setState({ status: "done", data: json.analyse as DisruptionAnalysisResult });
    } catch {
      setState({ status: "error", message: "Klarte ikke å nå analysetjenesten" });
    }
  }

  if (state.status === "idle" || state.status === "error") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-4 rounded-lg border border-dashed border-red-600/30 bg-red-600/[0.03] p-3.5 dark:border-red-400/30 dark:bg-red-400/[0.04]"
      >
        <button
          type="button"
          onClick={runAnalysis}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-600/40 bg-red-600/10 px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-600/20 dark:border-red-400/40 dark:text-red-400"
        >
          Analyser forstyrrelse
        </button>
        {state.status === "error" && (
          <p className="mt-2 text-xs text-red-700 dark:text-red-400">{state.message}</p>
        )}
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-4 rounded-lg border border-dashed border-red-600/30 bg-red-600/[0.03] p-3.5 dark:border-red-400/30 dark:bg-red-400/[0.04]"
      >
        <p className="text-xs text-muted animate-pulse">
          Analyserer konsekvenser for forsyningskjeden …
        </p>
      </div>
    );
  }

  const a = state.data;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-4 rounded-lg border-2 border-red-600/40 bg-red-600/[0.03] p-3.5 dark:border-red-400/40 dark:bg-red-400/[0.04]"
    >
      <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
        Konsekvensanalyse (TTR/TTS)
      </p>

      <div className="rounded-md border border-card-border bg-background/60 p-3 mb-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted mb-1">
          Illustrativt eksempel — ikke en ekte bedrift
        </p>
        <p className="text-xs leading-relaxed text-foreground/80">
          {a.illustrativtEksempel.kjedeBeskrivelse}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {a.illustrativtEksempel.noder.map((n, i) => (
            <span
              key={i}
              className="rounded-full bg-card-border/60 px-2 py-0.5 text-[0.65rem] text-foreground/70"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold text-foreground">Trinn 1 — Klassifiser og lokaliser</p>
            <PensumBadge utenforPensum={true} />
          </div>
          <p className="text-xs leading-relaxed text-foreground/80">
            <span className="font-semibold">{KLASSIFISERING_LABELS[a.trinn1.klassifisering] ?? a.trinn1.klassifisering}</span>
            {" — treffer "}
            {a.trinn1.nodeEllerLenke} ({a.trinn1.niva}). {a.trinn1.kritikalitetsbegrunnelse}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-bold text-foreground">Trinn 2 — Forstyrrelsesprofilen (Sheffi &amp; Rice)</p>
            <PensumBadge utenforPensum={true} />
          </div>
          <Stepper activeKey={a.trinn2.fase} />
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
            <span className="font-semibold">
              {PROFILE_STAGES.find((s) => s.key === a.trinn2.fase)?.label ?? a.trinn2.fase}
            </span>
            {" · "}
            {a.trinn2.varselEllerBekreftet === "bekreftet" ? "Bekreftet forstyrrelse" : "Varsel"}
            {" — "}
            {a.trinn2.begrunnelse}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-bold text-foreground">Trinn 3 — TTR mot TTS</p>
            <PensumBadge utenforPensum={true} />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-1.5">
            <div className="rounded-md border border-card-border bg-background/60 p-2 text-center">
              <p className="text-[0.95rem] font-mono font-semibold text-foreground">
                {a.trinn3.ttrLavDager}–{a.trinn3.ttrHoyDager}
              </p>
              <p className="text-[0.65rem] text-muted">TTR, dager (sannsynlig {a.trinn3.ttrSannsynligDager})</p>
            </div>
            <div className="rounded-md border border-card-border bg-background/60 p-2 text-center">
              <p className="text-[0.95rem] font-mono font-semibold text-foreground">{a.trinn3.ttsDager}</p>
              <p className="text-[0.65rem] text-muted">TTS, dager</p>
            </div>
            <div className="rounded-md border border-card-border bg-background/60 p-2 text-center">
              <p
                className={`text-[0.95rem] font-mono font-semibold ${
                  a.trinn3.eksponeringsgapDager > 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-green-700 dark:text-green-400"
                }`}
              >
                {a.trinn3.eksponeringsgapDager > 0 ? "+" : ""}
                {a.trinn3.eksponeringsgapDager}
              </p>
              <p className="text-[0.65rem] text-muted">Eksponeringsgap</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-foreground/80">
            <span className="font-semibold">TTR: </span>
            {a.trinn3.ttrGrunnlag}
          </p>
          <p className="text-xs leading-relaxed text-foreground/80 mt-1">
            <span className="font-semibold">TTS: </span>
            {a.trinn3.ttsGrunnlag}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-bold text-foreground">Trinn 4 — SCOR-KPI og kostnad</p>
            <PensumBadge utenforPensum={false} />
          </div>
          <div className="space-y-1.5">
            {a.trinn4.scorDimensjoner.map((d, i) => (
              <p key={i} className="text-xs leading-relaxed text-foreground/80">
                <span className="font-semibold">{d.dimensjon} · {d.kpiNavn}</span>
                {" "}
                <span className={d.retning === "opp" ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}>
                  {d.retning === "opp" ? "↑" : "↓"} {d.storrelsesorden}
                </span>
                {" — "}
                {d.begrunnelse}
              </p>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-foreground/80 mt-1.5 pt-1.5 border-t border-card-border">
            <span className="font-semibold">Kostnadsanslag: </span>
            {a.trinn4.kostnadsanslag}
          </p>
        </div>

        <div className="pt-2 border-t border-card-border grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-foreground mb-1">Tiltak, rangert</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs leading-relaxed text-foreground/80">
              {a.tiltak.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground mb-1">Usikkerheter å verifisere</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs leading-relaxed text-foreground/80">
              {a.usikkerheter.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-3 pt-2 border-t border-card-border text-[0.65rem] italic text-muted">
        Maskingenerert konsekvensanalyse. Kun trinn 4 (SCOR-modellen) er bekreftet dekket i pensum-kompendiene.
        Trinn 1 (nodekritikalitet, Craighead et al. 2007), trinn 2 (Sheffi &amp; Rice) og trinn 3 (TTR/TTS) er
        anerkjent fagteori, men ikke funnet i de delte kompendiene.
      </p>
    </div>
  );
}
