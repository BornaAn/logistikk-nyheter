import Anthropic from "@anthropic-ai/sdk";
import type { Concept } from "./concepts";
import { BOTTLENECK_SCENARIOS, type QuizQuestion } from "./quiz";

const MODEL = "claude-sonnet-5";

/**
 * Claude-generated "Dagens spill" round, cached once per day per mode
 * (see DailyQuiz in schema.prisma / the API route that calls this).
 * Replaces the old fully-static generator (still in quiz.ts as the
 * fallback if this call or the DB fails): instead of picking from a small
 * fixed set of pre-written scenarios and definitions, Claude writes fresh
 * question phrasing and answer options every day, while every correct
 * answer stays pinned to the real definition from concepts.ts — grounded
 * the same way summarize.ts's relatedConcepts is, so it can't hallucinate
 * a concept's actual meaning even while being creative about how it asks.
 */
const SYSTEM_PROMPT = `Du lager spørsmål til en daglig flervalgs-quiz om fagbegreper i supply chain management, for et lastebil-tema spill på en norsk logistikk-nyhetsside. Målgruppen er universitetsstudenter som pugger til eksamen.

Du får en liste med begreper og deres offisielle definisjoner. Lag fem spørsmål, hvert om ett begrep fra listen (bruk så mange ulike begreper som mulig, ikke samme begrep to ganger med mindre listen har færre enn fem begreper).

Regler:
- Vær KREATIV og variert — ikke skriv alle fem spørsmålene på samme måte. Bland f.eks.: rett fram "hva betyr X", en oppdiktet situasjon som illustrerer begrepet, "hvilket av disse er IKKE en del av X", eller en sammenligning mellom to lignende begreper.
- Det riktige svaret skal alltid gjenspeile den offisielle definisjonen presist, men skriv det gjerne med egne, friske ord — ikke kopier definisjonen ordrett.
- De tre feilalternativene skal høres plausible ut for noen som er usikre, men være tydelig feil for den offisielle definisjonen. De kan være oppspinn laget spesifikt for å teste forståelse — ikke fremstill dem som ekte fagpåstander om andre reelle tema.
- Nøyaktig fire svaralternativer per spørsmål, nøyaktig ett riktig.
- Skriv alt på norsk, kort og presist — spørsmål og svaralternativer skal være lesbare på en mobilskjerm.
- Bruk ALDRI et begrep som ikke står i den gitte listen.`;

const DAILY_QUIZ_TOOL: Anthropic.Tool = {
  name: "return_quiz",
  description: "Returner fem quiz-spørsmål.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            conceptSlug: { type: "string", description: "Slug for begrepet dette spørsmålet handler om, nøyaktig som i den gitte listen." },
            kind: {
              type: "string",
              enum: ["definition", "situation"],
              description: "'definition' hvis spørsmålsteksten navngir begrepet direkte, 'situation' hvis den beskriver en situasjon/scenario og svaralternativene er begrepsnavn.",
            },
            prompt: { type: "string", description: "Selve spørsmålsteksten." },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
              description: "Nøyaktig fire svaralternativer.",
            },
            correctIndex: { type: "integer", minimum: 0, maximum: 3, description: "Indeks (0-3) til det riktige alternativet i options." },
          },
          required: ["conceptSlug", "kind", "prompt", "options", "correctIndex"],
        },
      },
    },
    required: ["questions"],
  },
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY er ikke satt");
    client = new Anthropic({ apiKey });
  }
  return client;
}

function pickScenarios(count: number): string[] {
  const shuffled = [...BOTTLENECK_SCENARIOS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** A shuffled [0..n) index order — used to reorder a question's options
 * without relying on the option text being unique (see call site). */
function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function generateDailyQuiz(pool: Concept[]): Promise<QuizQuestion[]> {
  const anthropic = getClient();
  const poolSlugs = pool.map((c) => c.slug);
  const glossaryText = pool.map((c) => `- ${c.slug}: ${c.name} — ${c.definition}`).join("\n");
  const count = Math.min(5, pool.length);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [DAILY_QUIZ_TOOL],
    tool_choice: { type: "tool", name: "return_quiz" },
    messages: [
      {
        role: "user",
        content: `Lag ${count} spørsmål fra denne begrepslisten:\n${glossaryText}`,
      },
    ],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude sitt quiz-svar ble kuttet av — ufullstendig runde");
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) throw new Error("Claude returnerte ikke en strukturert quiz-runde");

  const parsed = toolUse.input as {
    questions?: {
      conceptSlug?: unknown;
      kind?: unknown;
      prompt?: unknown;
      options?: unknown;
      correctIndex?: unknown;
    }[];
  };

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("Claude returnerte en tom quiz-runde");
  }

  const scenarios = pickScenarios(parsed.questions.length);

  const questions: QuizQuestion[] = parsed.questions
    .filter(
      (q): q is Required<typeof q> =>
        typeof q.conceptSlug === "string" &&
        poolSlugs.includes(q.conceptSlug) &&
        (q.kind === "definition" || q.kind === "situation") &&
        typeof q.prompt === "string" &&
        q.prompt.trim().length > 0 &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o) => typeof o === "string" && o.trim().length > 0) &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3,
    )
    .map((q, i) => {
      // Claude reliably drifts toward putting the correct answer in the
      // same slot (observed: index 0 for all five questions in a batch,
      // more than once) — a student would only need to notice that pattern
      // to win without knowing any of the material. Reshuffle the options
      // ourselves rather than trust the model's placement; this is cached
      // once per day so the extra step costs nothing per visitor.
      const options = (q.options as string[]).map((o) => o.trim());
      // Shuffle indices, not the strings themselves — safe even if two
      // options happen to read identically, unlike shuffle-then-indexOf.
      const order = shuffleIndices(options.length);
      return {
        conceptSlug: q.conceptSlug as string,
        kind: q.kind as "definition" | "situation",
        prompt: (q.prompt as string).trim(),
        options: order.map((idx) => options[idx]),
        correctIndex: order.indexOf(q.correctIndex as number),
        scenario: scenarios[i] ?? scenarios[0],
      };
    });

  if (questions.length === 0) {
    throw new Error("Ingen av Claude sine quiz-spørsmål besto validering");
  }

  return questions;
}
