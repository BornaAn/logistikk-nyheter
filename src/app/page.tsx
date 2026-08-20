import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard, type ArticleCardData } from "@/components/ArticleCard";
import { FilterBar } from "@/components/FilterBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ALL_CATEGORIES } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";
import type { Category } from "@prisma/client";

const PAGE_SIZE = 40;

interface PageProps {
  searchParams: Promise<{
    category?: string;
    source?: string;
    q?: string;
    limit?: string;
  }>;
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <rect x="7" y="9" width="8" height="6" rx="1" fill="var(--accent-foreground)" />
      <rect
        x="17"
        y="9"
        width="8"
        height="6"
        rx="1"
        fill="var(--accent-foreground)"
        opacity="0.55"
      />
      <rect
        x="7"
        y="17.5"
        width="18"
        height="5.5"
        rx="1"
        fill="var(--accent-foreground)"
        opacity="0.85"
      />
    </svg>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const category = ALL_CATEGORIES.includes(params.category as Category)
    ? (params.category as Category)
    : undefined;
  const source = params.source || undefined;
  const q = params.q?.trim() || undefined;
  const limit = Math.max(PAGE_SIZE, parseInt(params.limit ?? "", 10) || PAGE_SIZE);

  const where = {
    aiSummary: { not: null },
    ...(category ? { category } : {}),
    ...(source ? { sourceName: source } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { aiSummary: { contains: q } },
          ],
        }
      : {}),
  };

  const [articles, total, sourceNames, lastRun] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
    }),
    prisma.article.count({ where }),
    prisma.article.findMany({
      where: { aiSummary: { not: null } },
      distinct: ["sourceName"],
      select: { sourceName: true },
      orderBy: { sourceName: "asc" },
    }),
    prisma.fetchLog.findFirst({ orderBy: { runAt: "desc" } }),
  ]);

  const cards: ArticleCardData[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    sourceName: a.sourceName,
    sourceUrl: a.sourceUrl,
    articleUrl: a.articleUrl,
    publishedAt: a.publishedAt.toISOString(),
    aiSummary: a.aiSummary ?? "",
    category: a.category,
    accessLevel: a.accessLevel,
  }));

  const hasMore = total > cards.length;
  const moreParams = new URLSearchParams();
  if (category) moreParams.set("category", category);
  if (source) moreParams.set("source", source);
  if (q) moreParams.set("q", q);
  moreParams.set("limit", String(limit + PAGE_SIZE));

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-card-border bg-background/90 backdrop-blur supports-backdrop-blur:bg-background/70">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight leading-none">
                  Logistikknyheter
                </h1>
                <p className="text-xs text-muted mt-1">
                  {lastRun
                    ? `Sist oppdatert ${formatRelativeTime(lastRun.runAt)}`
                    : "Venter på første oppdatering"}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <Suspense fallback={null}>
            <FilterBar sources={sourceNames.map((s) => s.sourceName)} />
          </Suspense>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {cards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-card-border p-8 text-center text-muted">
            <p className="font-medium text-foreground mb-1">Ingen artikler ennå</p>
            <p className="text-sm">
              Kjør innhentingsjobben (<code>/api/cron</code>) for å hente de første
              sakene, eller juster filtrene dine.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted mb-4">
              Viser {cards.length} av {total} {total === 1 ? "sak" : "saker"}
            </p>
            <div className="flex flex-col gap-4">
              {cards.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Link
                  href={`/?${moreParams.toString()}`}
                  className="rounded-md border border-card-border bg-card px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent transition-colors"
                >
                  Last inn flere
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
