// One-time backfill: tag existing articles (which already have aiSummary)
// with sectors, without re-running the full summarize pipeline. Only needs
// title + existing summary + the sector list — much cheaper than a real
// summarize.ts call. Safe to re-run: skips articles that already have a
// sector row (from this script or the live pipeline).
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();
const client = new Anthropic();

function loadSectors() {
  const src = fs.readFileSync("src/lib/sectors.ts", "utf8");
  const re = /slug:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?description:\s*"([^"]+)"/g;
  const sectors = [];
  let m;
  while ((m = re.exec(src))) sectors.push({ slug: m[1], name: m[2], description: m[3] });
  return sectors;
}

const sectors = loadSectors();
const SECTOR_SLUGS = sectors.map((s) => s.slug);
const SECTOR_LIST_TEXT = sectors.map((s) => `- ${s.slug}: ${s.name} — ${s.description}`).join("\n");

const SYSTEM_PROMPT = `Du vurderer hvilke bransjesektorer en allerede publisert nyhetssak genuint betyr noe for.

Regler:
- En sektor er genuint relevant hvis saken faktisk påvirker forsyningskjeden, kostnader, tilgang på råvarer/transport eller marked for bedrifter i den sektoren — ikke bare fordi et nøkkelord nevnes i forbifarten.
- Velg 0-2 sektorer fra listen under. Bruk ALDRI en sektor som ikke står i listen.
- Er ingen genuint relevante, returner en tom liste.

Bransjesektorer:
${SECTOR_LIST_TEXT}`;

const TOOL = {
  name: "return_sectors",
  description: "Returner relevante sektorer for saken.",
  input_schema: {
    type: "object",
    properties: {
      relatedSectors: {
        type: "array",
        maxItems: 2,
        items: { type: "string", enum: SECTOR_SLUGS },
      },
    },
    required: ["relatedSectors"],
  },
};

async function classify(article) {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 100,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral", ttl: "1h" } }],
    tools: [TOOL],
    tool_choice: { type: "tool", name: "return_sectors" },
    messages: [
      {
        role: "user",
        content: `Tittel: ${article.title}\nSammendrag: ${article.aiSummary}`,
      },
    ],
  });
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const raw = toolUse?.input?.relatedSectors;
  const sectors = Array.isArray(raw) ? [...new Set(raw.filter((s) => SECTOR_SLUGS.includes(s)))].slice(0, 2) : [];
  return { sectors, usage: response.usage };
}

async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const articles = await prisma.article.findMany({
    where: { aiSummary: { not: null }, sectors: { none: {} } },
    select: { id: true, title: true, aiSummary: true },
  });
  console.log(`${articles.length} artikler å klassifisere.`);

  let done = 0;
  let tagged = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const distribution = Object.fromEntries(SECTOR_SLUGS.map((s) => [s, 0]));

  await mapWithConcurrency(articles, 6, async (article) => {
    try {
      const { sectors: result, usage } = await classify(article);
      totalInputTokens += (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
      totalOutputTokens += usage.output_tokens || 0;
      if (result.length > 0) {
        await prisma.articleSector.createMany({
          data: result.map((sectorSlug) => ({ articleId: article.id, sectorSlug })),
          skipDuplicates: true,
        });
        tagged++;
        for (const s of result) distribution[s]++;
      }
    } catch (err) {
      console.error(`Feil for "${article.title}":`, err.message);
    }
    done++;
    if (done % 50 === 0) console.log(`${done}/${articles.length}...`);
  });

  console.log("\n=== Ferdig ===");
  console.log(`${done} behandlet, ${tagged} fikk minst én sektor.`);
  console.log("Fordeling:", distribution);
  const cost = (totalInputTokens / 1_000_000) * 2 + (totalOutputTokens / 1_000_000) * 10;
  console.log(`Ca. tokens: ${totalInputTokens} input, ${totalOutputTokens} output.`);
  console.log(`Ca. kostnad: $${cost.toFixed(3)}`);
}

main().finally(() => prisma.$disconnect());
