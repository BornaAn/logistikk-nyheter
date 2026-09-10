import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

const DISRUPTION_TYPES = [
  "naturhendelse",
  "geopolitikk",
  "arbeidskonflikt",
  "cyber",
  "regulatorisk",
  "finansiell",
  "etterspørselssjokk",
  "annet",
] as const;

const PROFILE_STAGES = [
  "forberedelse",
  "utløsende_hendelse",
  "første_respons",
  "full_effekt",
  "gjenoppretting",
  "langsiktig_effekt",
] as const;

const SCOR_DIMENSIONS = [
  "pålitelighet",
  "responsivitet",
  "agilitet",
  "kostnad",
  "kapitalbinding",
] as const;

/**
 * On-demand "Analyser forstyrrelse" prompt, built from the teacher's own
 * four-step template (Sheffi & Rice's disruption profile, TTR/TTS,
 * SCOR-KPIs). Her template assumes an analyst who already knows a real
 * company's chain and critical nodes ({kjede_beskrivelse}/{node_liste}) —
 * this site has no real company behind a news article, so step 0 has
 * Claude construct a clearly-labeled ILLUSTRATIVE example first, then run
 * the four steps against that example. Same anti-hallucination discipline
 * as summarize.ts: distinguish source-stated facts from assumptions.
 */
const SYSTEM_PROMPT = `Du er analytiker innen supply chain risk management. Du får en nyhetssak og skal vurdere konsekvensen for en forsyningskjede, etter en fast mal. Skill alltid mellom det som faktisk står i kilden og det du selv antar — marker egne antakelser tydelig i teksten (f.eks. "antar at ...").

Vær konsis i alle fritekstfelter — maks 2-3 setninger per begrunnelse/grunnlag. Dette er et strukturert analyseskjema, ikke en drøftende tekst.

Denne nyhetssiden har ingen navngitt, ekte bedrift bak artikkelen. Du skal derfor FØRST konstruere et kort, tydelig ILLUSTRATIVT eksempel: en generisk bedriftstype (ALDRI en navngitt, ekte bedrift) som plausibelt ville vært berørt av akkurat denne hendelsen, med 2-4 kritiske noder i den kjeden. Dette er et pedagogisk eksempel, ikke en påstand om at en bestemt ekte bedrift er rammet.

Følg deretter de fire trinnene i rekkefølge, mot dette eksempelet, og ikke hopp til konklusjonen:

TRINN 1 – Klassifiser og lokaliser
Klassifiser hendelsen. Angi hvilken node eller lenke i eksempel-kjeden som treffes, og på hvilket nivå (leverandør n-te ledd, transportkorridor, produksjonsanlegg, DC, marked). Vurder nodekritikalitet, nettverkstetthet og kompleksitet rundt treffpunktet.

TRINN 2 – Plasser på forstyrrelsesprofilen
Plasser saken på Sheffi og Rice sin kurve: forberedelse, utløsende hendelse, første respons, full effekt, gjenoppretting, langsiktig effekt. Begrunn plasseringen med formuleringer i kilden. Angi om nyheten er et varsel eller en bekreftet forstyrrelse.

TRINN 3 – TTR mot TTS
Estimer Time-to-Recover for noden med lav/sannsynlig/høy verdi i dager, og oppgi hva estimatet bygger på. Estimer Time-to-Survive gitt lager, alternative kilder og omrutingsmuligheter for eksempel-kjeden. Regn eksponeringsgapet (TTR sannsynlig minus TTS). Positivt gap betyr eksponering. Ikke estimer sannsynlighet for hendelsen.

TRINN 4 – Oversett til SCOR-KPI og kostnad
Velg 2-3 SCOR-dimensjoner som faktisk beveger seg. For hver: navngi en konkret KPI, angi retning og størrelsesorden på endringen, og begrunn. Gi et grovt kostnadsanslag som et intervall i NOK, med regnestykket synlig i teksten.

Avslutt med tre tiltak rangert etter effekt på eksponeringsgapet, og de tre viktigste usikkerhetene som må verifiseres før dette kan brukes til en reell beslutning.

Skriv alt på norsk, saklig og presist, uten synsing utover det malen ber om.`;

export interface DisruptionAnalysisResult {
  illustrativtEksempel: {
    kjedeBeskrivelse: string;
    noder: string[];
  };
  trinn1: {
    klassifisering: string;
    nodeEllerLenke: string;
    niva: string;
    kritikalitetsbegrunnelse: string;
  };
  trinn2: {
    fase: string;
    begrunnelse: string;
    varselEllerBekreftet: "varsel" | "bekreftet";
  };
  trinn3: {
    ttrLavDager: number;
    ttrSannsynligDager: number;
    ttrHoyDager: number;
    ttrGrunnlag: string;
    ttsDager: number;
    ttsGrunnlag: string;
    eksponeringsgapDager: number;
  };
  trinn4: {
    scorDimensjoner: {
      dimensjon: string;
      kpiNavn: string;
      retning: "opp" | "ned";
      storrelsesorden: string;
      begrunnelse: string;
    }[];
    kostnadsanslag: string;
  };
  tiltak: string[];
  usikkerheter: string[];
}

const DISRUPTION_TOOL: Anthropic.Tool = {
  name: "return_analysis",
  description: "Returner forstyrrelsesanalysen strukturert, ett felt per trinn i malen.",
  input_schema: {
    type: "object",
    properties: {
      illustrativtEksempel: {
        type: "object",
        properties: {
          kjedeBeskrivelse: {
            type: "string",
            description: "Kort beskrivelse av den generiske, IKKE navngitte eksempelbedriften/-kjeden.",
          },
          noder: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
            description: "2-4 kritiske noder i eksempel-kjeden.",
          },
        },
        required: ["kjedeBeskrivelse", "noder"],
      },
      trinn1: {
        type: "object",
        properties: {
          klassifisering: { type: "string", enum: [...DISRUPTION_TYPES] },
          nodeEllerLenke: { type: "string", description: "Hvilken node/lenke som treffes." },
          niva: { type: "string", description: "F.eks. transportkorridor, produksjonsanlegg, DC, marked." },
          kritikalitetsbegrunnelse: {
            type: "string",
            description: "Vurdering av nodekritikalitet, nettverkstetthet og kompleksitet.",
          },
        },
        required: ["klassifisering", "nodeEllerLenke", "niva", "kritikalitetsbegrunnelse"],
      },
      trinn2: {
        type: "object",
        properties: {
          fase: { type: "string", enum: [...PROFILE_STAGES] },
          begrunnelse: { type: "string", description: "Begrunnet med formuleringer i kilden." },
          varselEllerBekreftet: { type: "string", enum: ["varsel", "bekreftet"] },
        },
        required: ["fase", "begrunnelse", "varselEllerBekreftet"],
      },
      trinn3: {
        type: "object",
        properties: {
          ttrLavDager: { type: "number" },
          ttrSannsynligDager: { type: "number" },
          ttrHoyDager: { type: "number" },
          ttrGrunnlag: { type: "string" },
          ttsDager: { type: "number" },
          ttsGrunnlag: { type: "string" },
          eksponeringsgapDager: {
            type: "number",
            description: "ttrSannsynligDager minus ttsDager. Positivt tall betyr eksponering.",
          },
        },
        required: [
          "ttrLavDager",
          "ttrSannsynligDager",
          "ttrHoyDager",
          "ttrGrunnlag",
          "ttsDager",
          "ttsGrunnlag",
          "eksponeringsgapDager",
        ],
      },
      trinn4: {
        type: "object",
        properties: {
          scorDimensjoner: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                dimensjon: { type: "string", enum: [...SCOR_DIMENSIONS] },
                kpiNavn: { type: "string" },
                retning: { type: "string", enum: ["opp", "ned"] },
                storrelsesorden: { type: "string" },
                begrunnelse: { type: "string" },
              },
              required: ["dimensjon", "kpiNavn", "retning", "storrelsesorden", "begrunnelse"],
            },
          },
          kostnadsanslag: {
            type: "string",
            description: "Intervall i NOK med regnestykket synlig i teksten.",
          },
        },
        required: ["scorDimensjoner", "kostnadsanslag"],
      },
      tiltak: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 3,
        description: "Tre tiltak, rangert etter effekt på eksponeringsgapet.",
      },
      usikkerheter: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 3,
        description: "De tre viktigste usikkerhetene som må verifiseres.",
      },
    },
    required: ["illustrativtEksempel", "trinn1", "trinn2", "trinn3", "trinn4", "tiltak", "usikkerheter"],
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

export interface DisruptionAnalysisInput {
  title: string;
  sourceName: string;
  articleText: string;
}

export async function analyzeDisruption(
  input: DisruptionAnalysisInput,
): Promise<DisruptionAnalysisResult> {
  const anthropic = getClient();

  const userMessage = [
    `Artikkeltittel: ${input.title}`,
    `Kilde: ${input.sourceName}`,
    `Artikkeltekst:`,
    input.articleText.slice(0, 12000),
  ].join("\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    tools: [DISRUPTION_TOOL],
    tool_choice: { type: "tool", name: "return_analysis" },
    messages: [{ role: "user", content: userMessage }],
  });

  // The four-step reasoning is verbose enough that a low max_tokens can
  // truncate the tool call mid-object — Claude then returns a partial
  // input (e.g. trinn1-3 present, trinn4/tiltak/usikkerheter missing)
  // instead of erroring. stop_reason "max_tokens" is the reliable signal
  // for that, not just "did toolUse exist" (parsed JSON.parse can still
  // succeed on structurally-valid-but-incomplete-required-fields input
  // since Anthropic's tool-input parser doesn't enforce `required`).
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "Claude sitt svar ble kuttet av (for mange tokens) — analysen er ufullstendig",
    );
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Claude returnerte ikke en strukturert forstyrrelsesanalyse");
  }

  const result = toolUse.input as Partial<DisruptionAnalysisResult>;
  if (
    !result.illustrativtEksempel ||
    !result.trinn1 ||
    !result.trinn2 ||
    !result.trinn3 ||
    !result.trinn4 ||
    !result.tiltak ||
    !result.usikkerheter
  ) {
    throw new Error("Claude returnerte en ufullstendig forstyrrelsesanalyse");
  }

  return result as DisruptionAnalysisResult;
}
