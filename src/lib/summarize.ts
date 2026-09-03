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
- Ta med konkrete fakta: hvem/hva/hvor/når, tall, beløp, årsak og konsekvens hvis det finnes i kildeteksten.
- ALDRI dikt opp fakta, detaljer eller antakelser som ikke faktisk står i den uthentede teksten — heller ikke basert på hva du måtte vite om saken fra andre kilder. Sammendraget skal bygge utelukkende på den oppgitte teksten.
- Automatisk uthenting fra nettsider feiler av og til og gir feil tekst — f.eks. en helt annen artikkel fra samme nettside. Sjekk derfor at den uthentede teksten faktisk handler om samme sak som tittelen antyder.
- Sett "sufficientContent" til false hvis: (a) teksten ikke handler om samme sak som tittelen, eller (b) teksten er for tynn/generisk (f.eks. bare en betalingsmur-/innloggingsmelding) til å lage et pålitelig sammendrag. Skriv da i stedet én kort, ærlig setning om at innholdet ikke var tilgjengelig — ikke fyll ut med gjetning.
- Når "sufficientContent" er true: skriv 4–8 setninger hvis kildeteksten har nok stoff til det, men det er helt greit med færre setninger enn 4 hvis teksten er ekte og relevant men kort — skriv bare det teksten faktisk støtter.
- Nøytral og saklig tone, ingen synsing.
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
  /**
   * True for market-index/statistics sources (Drewry, Xeneta, ISM, ...) —
   * these report numbers and trends without the "why this matters" framing
   * a normal news article would have, so the prompt asks Claude to add a
   * short explanation of the practical relevance for logistics/supply
   * chain work.
   */
  explainRelevance?: boolean;
}

export interface SummarizeResult {
  summary: string;
  category: Category;
  /** False if the extracted text didn't actually match the title, or was
   * too thin/generic (e.g. a paywall wall) to summarize reliably. */
  sufficientContent: boolean;
}

const SUMMARY_TOOL: Anthropic.Tool = {
  name: "return_summary",
  description: "Returner sammendraget og kategorien for artikkelen.",
  input_schema: {
    type: "object",
    properties: {
      sufficientContent: {
        type: "boolean",
        description:
          "false hvis kildeteksten ikke handler om samme sak som tittelen, eller er for tynn/generisk til å oppsummeres pålitelig.",
      },
      summary: {
        type: "string",
        description:
          "På norsk, i egne ord. 4-8 setninger normalt, færre er greit for en kort men ekte kilde. Én kort, ærlig setning hvis sufficientContent er false.",
      },
      category: {
        type: "string",
        enum: CATEGORIES,
        description: "Den kategorien som passer artikkelen best.",
      },
    },
    required: ["sufficientContent", "summary", "category"],
  },
};

export async function summarizeArticle(
  input: SummarizeInput,
): Promise<SummarizeResult> {
  const anthropic = getClient();

  const userMessage = [
    `Artikkeltittel: ${input.title}`,
    `Kilde: ${input.sourceName}`,
    ...(input.explainRelevance
      ? [
          `Dette er en markedsindeks-/statistikkilde (tall og markedsdata, ikke en vanlig nyhetsartikkel). Legg til, som siste setning i sammendraget, en kort og konkret forklaring på hvorfor dette tallet/denne trenden er relevant for noen som jobber med eller studerer logistikk/forsyningskjede (f.eks. hva det betyr for fraktkostnader, kapasitetsplanlegging, lagerstyring eller risikovurdering) — kun basert på det som faktisk står i teksten, ikke generell bakgrunnskunnskap.`,
        ]
      : []),
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

  const parsed = toolUse.input as {
    summary?: unknown;
    category?: unknown;
    sufficientContent?: unknown;
  };
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const category = CATEGORIES.includes(parsed.category as Category)
    ? (parsed.category as Category)
    : "globalt_geopolitikk";
  const sufficientContent = parsed.sufficientContent !== false;

  if (!summary) {
    throw new Error("Claude returnerte et tomt sammendrag");
  }

  return { summary, category, sufficientContent };
}
