import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard, type ArticleCardData } from "@/components/ArticleCard";
import { CollapsibleFilters } from "@/components/CollapsibleFilters";
import { FilterBar } from "@/components/FilterBar";
import { SectorBar } from "@/components/SectorBar";
import { HomeLink } from "@/components/HomeLink";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ALL_CATEGORIES } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";
import { getPensumKoblinger } from "@/lib/pensumKoblinger";
import { sources } from "@/lib/sources";
import { scrapedSources } from "@/lib/scrapers";
import { SECTOR_SLUGS } from "@/lib/sectors";
import type { Category } from "@prisma/client";

const PAGE_SIZE = 40;

interface PageProps {
  searchParams: Promise<{
    category?: string;
    source?: string;
    q?: string;
    limit?: string;
    // For linking straight from Canvas to "the articles for this week" once
    // the teacher's pensum feed has real data — see pensumKoblinger.ts.
    emne?: string;
    uke?: string;
    sector?: string;
  }>;
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
  const emne = params.emne?.trim() || undefined;
  const uke = params.uke ? parseInt(params.uke, 10) : undefined;
  const sector = SECTOR_SLUGS.includes(params.sector ?? "") ? params.sector : undefined;

  const where = {
    aiSummary: { not: null },
    ...(category ? { category } : {}),
    ...(source ? { sourceName: source } : {}),
    ...(sector ? { sectors: { some: { sectorSlug: sector } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { aiSummary: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [articles, total, allTimeTotal, sourceCounts, lastRun, pensumKoblinger] =
    await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        include: { concepts: { select: { conceptSlug: true, whyRelevant: true } } },
      }),
      prisma.article.count({ where }),
      prisma.article.count({ where: { aiSummary: { not: null } } }),
      prisma.article.groupBy({
        by: ["sourceName"],
        where: { aiSummary: { not: null } },
        _count: true,
      }),
      // Sourced from the most recent successful summarization, not fetchedAt:
      // fetchedAt updates whenever the feed step runs even if every
      // summarization call fails afterwards (e.g. the Anthropic account ran
      // out of credits) — that would make this claim the site is fresh on a
      // day where zero new stories actually became visible. summarizedAt only
      // advances when a real, published summary is written, which is what a
      // reader actually cares about. Each article write commits individually
      // during the run (not the fragile once-at-the-end FetchLog row), so this
      // is just as reliable as fetchedAt was.
      prisma.article.findFirst({
        where: { aiSummary: { not: null } },
        orderBy: { summarizedAt: "desc" },
        select: { summarizedAt: true },
      }),
      // The teacher's own tool, her own curriculum data — null whenever her
      // feed isn't configured yet or is unreachable, in which case none of
      // this renders. See pensumKoblinger.ts.
      getPensumKoblinger(),
    ]);

  const countBySource = new Map(sourceCounts.map((s) => [s.sourceName, s._count]));
  const rssSources = sources.filter((s) => s.enabled && s.feedUrl);
  const activeScrapedSources = scrapedSources.filter((s) => s.enabled);
  const activeSources = [...rssSources, ...activeScrapedSources];
  const norwegianSources = rssSources.filter((s) => s.country === "NO");
  const internationalSources = rssSources.filter((s) => s.country === "INT");

  let cards: ArticleCardData[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    sourceName: a.sourceName,
    sourceUrl: a.sourceUrl,
    articleUrl: a.articleUrl,
    publishedAt: a.publishedAt.toISOString(),
    aiSummary: a.aiSummary ?? "",
    category: a.category,
    accessLevel: a.accessLevel,
    concepts: a.concepts.map((c) => ({ slug: c.conceptSlug, whyRelevant: c.whyRelevant })),
    pensumKobling: pensumKoblinger?.get(a.id),
  }));

  // Lets her link straight from Canvas to a given week's articles, e.g.
  // /?emne=OAL117&uke=5. Filtered here rather than in the DB query since
  // koblinger live in her feed, not ours — so this only searches within
  // the page of articles already fetched above (bounded by `limit`), not
  // the full archive. Fine for now; revisit if that turns out to matter.
  if (emne) {
    cards = cards.filter((c) =>
      c.pensumKobling?.temaer.some(
        (t) => t.emne === emne && (uke === undefined || t.uke === uke),
      ),
    );
  }

  const hasMore = total > cards.length;
  const moreParams = new URLSearchParams();
  if (category) moreParams.set("category", category);
  if (source) moreParams.set("source", source);
  if (sector) moreParams.set("sector", sector);
  if (q) moreParams.set("q", q);
  moreParams.set("limit", String(limit + PAGE_SIZE));

  const sourceLink = (name: string) => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (sector) p.set("sector", sector);
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
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
            <HomeLink>
              <Logo />
              <div className="min-w-0">
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
                  {lastRun?.summarizedAt
                    ? `sist oppdatert ${formatRelativeTime(lastRun.summarizedAt)}`
                    : "venter på første oppdatering"}
                </p>
              </div>
            </HomeLink>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/spill"
                className="rounded-md border border-card-border px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-foreground/80 hover:text-accent hover:border-accent transition-all active:scale-95 shrink-0"
              >
                🚚 <span className="hidden sm:inline">Dagens </span>spill
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <Suspense fallback={null}>
            <SectorBar />
          </Suspense>

          <div className="mt-3">
            <CollapsibleFilters>
              <Suspense fallback={null}>
                <FilterBar sources={activeSources.map((s) => s.name)} />
              </Suspense>
            </CollapsibleFilters>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="min-w-0">
          {cards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-card-border p-8 text-center text-muted">
              {allTimeTotal === 0 ? (
                <>
                  <p className="font-medium text-foreground mb-1">Ingen artikler ennå</p>
                  <p className="text-sm">
                    Kjør innhentingsjobben (<code>/api/cron</code>) for å hente de første
                    sakene.
                  </p>
                </>
              ) : sector ? (
                <>
                  <p className="font-medium text-foreground mb-1">Ingen saker i denne sektoren ennå</p>
                  <p className="text-sm">
                    Sektor-merking er nytt og gjelder kun artikler hentet inn fra nå av — prøv
                    igjen om noen timer, eller juster filtrene dine.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground mb-1">Ingen treff</p>
                  <p className="text-sm">Prøv å justere filtrene dine.</p>
                </>
              )}
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
                Laget av Borna Anvari. Samler saker fra {norwegianSources.length} norske
                og {internationalSources.length} internasjonale kilder, ulike
                redaksjoner og ståsted, pluss {activeScrapedSources.length}{" "}
                markedsindekser hentet direkte fra kildenes egne sider. Alt
                oppsummeres nøytralt uten å publisere rå tekst fra kildene.
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

              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted mt-3 mb-1">
                Markedsindekser
              </p>
              <ul className="flex flex-col">
                {activeScrapedSources.map((s) => (
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
