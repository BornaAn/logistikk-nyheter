"use client";

import { useState } from "react";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";
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

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "akkurat nå";
  if (diffMin < 60) return `${diffMin} min siden`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} t siden`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD} d siden`;

  return date.toLocaleDateString("no-NO", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function ArticleCard({ article }: { article: ArticleCardData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-lg border border-card-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted mb-2">
        {article.category && (
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium ${CATEGORY_COLORS[article.category]}`}
          >
            {CATEGORY_LABELS[article.category]}
          </span>
        )}
        <span className="font-medium text-foreground/70">{article.sourceName}</span>
        <span aria-hidden>·</span>
        <time dateTime={article.publishedAt}>
          {formatRelativeTime(article.publishedAt)}
        </time>
      </div>

      <h2 className="text-base sm:text-lg font-semibold leading-snug mb-2">
        {article.title}
      </h2>

      {article.accessLevel === "limited" && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
          Sammendrag basert på begrenset utdrag (kilde krever abonnement)
        </p>
      )}

      <p
        className={`text-sm leading-relaxed text-foreground/90 ${
          expanded ? "" : "line-clamp-6 sm:line-clamp-none"
        }`}
      >
        {article.aiSummary}
      </p>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="sm:hidden mt-1 text-xs text-sky-700 dark:text-sky-400 font-medium"
      >
        {expanded ? "Vis mindre" : "Vis mer"}
      </button>

      <div className="mt-3 pt-3 border-t border-card-border">
        <a
          href={article.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-sky-700 dark:text-sky-400 hover:underline"
        >
          Les hele saken hos {article.sourceName} →
        </a>
      </div>
    </article>
  );
}
