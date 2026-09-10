import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeDisruption } from "@/lib/disruptionAnalysis";

// On-demand "Analyser forstyrrelse" endpoint — called only when a reader
// clicks the button on an article (never during ingest). Cached one-to-one
// per article in DisruptionAnalysis so a second click just re-serves the
// stored result instead of paying for another Claude call.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    select: {
      title: true,
      sourceName: true,
      rawExcerpt: true,
      aiSummary: true,
      disruptionAnalysis: { select: { data: true } },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Fant ikke artikkelen" }, { status: 404 });
  }

  if (article.disruptionAnalysis) {
    return NextResponse.json({ analyse: article.disruptionAnalysis.data });
  }

  const articleText = article.rawExcerpt || article.aiSummary;
  if (!articleText) {
    return NextResponse.json(
      { error: "Artikkelen har ikke noe tekstinnhold å analysere ennå" },
      { status: 422 },
    );
  }

  let result;
  try {
    result = await analyzeDisruption({
      title: article.title,
      sourceName: article.sourceName,
      articleText,
    });
  } catch (err) {
    console.error("Forstyrrelsesanalyse feilet", err);
    return NextResponse.json(
      { error: "Analysen feilet — prøv igjen om litt" },
      { status: 502 },
    );
  }

  await prisma.disruptionAnalysis.create({
    data: { articleId: id, data: result as object },
  });

  return NextResponse.json({ analyse: result });
}
