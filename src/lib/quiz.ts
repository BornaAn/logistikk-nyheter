import { concepts, type Concept } from "./concepts";

export interface QuizQuestion {
  conceptSlug: string;
  /** How to read `prompt`: "definition" asks what a named concept means
   * (options are definitions); "situation" describes a scenario and asks
   * which concept it illustrates (options are concept names) — harder,
   * since it takes recognizing the concept in a situation rather than
   * matching a name to its dictionary definition. */
  kind: "definition" | "situation";
  prompt: string;
  options: string[];
  correctIndex: number;
  scenario: string;
}

/** Short invented-but-realistic situations that illustrate each concept in
 * action, used for "situation" questions ("which concept describes this?").
 * Deliberately don't name the concept — that's what's being guessed. */
const CONCEPT_EXAMPLES: Record<string, string> = {
  tidsserieanalyse:
    "Et transportselskap plotter ukentlige fraktvolumer for de siste tre årene for å se etter et gjentakende mønster før jul.",
  prognosemodell:
    "Et lager bruker historiske salgstall til å beregne hvor mange paller de bør bestille inn til neste måned.",
  "bullwhip-effekten":
    "En butikk bestiller litt ekstra for sikkerhets skyld. Grossisten ser økt etterspørsel og dobler sin bestilling til fabrikken, som igjen tredobler produksjonen.",
  "monte-carlo-simulering":
    "Et rederi kjører tusenvis av simulerte scenarioer med tilfeldige forsinkelser for å anslå sannsynligheten for at et skip ankommer for sent.",
  "digital-tvilling":
    "Et logistikksenter tester en ny bemanningsplan i en virtuell kopi av lageret før den innføres i den faktiske driften.",
  kapasitetsanalyse:
    "En terminal kartlegger hvor mange containere kranene faktisk klarer å håndtere per time, for å finne ut hvor flaskehalsen ligger.",
  kpi: "Ledelsen følger med på leveringspresisjonen hver uke som et fast tall for å vurdere om driften går bra.",
  dashboard: "Driftslederen ser status for alle biler, ordre og avvik samlet på én skjerm i sanntid.",
  beslutningsstottesystem:
    "Et system samler data fra flere kilder og foreslår automatisk hvilken rute som bør velges i dag.",
  "balanced-scorecard":
    "Ledelsen følger opp ikke bare økonomiske tall, men også kundetilfredshet, interne prosesser og medarbeiderutvikling i samme rapport.",
  "ledende-og-etterslepende-indikatorer":
    "Et selskap ser at ordreinngangen stiger denne uken, og forventer at omsetningen vil vise det samme om noen måneder.",
  "ledetid-og-syklustid":
    "En kunde vil vite hvor lang tid det tar fra bestillingen legges til varen faktisk er levert på døren.",
  maskinlaering:
    "Et system lærer å kjenne igjen mønstre i tidligere leveranser for å forutsi hvilke ordre som mest sannsynlig blir forsinket.",
  "regresjon-klassifikasjon":
    "En modell skal enten anslå den nøyaktige fraktprisen i kroner, eller bare avgjøre om forsendelsen blir forsinket eller ikke.",
  "nevrale-nettverk":
    "Et system med mange lag av kunstige noder lærer å gjenkjenne skadede pakker på bilder fra lagerets kameraer.",
  nlp: "Et system leser gjennom tusenvis av kundeklager automatisk for å finne ut hvilke ord som går igjen oftest.",
  "anomali-deteksjon":
    "Et overvåkingssystem varsler automatisk når en forsendelse plutselig tar en helt uvanlig rute sammenlignet med tidligere leveranser.",
  api: "To ulike systemer, ett hos rederiet og ett hos speditøren, utveksler sporingsdata automatisk uten at noen taster inn tall manuelt.",
  sanntidsdata: "Sjåføren ser nøyaktig hvor lastebilen befinner seg akkurat nå, ikke bare hvor den var i går.",
  datakvalitet:
    "Før tallene brukes i en analyse, sjekker teamet at adressene er riktig skrevet og at ingen datofelt mangler.",
  "sky-og-dataplattformer":
    "Flere avdelinger lagrer og henter data fra samme sentrale, skybaserte system i stedet for hver sin lokale database.",
  "statistisk-prosesskontroll":
    "En fabrikk følger et kontrollkart som varsler automatisk hvis en måling beveger seg utenfor det normale variasjonsområdet.",
  "six-sigma": "Et team bruker et strukturert dataprogram for å redusere antall feilleveranser fra 3 % til under 1 %.",
  "risiko-og-resiliens":
    "Etter en lang periode med forsinkelser bygger selskapet opp ekstra buffer og alternative leverandører for å tåle neste forstyrrelse bedre.",
  "black-swan-hendelse":
    "En global hendelse ingen så komme stenger en hel handelsrute i flere uker og overrasker alle risikomodellene.",
  dmaic:
    "Et team definerer problemet, måler dagens tilstand, finner årsaken, tester et tiltak og følger opp at forbedringen faktisk holder seg over tid.",
  risikomatrise:
    "Risikoene plottes i et rutenett etter hvor sannsynlige og hvor alvorlige de er, slik at de mest kritiske skiller seg tydelig ut.",
  fmea: "Før en ny prosess innføres, går teamet gjennom alle måtene den kan feile på og hvor alvorlige konsekvensene ville vært.",
  "bow-tie-analyse":
    "En uønsket hendelse tegnes i midten av et diagram, med årsaker på den ene siden og konsekvenser på den andre, sammen med barrierene som skal stoppe dem.",
  rotarsaksanalyse:
    "I stedet for å bare fikse symptomet, spør teamet «hvorfor» gjentatte ganger til de finner den egentlige årsaken til problemet.",
  "beslutningstre-og-forventet-verdi":
    "Et team kartlegger alle mulige utfall og sannsynlighetene for hver av dem for å regne ut hvilket valg som gir best resultat i gjennomsnitt.",
  "digital-transformasjon":
    "Et selskap endrer ikke bare hvilke verktøy de bruker, men også hvordan hele organisasjonen jobber, etter å ha tatt i bruk ny teknologi.",
  "konkurransefortrinn-gjennom-data":
    "En virksomhet klarer å tilby raskere og mer presise leveranser enn konkurrentene fordi de utnytter dataene sine bedre.",
  "baerekraft-og-teknologi":
    "Et selskap bruker data til å planlegge ruter som både reduserer utslipp og holder kostnadene nede.",
  "etikk-og-ai":
    "Et team stiller spørsmål ved om en automatisert modell favoriserer bestemte leverandører uten at noen egentlig hadde tenkt over det.",
  "autonome-forsyningskjeder":
    "Et system justerer automatisk bestillinger og ruter basert på sanntidsdata, uten at et menneske må godkjenne hvert eneste steg.",
  "operasjonelle-trade-offs":
    "Å love raskere levering betyr at selskapet må gi litt slipp på hvor lavt de kan holde kostnadene.",
  "operasjonelle-konkurranseprioriteringer":
    "En bedrift bestemmer seg bevisst for å konkurrere på pålitelighet fremfor pris, og bygger driften rundt det.",
  "lokal-optimalisering":
    "Ett lager kutter egne kostnader ved å redusere bufferlager, men gjør dermed hele forsyningskjeden mer sårbar for forsinkelser.",
  silotenkning:
    "To avdelinger jobber mot samme mål, men deler ikke informasjon med hverandre og ender opp med motstridende planer.",
  pdca: "Et team planlegger et tiltak, prøver det ut, sjekker om det faktisk virket, og justerer rutinen før de går videre til neste forbedring.",
  obeya: "Et tverrfaglig team samles rundt tavler i et felles rom for å diskutere status, avvik og tiltak sammen.",
  "visuell-styring":
    "Status og avvik vises åpent på en tavle for alle å se, i stedet for å ligge gjemt i en rapport bare lederen leser.",
  dsrp: "Et team stopper opp og spør hva problemet egentlig er, hvordan delene henger sammen, og hvilke andre perspektiver som mangler før de konkluderer.",
  "a3-metodikk":
    "Hele problemstillingen, analysen og tiltaket samles på én enkelt side for å tvinge frem klarhet fremfor lange rapporter.",
  verdistromsanalyse:
    "Et team kartlegger alle stegene en vare går gjennom for å finne ut hvor det faktisk skapes verdi og hvor det bare er venting.",
};

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

function pickDecoys(exclude: Concept, pool: Concept[], rand: () => number): Concept[] {
  // Falls back to the full glossary if the pool is too thin for 3 distinct
  // wrong answers (shouldn't happen with the current course pools, but a
  // quiz breaking because a pool is one concept short is worse than a
  // decoy occasionally coming from outside the course).
  const candidates = pool.filter((c) => c.slug !== exclude.slug);
  const source = candidates.length >= 3 ? candidates : concepts.filter((c) => c.slug !== exclude.slug);
  return seededShuffle(source, rand).slice(0, 3);
}

function buildDefinitionQuestion(
  concept: Concept,
  pool: Concept[],
  rand: () => number,
): Omit<QuizQuestion, "scenario"> {
  const decoys = pickDecoys(concept, pool, rand);
  const correctText = concept.definition;
  const options = seededShuffle([correctText, ...decoys.map((d) => d.definition)], rand);
  return {
    conceptSlug: concept.slug,
    kind: "definition",
    prompt: concept.name,
    options,
    correctIndex: options.indexOf(correctText),
  };
}

function buildSituationQuestion(
  concept: Concept,
  pool: Concept[],
  rand: () => number,
): Omit<QuizQuestion, "scenario"> {
  const decoys = pickDecoys(concept, pool, rand);
  const correctText = concept.name;
  const options = seededShuffle([correctText, ...decoys.map((d) => d.name)], rand);
  return {
    conceptSlug: concept.slug,
    kind: "situation",
    prompt: CONCEPT_EXAMPLES[concept.slug] ?? concept.definition,
    options,
    correctIndex: options.indexOf(correctText),
  };
}

/** `count` questions, same for every visitor who shares the same
 * `seedKey` — different visitors on the same day get the identical round,
 * different days (or weeks, depending on what `seedKey` encodes) get a
 * different one. Mixes "what does X mean" and the harder "which concept is
 * this?" question types — the latter only for concepts with a written
 * example scenario.
 *
 * `pool` narrows which concepts the round draws from (e.g. one course's
 * pensum so far this semester) — defaults to the full glossary for the
 * general quiz. `poolKey` folds into the seed alongside `seedKey` so the
 * general/ØAL121/ØAL118 rounds are independent puzzles, not the same five
 * concepts re-skinned three times.
 *
 * `seedKey` is deliberately just a string, not always "today's date": the
 * general round re-seeds daily (pass `todaysDateKey()`) so it reads as a
 * fresh daily trivia drop, but the course-specific rounds re-seed weekly
 * (pass `currentIsoWeekKey()`) so a student gets the *same* five questions
 * all week to actually practice and repeat, not a new random five each day
 * that never lets an answer sink in. */
export function getDailyChallenge(
  seedKey: string,
  count = 5,
  pool: Concept[] = concepts,
  poolKey = "generell",
): QuizQuestion[] {
  const seed = `${seedKey}-${poolKey}`;
  const rand = seededRandom(seed);
  const n = Math.min(count, pool.length);
  const chosen = seededShuffle(pool, rand).slice(0, n);
  const scenarios = seededShuffle(BOTTLENECK_SCENARIOS, rand).slice(0, n);

  return chosen.map((concept, i) => {
    const useSituation = Boolean(CONCEPT_EXAMPLES[concept.slug]) && rand() < 0.5;
    const question = useSituation
      ? buildSituationQuestion(concept, pool, rand)
      : buildDefinitionQuestion(concept, pool, rand);
    return { ...question, scenario: scenarios[i] };
  });
}

export function todaysDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}
