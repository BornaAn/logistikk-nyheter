import { concepts } from "./concepts";

export interface QuizQuestion {
  conceptSlug: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  scenario: string;
}

/** Flavor text for each daily bottleneck — invented but realistic
 * logistics scenarios, not tied to any real event or article. Purely
 * narrative dressing for the quiz question that follows. */
const BOTTLENECK_SCENARIOS = [
  "Kø ved tollkontrollen på grensen legger igjen flere timers forsinkelse.",
  "Snøvær har gjort E6 vanskelig fremkommelig, og trafikken krabber avgårde.",
  "Havnearbeiderne varsler kortvarig arbeidsnedleggelse ved lasting av containerskipet.",
  "Lasterampen ved terminalen er full, og lastebilen må vente i kø.",
  "Et vogntog har fått motorstopp midt i rundkjøringen foran deg.",
  "Fergen over fjorden er innstilt på grunn av kraftig vind.",
  "Lagersystemet er nede, og varene kan ikke registreres ut før det er oppe igjen.",
  "Det er meldt om lang kø ved bomstasjonen etter en trafikkulykke lenger fremme.",
  "Sjåføren må vente på at et defekt kjølesystem i traileren blir reparert.",
  "En brygge er stengt for vedlikehold, og skipet må omdirigeres til en annen kai.",
  "Det er fullt opptatt på alle losseplasser, og bilen må sirkulere i påvente av ledig plass.",
  "Veiarbeid har redusert veien til ett kjørefelt akkurat her.",
  "Et system for automatisk portåpning ved lageret svarer ikke.",
  "Det mangler en sjåfør til neste etappe, og en avløser må rykke inn på kort varsel.",
  "Det er meldt om høy vannstand som gjør at enkelte kaier midlertidig ikke kan brukes.",
  "En kontrollstasjon har innført ekstra vekt- og lastkontroll i dag.",
  "Strømbrudd har stanset den automatiserte sorteringslinjen på terminalen.",
  "Det er meldt om is på veibanen, og fartsgrensen er midlertidig satt ned.",
  "En feilplassert container blokkerer utkjøringen fra havneterminalen.",
  "Det er lang kø ved dieselpumpen på rasteplassen der sjåføren må fylle drivstoff.",
  "Streik blant losene gjør at innseiling til havnen tar lengre tid enn normalt.",
  "GPS-systemet i lastebilen har mistet signalet, og ruten må legges om manuelt.",
  "Det er meldt om saktegående kø etter et vogntoghavari lenger fremme på motorveien.",
  "Et fly med hasteforsendelser er forsinket, og omlasting til bil må vente.",
];

/** One scenario per question in a given day's route, no repeats. */
function pickScenarios(count: number, rand: () => number): string[] {
  return seededShuffle(BOTTLENECK_SCENARIOS, rand).slice(0, count);
}

/** Deterministic PRNG seeded from a string (mulberry32) — same seed always
 * produces the same sequence, so "today's" quiz is identical for every
 * visitor without needing a database, and different every day. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** One question per concept: "what does X mean?" with the real definition
 * plus three decoy definitions drawn from other concepts. Scenario text is
 * attached afterwards, once the day's subset is picked (see
 * getDailyChallenge) — it's flavor per route position, not per concept. */
function buildQuestionPool(rand: () => number): Omit<QuizQuestion, "scenario">[] {
  return concepts.map((concept) => {
    const decoyPool = concepts.filter((c) => c.slug !== concept.slug);
    const decoys = seededShuffle(decoyPool, rand).slice(0, 3);
    const correctText = concept.definition;
    const options = seededShuffle([correctText, ...decoys.map((d) => d.definition)], rand);
    return {
      conceptSlug: concept.slug,
      prompt: concept.name,
      options,
      correctIndex: options.indexOf(correctText),
    };
  });
}

/** Today's route: `count` questions, same for every visitor on a given
 * calendar day (UTC date string as the seed), different each day. */
export function getDailyChallenge(date: Date, count = 5): QuizQuestion[] {
  const seed = date.toISOString().slice(0, 10);
  const rand = seededRandom(seed);
  const pool = buildQuestionPool(rand);
  const questions = seededShuffle(pool, rand).slice(0, count);
  const scenarios = pickScenarios(count, rand);
  return questions.map((q, i) => ({ ...q, scenario: scenarios[i] }));
}

export function todaysDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}
