import Anthropic from "@anthropic-ai/sdk";
import type { Category } from "@prisma/client";
import { concepts } from "./concepts";

const MODEL = "claude-sonnet-5";

const CATEGORIES: Category[] = [
  "shipping",
  "trucking",
  "lager_forsyningskjede",
  "norge",
  "globalt_geopolitikk",
];

const CONCEPT_SLUGS = concepts.map((c) => c.slug);
const CONCEPT_GLOSSARY_TEXT = concepts
  .map((c) => `- ${c.slug}: ${c.name} — ${c.definition}`)
  .join("\n");

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
- Returner alltid en kategori fra den gitte listen, selv om du må velge den som passer best.
- Du får også en liste med fagbegreper fra et universitetskompendium (data science i supply chain management). Hvis 1-3 av disse begrepene er GENUINT relevante for akkurat denne saken — altså at kildeteksten faktisk illustrerer eller berører det begrepet, ikke bare at det er logistikk-relatert i vid forstand — inkluder dem i "relatedConcepts", hver med én kort, konkret setning (basert kun på kildeteksten) om hvorfor begrepet er relevant for denne saken. Bruk ALDRI et begrep som ikke står i den gitte listen. Er ingen av begrepene genuint relevante, la "relatedConcepts" være en tom liste — ikke tving det inn.

Ordliste (fagbegreper du kan velge relatedConcepts fra):
${CONCEPT_GLOSSARY_TEXT}`;

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
  /** 0-3 glossary concepts (src/lib/concepts.ts) Claude judged genuinely
   * relevant to this article, each with a one-sentence grounded reason. */
  relatedConcepts: { slug: string; whyRelevant: string }[];
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
      relatedConcepts: {
        type: "array",
        maxItems: 3,
        description:
          "0-3 fagbegreper fra den gitte ordlisten som er genuint relevante for denne saken. Tom liste hvis ingen passer.",
        items: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              enum: CONCEPT_SLUGS,
              description: "Slug for begrepet, nøyaktig som oppgitt i ordlisten.",
            },
            whyRelevant: {
              type: "string",
              description:
                "Én kort, konkret setning om hvorfor begrepet er relevant for AKKURAT denne saken, basert kun på kildeteksten.",
            },
          },
          required: ["slug", "whyRelevant"],
        },
      },
    },
    required: ["sufficientContent", "summary", "category", "relatedConcepts"],
  },
};

export async function summarizeArticle(
  input: SummarizeInput,
): Promise<SummarizeResult> {
  const anthropic = getClient();

  // Stable content (rules + the 46-concept glossary, ~8.5K tokens) lives in
  // SYSTEM_PROMPT and never changes between calls — only the per-article
  // bits below do. Keeping the variable content OUT of the cached system
  // block, and never reordering it before the glossary, is what makes the
  // cache_control breakpoint actually hit on repeat calls: Anthropic caches
  // a byte-exact prefix, so if a per-article field were interleaved before
  // the glossary (as it was previously, when the glossary lived in the user
  // message after the article text), every call would get a different
  // prefix and never hit cache at all.
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
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
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
    relatedConcepts?: unknown;
  };
  // Defensive: a handful of responses in late August 2026 had Claude bleed
  // old-style XML tool-call formatting (</summary>, <parameter ...>,
  // </invoke>) into the tail of the summary STRING VALUE itself, inside an
  // otherwise well-formed tool_use block — not a parsing bug here, the
  // model just kept generating past where it should have stopped. Strip
  // anything from the first such marker onward rather than trust the
  // string is clean just because it's the right type.
  const rawSummary = typeof parsed.summary === "string" ? parsed.summary : "";
  const leakMarker = rawSummary.search(/<\/summary>|<parameter[\s>]|<\/invoke>/);
  const summary = (leakMarker === -1 ? rawSummary : rawSummary.slice(0, leakMarker)).trim();
  const category = CATEGORIES.includes(parsed.category as Category)
    ? (parsed.category as Category)
    : "globalt_geopolitikk";
  const sufficientContent = parsed.sufficientContent !== false;

  if (!summary) {
    throw new Error("Claude returnerte et tomt sammendrag");
  }

  // Defensive filter, not just trust: drop anything that isn't a real slug
  // from our glossary (a hallucinated or malformed entry) rather than
  // letting a bad foreign-key value reach the database. Also dedupe by
  // slug — Claude occasionally lists the same concept twice in one
  // response, which would otherwise violate the (articleId, conceptSlug)
  // unique constraint when writing ArticleConcept rows.
  const seenSlugs = new Set<string>();
  const relatedConcepts = Array.isArray(parsed.relatedConcepts)
    ? parsed.relatedConcepts
        .filter(
          (c): c is { slug: string; whyRelevant: string } =>
            typeof c === "object" &&
            c !== null &&
            typeof (c as { slug?: unknown }).slug === "string" &&
            CONCEPT_SLUGS.includes((c as { slug: string }).slug) &&
            typeof (c as { whyRelevant?: unknown }).whyRelevant === "string" &&
            (c as { whyRelevant: string }).whyRelevant.trim().length > 0,
        )
        .filter((c) => (seenSlugs.has(c.slug) ? false : (seenSlugs.add(c.slug), true)))
        .slice(0, 3)
        .map((c) => ({ slug: c.slug, whyRelevant: c.whyRelevant.trim() }))
    : [];

  return { summary, category, sufficientContent, relatedConcepts };
}
