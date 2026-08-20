"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { excerpt, formatRelativeTime, readingTime } from "@/lib/format";
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
    <article
      className={`group rounded-lg border border-card-border bg-card card-shadow card-shadow-hover border-l-4 transition-all duration-300 hover:-translate-y-0.5 ${
        style ? style.border : "border-l-card-border"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
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
      </button>

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
