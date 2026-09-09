import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, read-only feed of already-published articles for external tools
// to build on (e.g. a pensum-mapping job) — matches what's already visible
// on the site itself, just as machine-readable JSON instead of HTML. No
// auth: there's nothing here that isn't already public on the pages.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  // Same filter the homepage uses: only articles with a real, published
  // summary — never expose rawExcerpt (scraped source text) here either.
  const articles = await prisma.article.findMany({
    where: { aiSummary: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      aiSummary: true,
      sourceName: true,
      articleUrl: true,
      publishedAt: true,
    },
  });

  const saker = articles.map((a) => ({
    id: a.id,
    tittel: a.title,
    sammendrag: a.aiSummary,
    kilde: a.sourceName,
    url: a.articleUrl,
    publisert: a.publishedAt.toISOString(),
  }));

  return NextResponse.json({
    generert: new Date().toISOString(),
    antall: saker.length,
    saker,
  });
}
