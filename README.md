# Logistikknyheter

En egen nyhetsside som samler og oppsummerer saker fra logistikk-, shipping-,
trucking- og forsyningskjede-kilder. Sakene hentes automatisk fra RSS,
artikkelteksten trekkes ut, og [Claude](https://www.anthropic.com/claude)
skriver et faktabasert norsk sammendrag som vises direkte i feeden — ikke
bare tittel og lenke.

## Hvordan det henger sammen

```
cron (/api/cron, hvert 30. min)
  → henter RSS for hver kilde i src/lib/sources.ts
  → hopper over URL-er som allerede finnes (dedup)
  → scraper artikkelsiden og trekker ut hovedteksten (@extractus/article-extractor)
  → lagrer artikkelen med summaryStatus "pending"
  → sender ventende artikler til Claude for sammendrag + kategori
  → lagrer resultatet, markerer "done" eller "failed"

forsiden (src/app/page.tsx)
  → viser kun artikler som har fått et ferdig AI-sammendrag
  → filter på kategori/kilde + søk går via URL-parametre
```

Databasen (Postgres via Prisma, hostet på Vercel/Neon) har to tabeller:
`Article` (selve sakene) og `FetchLog` (én rad per cron-kjøring, til
feilsøking). Lokal utvikling og produksjon bruker samme database — enklest
for et lite prosjekt som dette, men det betyr at lokale testkjøringer også
skriver til den samme databasen som vises på den offentlige siden. Vil du
ha en egen database til lokal utvikling, opprett en ny gratis Neon/Vercel
Postgres-database og bruk den `DATABASE_URL`-en lokalt i stedet.

## Kom i gang lokalt

Krever Node.js 20+.

```bash
npm install
cp .env.example .env
```

Fyll inn i `.env`:
- `DATABASE_URL` — Postgres-tilkoblingsstrengen (samme som i Vercel, se
  Storage-fanen i prosjektet, eller en egen dev-database)
- `ANTHROPIC_API_KEY` — nøkkel fra [console.anthropic.com](https://console.anthropic.com/)
- `CRON_SECRET` — valgfri lokalt (la stå tom), men sett en verdi før du deployer

```bash
npx prisma migrate dev   # oppretter tabellene i databasen (kun nødvendig første gang / ved skjemaendringer)
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000). Siden er tom til
innhentingsjobben har kjørt minst én gang:

```bash
curl http://localhost:3000/api/cron
```

Kjør den samme kommandoen på nytt når som helst for å hente nye saker —
allerede lagrede artikler (samme `articleUrl`) blir aldri hentet eller
oppsummert to ganger.

## Deploy (gratis Vercel Hobby-plan, én kjøring i døgnet)

`vercel.json` kjører `/api/cron` én gang daglig, kl. 05:00 UTC
(≈ 06–07 norsk tid), som passer innenfor Hobby-planens gratis cron-kvote.

### Steg 1: GitHub

1. Opprett konto på [github.com](https://github.com) hvis du ikke har en.
2. Opprett et nytt, tomt repo (**ikke** kryss av for README/gitignore/license
   — de finnes allerede her): New repository → gi det et navn, f.eks.
   `logistikk-nyheter` → Create repository.
3. Kopier URL-en GitHub viser deg (`https://github.com/<brukernavn>/<repo>.git`)
   og send den til meg — da gjør jeg `git remote add` + `git push` for deg.

### Steg 2: Database (Postgres)

SQLite-filen lever på et engangs-filsystem i Vercel sine
serverless-funksjoner og overlever ikke mellom kjøringer, så du trenger en
ekte hostet database. Enklest siden du uansett oppretter Vercel-konto:

1. Gå til [vercel.com](https://vercel.com) → opprett konto (kan gjøre det med
   "Continue with GitHub" — kobler begge kontoene i samme steg).
2. Opprett prosjektet ved å importere GitHub-repoet du lagde i steg 1
   (Add New → Project → velg repoet).
3. Under prosjektets **Storage**-fane: Create Database → Postgres (drives av
   Neon, gratis nivå er mer enn nok her). Koble den til prosjektet — Vercel
   setter da `DATABASE_URL` automatisk som miljøvariabel.

`build`-scriptet i `package.json` kjører `prisma migrate deploy` før
`next build` ved hver deploy, så nye databasetabeller/-endringer ruller ut
automatisk uten manuelle steg.

*(Alternativ: [Supabase](https://supabase.com/) hvis du heller vil ha
databasen hos en annen leverandør enn Vercel — samme fremgangsmåte, bare at
du limer connection-stringen inn som `DATABASE_URL` manuelt.)*

### Steg 3: Miljøvariabler i Vercel

I prosjektets Settings → Environment Variables, legg til:
- `ANTHROPIC_API_KEY` — samme nøkkel som i din lokale `.env`
- `CRON_SECRET` — en tilfeldig verdi, f.eks. generert med
  `openssl rand -hex 32`
- `DATABASE_URL` — settes automatisk hvis du brukte Vercel Postgres i steg 2

### Steg 4: Deploy

Vercel deployer automatisk ved hver push til `main`. Etter første deploy kan
du besøke prosjektets `.vercel.app`-URL — og fra da av kjører innhentingen
helt automatisk hvert døgn, uten at du trenger å gjøre noe.

### Viktig å vite om gratisplanen

- **Én kjøring i døgnet** betyr at jobben har et fast tak på antall nye
  artikler og sammendrag den rekker per kjøring (`MAX_NEW_ARTICLES_PER_RUN` /
  `MAX_SUMMARIES_PER_RUN` i [`src/lib/ingest.ts`](src/lib/ingest.ts), satt til
  60/60). Med 14 aktive kilder kan det i perioder komme mer enn 60 nye saker
  på ett døgn, og da henger jobben litt etter til neste dag tar resten. Vil
  du ha alt med samme dag, er neste steg enten å øke grensene enda mer
  (risikerer å treffe Vercel sin function-tidsgrense) eller gå til Vercel
  Pro med hyppigere cron.
- Alle allerede lagrede artikler (samme `articleUrl`) hentes eller
  oppsummeres aldri på nytt, uansett hvor sjelden jobben kjører.
- Innhentingen går i rundgang mellom kildene (ett kandidatforslag fra hver
  kilde om gangen, ikke én kilde fullstendig ferdig før neste) slik at en
  kilde med mye trafikk (f.eks. FreightWaves) ikke spiser opp hele dagens
  kvote før andre kilder rekker å bidra.

## Kilder

Full liste i [`src/lib/sources.ts`](src/lib/sources.ts). Feed-URL-ene er
verifisert direkte (ikke gjettet) ved å hente feeden og sjekke at den
faktisk returnerer gyldig XML.

**Aktive (bekreftet RSS), 32 kilder:** FreightWaves, Journal of Commerce,
Supply Chain Dive, Transport Topics, Supply Chain Brain, Inbound Logistics,
The Loadstar, gCaptain, Splash247, Tungt.no, NHO Logistikk og Transport,
Transport & Logistikk, Logistikkforeningen, Financial Times
(transport-seksjonen), Maritime Bergen, Norges Lastebileier-Forbund (NLF),
Statens vegvesen, Kystverket, Sjøfartsdirektoratet, World Trade Organization
(WTO), SSB (Utenriksøkonomi), Bergensavisen, Bergens Tidende (Økonomi),
TradeWinds, Logistikk Inside, MTLogistikk, Bloomberg, Freightos,
Dagens Næringsliv (DN), Aftenposten (Økonomi), Avinor, Innovasjon Norge.

**Pluss 3 kilder uten RSS i det hele tatt, hentet med egne scrapere** (se
"Markedsindekser og statistikk" lenger ned): Drewry World Container Index,
Xeneta, ISM (Institute for Supply Management).

TradeWinds, Logistikk Inside, MTLogistikk og Bloomberg ble gjenfunnet ved
en ny, grundigere verifiseringsrunde — alle fire var tidligere merket
"ingen RSS funnet" fordi feeden ikke lå på et vanlig sted: TradeWinds sin
ligger på et eget `services.`-subdomene (funnet i forsidens
JSON-navigasjon, ikke lenket noe sted), Logistikk Inside og MTLogistikk
kjører Labrador CMS og krever `?lab_viewport=rss` som parameter, og
Bloomberg sin hovedside er Cloudflare-blokkert men et eget
`feeds.bloomberg.com`-subdomene serverer åpne feeds. Bloomberg er
nøkkelordfiltrert (se under) siden det er generelt nyhetsstoff. Freightos
ble funnet under research på markedsindekser (se under) og hadde, litt
overraskende, en helt vanlig WordPress-RSS hele tiden.

Bergensavisen og Bergens Tidende er bevisst brede (se egen seksjon lenger
ned) — slått på etter eksplisitt ønske fra brukeren om at bredere regional
dekning er greit selv uten nøkkelordfiltrering, men nøkkelordfiltrert for
å luke ut konsertdatoer, sport og krim. DN og Aftenposten (Økonomi) er
derimot rene næringslivspublikasjoner og trenger ikke samme filter.

De elleve foregående ble lagt til etter en kildeliste fra faglærer i et av
studieemnene dette bygges for (2026-09-03). Kystverket og Sjøfartsdirektoratet
har ingen egen RSS på sine egne nettsider — feeden er deres offisielle
pressemeldinger via NTB Kommunikasjon, filtrert på hver etats publisher-ID.
SSB har flere emne-RSS-er (`/rss/<emne>`), men de er ujevne — mange gir en
gyldig, men helt tom feed (bl.a. de mer opplagte navnene `utenrikshandel` og
`godstransport`). `utenriksokonomi` er emnet som faktisk har innhold.

Noen av disse (JOC, Supply Chain Dive, Transport Topics, Supply Chain Brain,
The Loadstar, gCaptain, Splash247, NHO LT, Maritime Bergen, NLF, Statens
vegvesen, Kystverket, Sjøfartsdirektoratet) har bare en kort ingress i selve
RSS-feeden — appen scraper alltid artikkelsiden for full tekst først, og
faller kun tilbake på den korte ingressen hvis scrapingen feiler. Financial
Times er alltid merket `limited` siden feeden bare gir en avsnitt bak
betalingsmuren.

**Ingen fungerende RSS funnet — lagt inn i `sources.ts` med `enabled: false`
slik at de er klare til å kobles på:**

| Kilde | Problem | Forslag |
|---|---|---|
| Supply Chain Digest | `<link>`-taggen peker på en feed som svarer 200 med 0 bytes (forlatt siden 2019); `/rss/` gir nå 403 | Custom scraper med cheerio, eller rss.app |
| Supply Chain 24/7 | Hele siden bak Cloudflare-botsjekk | RSSHub-instans eller rss.app |
| Lloyd's List | Betalingsmur — `/rss-feeds`-siden krever abonnent-SSO-innlogging for å vise feed-URL-er | Manuell gjennomgang med abonnement |
| Logistikknyhetene | Domenet svarer ikke (NXDOMAIN) — ser nedlagt ut | Fjern, eller sjekk om de har flyttet domene |
| Reuters Business | Hele siden bak DataDome-botsjekk (CAPTCHA/JS-vegg), i tillegg til at Reuters la ned offentlig RSS for flere år siden | RSSHub, eller dropp kilden |
| Bergen og Omland havnevesen | Nuxt-app uten RSS-autodiscovery, ingen vanlig feed-sti virker | Custom scraper |
| Vestland fylkeskommune | Ingen RSS-autodiscovery, gjettede feed-stier gir feilside | Custom scraper |
| GCE Ocean Technology | Ingen RSS-autodiscovery, vanlige mønstre gir 404 | Custom scraper |
| UNCTAD | Nettsiden er bak en interaktiv Cloudflare-sjekk ("er du et menneske?") — dette er bot-beskyttelse jeg bevisst ikke prøver å omgå | Sjekk manuelt i nettleser, eller RSSHub |
| OECD | Hadde RSS tidligere (`/newsroom/index.xml`), men den redirecter nå til HTML — ser ut til å være fjernet ved siste redesign | RSSHub, eller dropp kilden |
| Oslo Havn | Episerver/Optimizely uten RSS-modul, ingen vanlig feed-sti virker | Custom scraper |
| Oslo kommune / Bymiljøetaten | Gammel WordPress-nyhetsrom (nyhetsrom.bymiljoetaten.no) er nå NXDOMAIN — nedlagt/flyttet inn i oslo.kommune.no, som ikke har RSS | Custom scraper hvis relevant innhold finnes et annet sted på oslo.kommune.no |
| Norges Rederiforbund | Ingen RSS-autodiscovery, vanlige mønstre gir 404 | Custom scraper |
| E24 | Har fungerende RSS (`e24.no/rss`), men feedens egen `<description>` forbyr bruk til LLM-trening/tekst- og datautvinning uten skriftlig tillatelse — respektert, holdt avslått | Spør E24 om skriftlig tillatelse |

### Bevisst brede kilder — og nøkkelordfiltrering

Prosjektet startet med en streng regel: en generell nyhetskilde (hele
forsiden, ikke en egen bransje-seksjon) ble holdt utenfor med mindre den
kunne avgrenses, for å unngå at siden drukner i irrelevant stoff. Etter
eksplisitt ønske fra brukeren om at bredere dekning er greit — men *ikke*
konsertdatoer og sport — fikk kilder markert `keywordFilter: true` i
[`src/lib/sources.ts`](src/lib/sources.ts) et eget filtreringssteg
(`KEYWORD_FILTER`, en liste norske/engelske transport-/handels-/
økonomiord) som luker ut alt som ikke treffer, *før* noe hentes ut eller
sendes til Claude:

- **Bergensavisen** — kun forside-RSS, ingen næringsliv-seksjon.
  Nøkkelordfiltrert: 15 saker i feeden ga 2 igjen ved test (konsertdatoer,
  en matvaretilbakekalling og en sykehussak luket ut; en drivstoffpris-sak
  beholdt).
- **Bergens Tidende (Økonomi)** — "økonomi"-scoped feed, men dekker
  generell regional næringslivsdekning (boligpriser m.m.), ikke spesifikt
  logistikk/transport. Samme filter, samme effekt (25 → 2 ved test).
- **Bloomberg** — hovedsiden er Cloudflare-blokkert (se over), feeden som
  faktisk virker er "industries"-varianten, fortsatt bredt nok til å
  trenge filteret (20 → 3 ved test).

**DN og Aftenposten (Økonomi) har ikke filteret** — begge er rene
næringslivspublikasjoner der praktisk talt alt innhold allerede er
relevant, så et transport-spesifikt nøkkelordfilter ville kuttet bort for
mye ekte næringslivsstoff.

## Markedsindekser og statistikk

Utover RSS-kilder henter [`src/lib/scrapers.ts`](src/lib/scrapers.ts) også
inn kommentartekst fra tre markedsindekser som ikke har RSS i det hele
tatt, men som publiserer ekte, offentlig lesbar analysetekst — ikke bare
tall bak betalingsmur. Hver "scraper" returnerer data i nøyaktig samme
form som en RSS-kilde ville gjort, så resten av rørledningen (dedup,
uttrekk, Claude-oppsummering, `sufficientContent`-sjekken) trenger ikke
vite forskjellen:

- **Drewry World Container Index** — samme URL oppdateres i ny hver
  torsdag under overskriften "Our detailed assessment for [dato]",
  etterfulgt av en punktliste. Siden det ikke finnes en egen lenke per
  ukes oppdatering, bygger scraperen en syntetisk URL med datoen som
  fragment (`...#wci-2026-08-27`) for å skille ukene fra hverandre i
  databasen — fragmentet ignoreres av nettleseren, så "Les hele saken"
  åpner fortsatt riktig, nåværende side.
- **Xeneta** — nyhetslisten på `/news` har et maskinlesbart
  `data-sort`-tidsstempel på hver oppføring (mer pålitelig enn å tolke
  datoformatet i URL-slug-en, som varierer: `16.7.2026`, `21.08.26`,
  `6.8.2026`...). Hver ukentlige oppdatering har sin egen ekte lenke, og
  den vanlige artikkel-uthentingen fungerer fint på selve saken.
- **ISM (Institute for Supply Management)** — `ismworld.org` krever
  abonnent-innlogging for selve rapportene, men PR Newswire speiler hele
  pressemeldingen (inkl. hele sitatet fra styrelederen) uten betalingsmur.
  Henter kun Manufacturing PMI og Services PMI fra nyhetsrom-listen deres,
  filtrert bort fra andre ISM-kunngjøringer.

Alle tre ble verifisert direkte mot faktisk HTML-struktur (ikke antatt)
før koden ble skrevet — se commit-historikken for detaljene som ble
funnet på hver side.

**Vurdert, men ikke bygget scraper for ennå** (dokumentert i
`sources.ts` med grunn):

| Kilde | Hvorfor ikke (ennå) |
|---|---|
| Kiel Trade Indicator | Ekte og offentlig, men uklar nåværende publiseringskadence — fant ingen Trade Indicator-spesifikk sak i de siste ~3 månedene med nyhetsoppføringer |
| Global Supply Chain Pressure Index (NY Fed) | Offentlig og månedlig, men innholdet er en kort databeskrivelse (2 setninger), ikke en artikkel |
| Baltic Dry Index | Selve indeksen er bak betalingsmur; Trading Economics har korte, generiske daglige notiser uten permalink per notis |
| S&P Global PMI | Ugjennomsiktige GUID-URL-er uten offentlig oversiktsside, PDF-format, og direkte HTTP-henting ga 403 (bot-beskyttelse) |

## Sammendrag og kategorisering (Claude)

`src/lib/summarize.ts` sender uthentet artikkeltekst til Claude
(`claude-sonnet-5`) med en norsk systemprompt som krever 4–8 setninger i
egne ord, konkrete fakta, og en kategori fra listen: `shipping`, `trucking`,
`lager_forsyningskjede`, `norge`, `globalt_geopolitikk`. Svaret hentes ut
strukturert via tool-calling, ikke ved å parse fritekst.

Kostnadskontroll: maks 60 sammendrag per cron-kjøring, og artikler eldre enn
7 dager blir aldri sendt til sammendrag (bare lagret rått med
`summaryStatus: "pending"` for alltid — de vises ikke i UI siden UI kun
viser artikler med et ferdig sammendrag).

### Kjent svakhet: sammendrag kan i sjeldne tilfeller beskrive feil sak

Automatisk uthenting av artikkeltekst fra nettsider feiler av og til på en
måte som ikke gir en åpenbar feilmelding — spesielt på betalingsmur-sider.
Ett bekreftet tilfelle: på JOC sine artikkelsider plukket
uthentingsbiblioteket konsekvent opp en "relaterte saker"-boks i stedet for
selve (tynne, bak betalingsmur) artikkelteksten, slik at sammendraget
beskrev en helt annen sak enn overskriften antydet.

Tre lag med forsvar mot dette (lagt til etter at et slikt tilfelle ble
oppdaget i produksjon):
1. [`src/lib/extract.ts`](src/lib/extract.ts) sjekker at den uthentede
   teksten faktisk deler minst ett betydningsfullt ord med artikkelens egen
   tittel, og forkaster kjente betalingsmur-/innloggingsmeldinger — begge
   tilfeller faller tilbake til kildens egen RSS-beskrivelse i stedet.
2. Claude får eksplisitt beskjed om aldri å dikte opp fakta utover det som
   faktisk står i teksten, og returnerer et eget `sufficientContent`-flagg
   den selv setter til `false` hvis teksten ikke stemmer med tittelen eller
   er for tynn til å oppsummeres pålitelig.
3. Når `sufficientContent` er `false`, publiseres saken aldri —
   `summaryStatus` settes til `failed` i stedet for at et upålitelig
   sammendrag vises.

Dette reduserer risikoen betydelig, men elimerer den ikke helt — en
uthentingsfeil kan i prinsippet fortsatt snike seg forbi begge sjekkene.
**Bruk derfor siden som en inngangsport til sakene, ikke som eneste kilde —
klikk deg videre til "Les hele saken hos [kilde]" før du bygger et argument
på noe du har lest i et sammendrag her.**

## Juridisk

Rå utdrag (`rawExcerpt`) lagres kun for intern bruk/debugging og vises
aldri i grensesnittet — kun det AI-genererte sammendraget vises, sammen med
en lenke til originalartikkelen. Kilder uten full tekst (betalingsmur eller
mislykket scraping) merkes tydelig med "Sammendrag basert på begrenset
utdrag".

## Ikke bygget ennå (stretch goals fra kravspesifikasjonen)

- E-post/Slack-varsling ved viktige nyheter
- "Ukens viktigste" — automatisk ukesoppsummering
- Egen RSS-eksport av den aggregerte feeden
