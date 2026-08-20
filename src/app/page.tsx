import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ArticleCard, type ArticleCardData } from "@/components/ArticleCard";
import { FilterBar } from "@/components/FilterBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ALL_CATEGORIES } from "@/lib/categories";
import type { Category } from "@prisma/client";

const PAGE_SIZE = 40;

interface PageProps {
  searchParams: Promise<{ category?: string; source?: string; q?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const category = ALL_CATEGORIES.includes(params.category as Category)
    ? (params.category as Category)
    : undefined;
  const source = params.source || undefined;
  const q = params.q?.trim() || undefined;

  const [articles, sourceNames] = await Promise.all([
    prisma.article.findMany({
      where: {
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
      },
      orderBy: { publishedAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.article.findMany({
      where: { aiSummary: { not: null } },
      distinct: ["sourceName"],
      select: { sourceName: true },
      orderBy: { sourceName: "asc" },
    }),
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

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Logistikknyheter
          </h1>
          <p className="text-sm text-muted">
            Det viktigste for frakt, shipping og forsyningskjeder — samlet ett sted.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mb-6">
        <Suspense fallback={null}>
          <FilterBar sources={sourceNames.map((s) => s.sourceName)} />
        </Suspense>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-card-border p-8 text-center text-muted">
          <p className="font-medium text-foreground mb-1">Ingen artikler ennå</p>
          <p className="text-sm">
            Kjør innhentingsjobben (<code>/api/cron</code>) for å hente de første
            sakene, eller juster filtrene dine.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {cards.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
