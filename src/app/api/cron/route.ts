import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

// Vercel's Hobby plan hard-caps actual execution at 60s no matter what this
// says (maxDuration above 60 only takes effect on Pro+) — the function gets
// killed with no thrown error if it runs long, which is why this used to sit
// at 300. Kept at 60 here so the number in code matches reality; the real
// lever for run size is MAX_NEW_ARTICLES_PER_RUN/MAX_SUMMARIES_PER_RUN in
// ingest.ts.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runIngest();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
