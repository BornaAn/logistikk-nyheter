import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard, type ArticleCardData } from "@/components/ArticleCard";
import { FilterBar } from "@/components/FilterBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ALL_CATEGORIES } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";
import { sources } from "@/lib/sources";
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
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#logoGrad)" />
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

function SidebarHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-serif text-sm font-bold tracking-wide mb-2.5 inline-block">
      {children}
      <span
        className="block h-[2px] w-8 mt-1 rounded-full"
        style={{ background: "linear-gradient(to right, var(--accent), var(--gold))" }}
        aria-hidden
      />
    </h2>
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
            { title: { contains: q, mode: "insensitive" as const } },
            { aiSummary: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [articles, total, allTimeTotal, sourceCounts, lastRun] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
    }),
    prisma.article.count({ where }),
    prisma.article.count({ where: { aiSummary: { not: null } } }),
    prisma.article.groupBy({
      by: ["sourceName"],
      where: { aiSummary: { not: null } },
      _count: true,
    }),
    // Sourced from Article.fetchedAt rather than FetchLog: every successful
    // article write updates this reliably, whereas the FetchLog row is only
    // written once at the very end of a run and can be lost if the
    // connection drops on a long-running invocation (the ingest itself
    // still succeeds either way — see src/lib/ingest.ts).
    prisma.article.findFirst({
      orderBy: { fetchedAt: "desc" },
      select: { fetchedAt: true },
    }),
  ]);

  const countBySource = new Map(sourceCounts.map((s) => [s.sourceName, s._count]));
  const activeSources = sources.filter((s) => s.enabled && s.feedUrl);
  const norwegianSources = activeSources.filter((s) => s.country === "NO");
  const internationalSources = activeSources.filter((s) => s.country === "INT");

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

  const sourceLink = (name: string) => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (name !== source) p.set("source", name);
    if (q) p.set("q", q);
    return `/?${p.toString()}`;
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-card-border bg-background/90 backdrop-blur supports-backdrop-blur:bg-background/70">
        <div
          className="h-[3px] w-full"
          style={{ background: "linear-gradient(to right, var(--accent), var(--gold))" }}
          aria-hidden
        />
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <h1
                  className="font-serif text-lg sm:text-xl font-bold tracking-tight leading-none bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, var(--foreground), var(--accent) 70%, var(--gold))",
                  }}
                >
                  Logistikknyheter
                </h1>
                <p className="text-xs text-muted mt-1">
                  {allTimeTotal} saker · {activeSources.length} aktive kilder ·{" "}
                  {lastRun
                    ? `sist oppdatert ${formatRelativeTime(lastRun.fetchedAt)}`
                    : "venter på første oppdatering"}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <Suspense fallback={null}>
            <FilterBar sources={activeSources.map((s) => s.name)} />
          </Suspense>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="min-w-0">
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
                {cards.map((article, i) => (
                  <div
                    key={article.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  >
                    <ArticleCard article={article} />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <Link
                    href={`/?${moreParams.toString()}`}
                    className="rounded-md border border-card-border bg-card px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent transition-all active:scale-95"
                  >
                    Last inn flere
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:block sticky top-[124px] max-h-[calc(100vh-140px)] overflow-y-auto pr-0.5">
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-card-border bg-card card-shadow p-4">
              <SidebarHeading>Om dekningen</SidebarHeading>
              <p className="text-sm leading-relaxed text-foreground/80">
                Laget av Borna. Samler saker fra {norwegianSources.length} norske og{" "}
                {internationalSources.length} internasjonale kilder — ulike redaksjoner,
                ulikt ståsted — og oppsummerer dem nøytralt uten å publisere rå tekst
                fra kildene.
              </p>
            </div>

            <div className="rounded-lg border border-card-border bg-card card-shadow p-4">
              <SidebarHeading>Kilder</SidebarHeading>

              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted mt-2 mb-1">
                Norge
              </p>
              <ul className="flex flex-col">
                {norwegianSources.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={sourceLink(s.name)}
                      className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-[0.83rem] leading-tight transition-colors ${
                        source === s.name
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-foreground/80 hover:bg-accent/5 hover:text-accent"
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-xs text-muted shrink-0">
                        {countBySource.get(s.name) ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted mt-3 mb-1">
                Internasjonalt
              </p>
              <ul className="flex flex-col">
                {internationalSources.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={sourceLink(s.name)}
                      className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-[0.83rem] leading-tight transition-colors ${
                        source === s.name
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-foreground/80 hover:bg-accent/5 hover:text-accent"
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-xs text-muted shrink-0">
                        {countBySource.get(s.name) ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
