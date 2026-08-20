import Anthropic from "@anthropic-ai/sdk";
import type { Category } from "@prisma/client";

const MODEL = "claude-sonnet-5";

const CATEGORIES: Category[] = [
  "shipping",
  "trucking",
  "lager_forsyningskjede",
  "norge",
  "globalt_geopolitikk",
];

const SYSTEM_PROMPT = `Du oppsummerer en nyhetsartikkel om logistikk/frakt/handel for en norsk logistikk-nyhetsside.

Reglene er strenge:
- Skriv KUN i egne ord — aldri kopier setninger eller fraser direkte fra kildeteksten.
- Ta med konkrete fakta: hvem/hva/hvor/når, tall, beløp, årsak og konsekvens hvis det finnes.
- 4–8 setninger, nøytral og saklig tone, ingen synsing.
- Skriv på norsk, selv om kildeartikkelen er på engelsk.
- Ikke inkluder egen mening eller "AI-kommentarer" — bare oppsummer sakens innhold.
- Avslutt IKKE med en oppfordring om å lese hele artikkelen — det håndterer nettsiden selv.
- Du kan bruke ett enkeltstående sitat under ca. 15 ord hvis det er avgjørende for meningen, men ikke mer.
- Returner alltid en kategori fra den gitte listen, selv om du må velge den som passer best.`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY er ikke satt");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface SummarizeInput {
  title: string;
  sourceName: string;
  extractedText: string;
}

export interface SummarizeResult {
  summary: string;
  category: Category;
}

const SUMMARY_TOOL: Anthropic.Tool = {
  name: "return_summary",
  description: "Returner sammendraget og kategorien for artikkelen.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "4-8 setninger, på norsk, i egne ord.",
      },
      category: {
        type: "string",
        enum: CATEGORIES,
        description: "Den kategorien som passer artikkelen best.",
      },
    },
    required: ["summary", "category"],
  },
};

export async function summarizeArticle(
  input: SummarizeInput,
): Promise<SummarizeResult> {
  const anthropic = getClient();

  const userMessage = [
    `Artikkeltittel: ${input.title}`,
    `Kilde: ${input.sourceName}`,
    `Uthentet artikkeltekst:`,
    input.extractedText.slice(0, 12000),
  ].join("\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [SUMMARY_TOOL],
    tool_choice: { type: "tool", name: "return_summary" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Claude returnerte ikke et strukturert sammendrag");
  }

  const parsed = toolUse.input as { summary?: unknown; category?: unknown };
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const category = CATEGORIES.includes(parsed.category as Category)
    ? (parsed.category as Category)
    : "globalt_geopolitikk";

  if (!summary) {
    throw new Error("Claude returnerte et tomt sammendrag");
  }

  return { summary, category };
}
