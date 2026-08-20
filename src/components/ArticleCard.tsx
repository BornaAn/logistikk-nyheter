"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";
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

export function ArticleCard({ article }: { article: ArticleCardData }) {
  const [expanded, setExpanded] = useState(false);
  const style = article.category ? CATEGORY_STYLES[article.category] : null;

  return (
    <article
      className={`group rounded-lg border border-card-border bg-card p-4 sm:p-5 shadow-sm border-l-4 transition-shadow hover:shadow-md ${
        style ? style.border : "border-l-card-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mb-2.5">
        {article.category && style && (
          <span className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide ${style.text}`}>
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
      </div>

      <h2 className="font-serif text-lg sm:text-xl font-bold leading-snug mb-2 text-balance">
        {article.title}
      </h2>

      {article.accessLevel === "limited" && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
          Sammendrag basert på begrenset utdrag (kilde krever abonnement)
        </p>
      )}

      <p
        className={`text-[0.95rem] leading-relaxed text-foreground/90 ${
          expanded ? "" : "line-clamp-6 sm:line-clamp-none"
        }`}
      >
        {article.aiSummary}
      </p>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="sm:hidden mt-1 text-xs text-accent font-medium"
      >
        {expanded ? "Vis mindre" : "Vis mer"}
      </button>

      <div className="mt-3.5 pt-3 border-t border-card-border flex items-center justify-between">
        <a
          href={article.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-accent hover:underline underline-offset-2 inline-flex items-center gap-1"
        >
          Les hele saken hos {article.sourceName}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </a>
      </div>
    </article>
  );
}
