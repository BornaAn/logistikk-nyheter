/**
 * Curated glossary of data-science-in-SCM concepts, sourced from the
 * course compendium (ØAL121, HVL). Claude picks 0-3 of these per article
 * during summarization and explains why each one is relevant to that
 * specific story — grounded to this fixed list so it never invents terms
 * or drifts from what the course actually teaches.
 *
 * Kept in code (like sources.ts/scrapers.ts) rather than the database:
 * these are curated/reviewed definitions, not something readers edit.
 */

export type ConceptCategory =
  | "prognoser_simulering"
  | "kpi_styring"
  | "maskinlaering_ai"
  | "data_infrastruktur"
  | "risiko_kvalitet"
  | "strategi_organisasjon"
  | "lean_og_forbedring";

export interface Concept {
  slug: string;
  name: string;
  category: ConceptCategory;
  definition: string;
}

export const CONCEPT_CATEGORY_LABELS: Record<ConceptCategory, string> = {
  prognoser_simulering: "Prognoser og simulering",
  kpi_styring: "KPI og styring",
  maskinlaering_ai: "Maskinlæring og AI",
  data_infrastruktur: "Data og infrastruktur",
  risiko_kvalitet: "Risiko og kvalitet",
  strategi_organisasjon: "Strategi og organisasjon",
  lean_og_forbedring: "Lean og kontinuerlig forbedring",
};

export const concepts: Concept[] = [
  // --- Prognoser og simulering ---------------------------------------
  {
    slug: "tidsserieanalyse",
    name: "Tidsserieanalyse",
    category: "prognoser_simulering",
    definition:
      "Analyse av data samlet inn over tid (f.eks. ukentlige fraktrater eller månedlig etterspørsel) for å identifisere trender, sesongmønstre og avvik. Grunnlaget for å forstå hvordan noe har utviklet seg før man prøver å forutsi hvor det er på vei.",
  },
  {
    slug: "prognosemodell",
    name: "Prognosemodell",
    category: "prognoser_simulering",
    definition:
      "En modell som bruker historiske data til å forutsi fremtidige verdier — f.eks. forventet etterspørsel, fraktrater eller kapasitetsbehov. Kjernen i datadrevet planlegging i forsyningskjeder.",
  },
  {
    slug: "monte-carlo-simulering",
    name: "Monte Carlo-simulering",
    category: "prognoser_simulering",
    definition:
      "En metode som simulerer tusenvis av tilfeldige utfall (basert på sannsynlighetsfordelinger) for å forstå spennet av mulige resultater under usikkerhet — brukes f.eks. til å anslå risikoen for forsinkelser eller kostnadsoverskridelser i en forsyningskjede.",
  },
  {
    slug: "digital-tvilling",
    name: "Digital tvilling",
    category: "prognoser_simulering",
    definition:
      "En virtuell, sanntidsoppdatert modell av et fysisk system (f.eks. et lager, en havn eller en hel forsyningskjede) som kan brukes til å teste scenarioer og endringer uten å røre den ekte driften.",
  },
  {
    slug: "kapasitetsanalyse",
    name: "Kapasitetsstyring / kapasitetsanalyse",
    category: "prognoser_simulering",
    definition:
      "Å analysere og planlegge hvor mye en ressurs (skip, lager, transportnettverk) faktisk kan håndtere, og identifisere flaskehalser som begrenser gjennomstrømningen.",
  },

  // --- KPI og styring ---------------------------------------------------
  {
    slug: "kpi",
    name: "KPI (Key Performance Indicator)",
    category: "kpi_styring",
    definition:
      "Et konkret, målbart nøkkeltall brukt til å følge hvor godt en operasjon presterer mot et mål — f.eks. leveringspresisjon, lageromløpshastighet eller kapasitetsutnyttelse.",
  },
  {
    slug: "dashboard",
    name: "Dashboard",
    category: "kpi_styring",
    definition:
      "Et visuelt grensesnitt som samler flere KPI-er og datakilder på ett sted i sanntid, slik at beslutningstakere kan se status og avvik uten å grave i rådata selv.",
  },
  {
    slug: "beslutningsstottesystem",
    name: "Beslutningsstøttesystem",
    category: "kpi_styring",
    definition:
      "Et system som samler data, analyse og visualisering for å hjelpe mennesker ta bedre og raskere beslutninger — broen mellom rå analyse og faktisk handling i en organisasjon.",
  },

  // --- Maskinlæring og AI -----------------------------------------------
  {
    slug: "maskinlaering",
    name: "Maskinlæring",
    category: "maskinlaering_ai",
    definition:
      "Metoder der en modell lærer mønstre direkte fra data i stedet for å følge manuelt programmerte regler — brukes i forsyningskjeder til f.eks. etterspørselsprognoser, ruteoptimalisering og risikovurdering.",
  },
  {
    slug: "regresjon-klassifikasjon",
    name: "Regresjon og klassifikasjon",
    category: "maskinlaering_ai",
    definition:
      "To grunnleggende typer prediksjon i maskinlæring: regresjon forutsier et tall (f.eks. forventet fraktrate), klassifikasjon forutsier en kategori (f.eks. om en forsendelse blir forsinket eller ikke).",
  },
  {
    slug: "nevrale-nettverk",
    name: "Nevrale nettverk / dyp læring",
    category: "maskinlaering_ai",
    definition:
      "Modeller inspirert av hjernens struktur, bygget opp av lag som lærer stadig mer komplekse mønstre i data. Grunnlaget for det meste av moderne bildegjenkjenning, språkmodeller og avansert prognosearbeid.",
  },
  {
    slug: "nlp",
    name: "NLP (Natural Language Processing)",
    category: "maskinlaering_ai",
    definition:
      "Teknikker for at datamaskiner skal forstå og behandle menneskelig tekst — brukes f.eks. til å analysere kundeklager, tolke tolldokumenter automatisk eller hente innsikt fra ustrukturerte rapporter.",
  },
  {
    slug: "anomali-deteksjon",
    name: "Anomali-deteksjon",
    category: "maskinlaering_ai",
    definition:
      "Statistiske eller maskinlæringsbaserte metoder for å automatisk oppdage uvanlige avvik i data — f.eks. en plutselig unormal forsinkelse, et prishopp eller mistenkelig aktivitet i en forsyningskjede — før det blir et stort problem.",
  },

  // --- Data og infrastruktur ----------------------------------------------
  {
    slug: "api",
    name: "API",
    category: "data_infrastruktur",
    definition:
      "Et grensesnitt som lar ulike systemer utveksle data automatisk og i sanntid — f.eks. henter et sporingssystem posisjonsdata direkte fra et rederis API i stedet for manuell oppdatering.",
  },
  {
    slug: "sanntidsdata",
    name: "Sanntidsdata",
    category: "data_infrastruktur",
    definition:
      "Data som oppdateres fortløpende (i motsetning til periodiske rapporter), og som gjør det mulig å reagere på hendelser i forsyningskjeden mens de skjer, ikke dagen etter.",
  },
  {
    slug: "datakvalitet",
    name: "Datakvalitet og datarensing",
    category: "data_infrastruktur",
    definition:
      "Arbeidet med å sikre at data er korrekte, komplette og konsistente før de brukes i analyse — dårlig datakvalitet gir upålitelige modeller og beslutninger, uansett hvor avansert metoden er.",
  },
  {
    slug: "sky-og-dataplattformer",
    name: "Sky- og dataplattformer",
    category: "data_infrastruktur",
    definition:
      "Skybaserte systemer (f.eks. data warehouses som Snowflake) for å lagre og prosessere store datamengder fra flere kilder samlet, som infrastrukturgrunnlag for avansert analyse på tvers av en organisasjon.",
  },

  // --- Risiko og kvalitet -------------------------------------------------
  {
    slug: "statistisk-prosesskontroll",
    name: "Statistisk prosesskontroll (SPC)",
    category: "risiko_kvalitet",
    definition:
      "Bruk av statistikk og kontrollkart til å overvåke en prosess over tid og oppdage når den beveger seg utenfor normal variasjon — et tidlig varselsystem for kvalitetsproblemer.",
  },
  {
    slug: "six-sigma",
    name: "Six Sigma",
    category: "risiko_kvalitet",
    definition:
      "Et metodisk rammeverk for kontinuerlig forbedring som bruker dataanalyse til å redusere variasjon og feil i en prosess eller forsyningskjede.",
  },
  {
    slug: "risiko-og-resiliens",
    name: "Risiko og resiliens i forsyningskjeder",
    category: "risiko_kvalitet",
    definition:
      "Evnen til å identifisere, vurdere og håndtere usikkerhet i forsyningskjeden, og bygge robusthet slik at driften tåler og raskt kommer seg etter forstyrrelser.",
  },
  {
    slug: "black-swan-hendelse",
    name: "Black Swan-hendelse",
    category: "risiko_kvalitet",
    definition:
      "En sjelden, ekstrem og vanskelig-å-forutse hendelse med stor konsekvens (f.eks. en pandemi eller en blokkert kanal) som tradisjonelle risikomodeller typisk ikke fanger opp på forhånd.",
  },
  {
    slug: "dmaic",
    name: "DMAIC (Define, Measure, Analyze, Improve, Control)",
    category: "risiko_kvalitet",
    definition:
      "Six Sigmas strukturerte femstegs forbedringsprosess: definer problemet og målet, mål dagens tilstand med data, analyser årsakene, forbedre gjennom konkrete tiltak, og kontroller/stabiliser den nye tilstanden over tid slik at forbedringen faktisk varer.",
  },
  {
    slug: "risikomatrise",
    name: "Risikomatrise",
    category: "risiko_kvalitet",
    definition:
      "Et visuelt verktøy (rutenett) som plotter risikoer etter sannsynlighet og konsekvens (risiko = sannsynlighet × konsekvens), slik at de mest kritiske risikoene — de i den røde sonen — lett kan skilles fra dem som kan vente.",
  },
  {
    slug: "fmea",
    name: "FMEA (Failure Mode and Effects Analysis)",
    category: "risiko_kvalitet",
    definition:
      "En systematisk metode for å identifisere mulige feilmåter i en prosess eller et produkt, og deres konsekvenser, FØR de faktisk skjer — slik at man kan sette inn tiltak i forkant i stedet for å reagere etterpå.",
  },
  {
    slug: "bow-tie-analyse",
    name: "Bow-tie-analyse",
    category: "risiko_kvalitet",
    definition:
      "Et risikoverktøy som visualiserer en uønsket hendelse i midten, med mulige årsaker på den ene siden og mulige konsekvenser på den andre — og hvilke barrierer/tiltak som finnes for å forhindre årsakene eller begrense konsekvensene.",
  },
  {
    slug: "rotarsaksanalyse",
    name: "Rotårsaksanalyse",
    category: "risiko_kvalitet",
    definition:
      "Å grave bak et synlig avvik eller problem for å finne den underliggende, egentlige årsaken — ikke bare symptomet — slik at forbedringstiltak treffer det som faktisk forårsaker problemet og hindrer at det gjentar seg.",
  },
  {
    slug: "beslutningstre-og-forventet-verdi",
    name: "Beslutningstre og forventet verdi",
    category: "risiko_kvalitet",
    definition:
      "En strukturert måte å analysere en beslutning under usikkerhet på: kartlegge alternativene, sannsynlighetene for ulike utfall og konsekvensene av hvert, for å komme frem til det valget som gir best forventet resultat over tid.",
  },

  // --- Strategi og organisasjon --------------------------------------------
  {
    slug: "digital-transformasjon",
    name: "Digital transformasjon",
    category: "strategi_organisasjon",
    definition:
      "Den strategiske og organisatoriske prosessen med å ta i bruk data og ny teknologi for å endre hvordan en virksomhet faktisk drives — mer enn bare å innføre nye verktøy, det krever endret arbeidsmåte og kultur.",
  },
  {
    slug: "konkurransefortrinn-gjennom-data",
    name: "Konkurransefortrinn gjennom data",
    category: "strategi_organisasjon",
    definition:
      "Tanken om at data og analysekapabilitet i seg selv kan være en strategisk ressurs som skiller en virksomhet fra konkurrentene — ikke bare et støtteverktøy, men en kilde til varig fortrinn.",
  },
  {
    slug: "baerekraft-og-teknologi",
    name: "Bærekraft og teknologi i forsyningskjeder",
    category: "strategi_organisasjon",
    definition:
      "Bruk av data og analyse til å balansere økonomiske, miljømessige og sosiale hensyn i forsyningskjeden (Triple Bottom Line) — f.eks. for å redusere utslipp eller optimalisere ressursbruk.",
  },
  {
    slug: "etikk-og-ai",
    name: "Etikk og AI",
    category: "strategi_organisasjon",
    definition:
      "Vurderinger knyttet til ansvarlig bruk av data og kunstig intelligens — bl.a. skjevheter (bias) i data og modeller, åpenhet om hvordan beslutninger tas, og hvem som står ansvarlig når en AI-modell tar feil.",
  },
  {
    slug: "autonome-forsyningskjeder",
    name: "Autonome forsyningskjeder",
    category: "strategi_organisasjon",
    definition:
      "Forsyningskjeder der AI-drevne systemer i økende grad kan overvåke, beslutte og handle selvstendig — f.eks. automatisk justere bestillinger eller ruter uten at et menneske griper inn i hvert steg.",
  },
  {
    slug: "operasjonelle-trade-offs",
    name: "Operasjonelle trade-offs",
    category: "strategi_organisasjon",
    definition:
      "Den grunnleggende avveiningen i operasjonsstrategi mellom kostnad, kvalitet, fleksibilitet og hastighet — man kan sjelden vinne på alle fire samtidig, og det å bli bedre på én dimensjon krever ofte å gi noe på en annen. Gode prosessforbedringer (f.eks. Lean) kan flytte grensen for hva som er mulig, men fjerner ikke avveiningen helt.",
  },
  {
    slug: "operasjonelle-konkurranseprioriteringer",
    name: "Operasjonelle konkurranseprioriteringer",
    category: "strategi_organisasjon",
    definition:
      "De dimensjonene (pris/kostnad, kvalitet, leveringshastighet, pålitelighet, fleksibilitet) en virksomhet bevisst velger å prioritere og konkurrere på gjennom hvordan den faktisk drives — ikke alt kan være førsteprioritet samtidig.",
  },

  // --- Lean og kontinuerlig forbedring --------------------------------------
  {
    slug: "obeya",
    name: "Obeya",
    category: "lean_og_forbedring",
    definition:
      "Japansk for \"stort rom\" — et fysisk eller digitalt visualiseringsrom (tavler, KPI-er, prosesskart, risiko og tiltak) der tverrfaglige team samles for felles situasjonsforståelse, rask problemløsning og koordinerte beslutninger. Opprinnelig fra Toyota Production System, brukt til å skape felles forståelse på tvers av en organisasjon i stedet for isolert rapportering.",
  },
  {
    slug: "visuell-styring",
    name: "Visuell styring",
    category: "lean_og_forbedring",
    definition:
      "Å gjøre status, mål og avvik synlige for alle involverte gjennom tavler/skjermer i stedet for å gjemme dem i rapporter — reduserer informasjonsasymmetri og gjør det lettere å oppdage og handle på problemer raskt, et kjerneprinsipp i Lean.",
  },
  {
    slug: "dsrp",
    name: "DSRP (systemtenkning)",
    category: "lean_og_forbedring",
    definition:
      "Et rammeverk for systemtenkning bestående av fire elementer: Distinctions (avgrense hva problemet faktisk er), Systems (forstå helhet og deler), Relationships (identifisere årsakssammenhenger) og Perspectives (inkludere flere synsvinkler) — brukes til å analysere komplekse operasjonelle problemer grundigere enn en overfladisk beskrivelse.",
  },
  {
    slug: "a3-metodikk",
    name: "A3-metodikk",
    category: "lean_og_forbedring",
    definition:
      "En strukturert Lean-tilnærming til problemløsning der hele resonnementet — problem, nåsituasjon, årsaksanalyse, mottiltak og oppfølging — samles på én side (opprinnelig et A3-ark), for å tvinge frem klarhet og felles forståelse fremfor spredt og uklar dokumentasjon.",
  },
  {
    slug: "verdistromsanalyse",
    name: "Verdistrømsanalyse (Value Stream Mapping)",
    category: "lean_og_forbedring",
    definition:
      "Kartlegging av alle steg — informasjonsflyt og materialflyt — en vare eller tjeneste går gjennom, for å synliggjøre hvor det faktisk skapes verdi og hvor det er sløsing (venting, overproduksjon, unødvendig transport, overprosessering m.m.), som grunnlag for å designe en bedre fremtidig arbeidsflyt.",
  },
];

export function findConcept(slug: string): Concept | undefined {
  return concepts.find((c) => c.slug === slug);
}
