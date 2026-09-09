"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { findConcept } from "@/lib/concepts";
import { excerpt, formatRelativeTime, readingTime } from "@/lib/format";
import { PensumKoblingPanel } from "./PensumKoblingPanel";
import type { PensumKobling } from "@/lib/pensumKoblinger";
import type { Category } from "@prisma/client";

export interface ArticleCardData {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  articleUrl: string;
  publishedAt: string;
  aiSummary: string;
  category: Category | null;
  accessLevel: "full" | "limited";
  concepts: { slug: string; whyRelevant: string }[];
  /** From the teacher's separately-built pensum feed — absent whenever
   * that feed isn't configured or has nothing for this article. */
  pensumKobling?: PensumKobling;
}

// A native title="" tooltip is too small/unstyled to actually show a
// definition + per-article explanation, and doesn't work on touch at all.
// This shows a real detail panel instead, opened by click (works on mouse
// and touch). It renders inline right below the badge row — not as an
// absolutely-positioned popover — because the card's own overflow-hidden
// (needed elsewhere for its rounded corners/collapse animation) would
// clip anything positioned outside its box.
function ConceptBadges({ concepts }: { concepts: ArticleCardData["concepts"] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  if (concepts.length === 0) return null;

  const resolved = concepts
    .map((c) => ({ ...c, concept: findConcept(c.slug) }))
    .filter((c): c is typeof c & { concept: NonNullable<typeof c.concept> } => Boolean(c.concept));
  const open = resolved.find((c) => c.slug === openSlug);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1.5">
        {resolved.map((c) => {
          const isOpen = openSlug === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenSlug(isOpen ? null : c.slug);
              }}
              aria-expanded={isOpen}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-medium transition-colors cursor-pointer ${
                isOpen
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-accent/30 bg-accent/5 text-accent hover:bg-accent/10"
              }`}
            >
              {c.concept.name}
            </button>
          );
        })}
      </div>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 rounded-lg border border-card-border bg-background/60 p-3 text-left"
        >
          <p className="text-xs font-bold text-foreground mb-1">{open.concept.name}</p>
          <p className="text-xs leading-relaxed text-foreground/80">{open.concept.definition}</p>
          <p className="text-[0.7rem] text-muted mt-1.5 italic">Kilde: {open.concept.kilde}</p>
          <p className="text-xs leading-relaxed text-foreground/70 mt-2 pt-2 border-t border-card-border">
            <span className="font-semibold text-accent">I denne saken: </span>
            {open.whyRelevant}
          </p>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

export function ArticleCard({ article }: { article: ArticleCardData }) {
  const [expanded, setExpanded] = useState(false);
  const style = article.category ? CATEGORY_STYLES[article.category] : null;
  const teaser = excerpt(article.aiSummary, 130);
  const teaserBase = teaser.replace(/…$/, "");
  const isShort = teaser === article.aiSummary;

  return (
    <article className="group relative overflow-hidden rounded-lg border border-card-border bg-card card-shadow card-shadow-hover transition-all duration-300 hover:-translate-y-0.5">
      <div
        className="absolute inset-y-0 left-0 w-[5px]"
        style={{
          background: style
            ? `linear-gradient(180deg, ${style.gradientFrom}, var(--gold))`
            : "var(--card-border)",
        }}
        aria-hidden
      />
      {/* A <div> here, not <button> — the concept badges below are real
          buttons (for a click-to-open popover), and buttons can't nest. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={expanded}
        className={`w-full text-left pt-4 px-4 sm:pt-5 sm:px-5 cursor-pointer ${
          expanded && !isShort ? "pb-0" : "pb-4 sm:pb-5"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mb-2.5">
          {article.category && style && (
            <span
              className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide ${style.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
              {CATEGORY_LABELS[article.category]}
            </span>
          )}
          <span aria-hidden className="text-card-border">|</span>
          <span className="font-medium text-foreground/70">{article.sourceName}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt}>
            {formatRelativeTime(article.publishedAt)}
          </time>
          <span aria-hidden>·</span>
          <span>{readingTime(article.aiSummary)}</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-lg sm:text-xl font-bold leading-snug text-balance">
            {article.title}
          </h2>
          {!isShort && (
            <span className="mt-1 text-muted group-hover:text-accent transition-colors">
              <ChevronIcon expanded={expanded} />
            </span>
          )}
        </div>

        {article.accessLevel === "limited" && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            Sammendrag basert på begrenset utdrag (kilde krever abonnement)
          </p>
        )}

        <p className="text-[0.95rem] leading-relaxed text-foreground/90 mt-2">
          {expanded && !isShort ? teaserBase : teaser}
        </p>

        <ConceptBadges concepts={article.concepts} />
      </div>

      {!isShort && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              <p className="text-[0.95rem] leading-relaxed text-foreground/90">
                {article.aiSummary.slice(teaserBase.length).trimStart()}
              </p>

              {article.pensumKobling && <PensumKoblingPanel kobling={article.pensumKobling} />}

              <div className="mt-3.5 pt-3 border-t border-card-border">
                <a
                  href={article.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-semibold text-accent hover:underline underline-offset-2 inline-flex items-center gap-1"
                >
                  Les hele saken hos {article.sourceName}
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {isShort && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1">
          {article.pensumKobling && <PensumKoblingPanel kobling={article.pensumKobling} />}
          <div className="pt-3 border-t border-card-border">
            <a
              href={article.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-accent hover:underline underline-offset-2 inline-flex items-center gap-1"
            >
              Les hele saken hos {article.sourceName}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>
        </div>
      )}
    </article>
  );
}
