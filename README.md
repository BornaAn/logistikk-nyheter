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

**Aktive (bekreftet RSS), 20 kilder:** FreightWaves, Journal of Commerce,
Supply Chain Dive, Transport Topics, Supply Chain Brain, Inbound Logistics,
The Loadstar, gCaptain, Splash247, Tungt.no, NHO Logistikk og Transport,
Transport & Logistikk, Logistikkforeningen, Financial Times
(transport-seksjonen), Maritime Bergen, Norges Lastebileier-Forbund (NLF),
Statens vegvesen, Kystverket, Sjøfartsdirektoratet, World Trade Organization
(WTO).

De seks siste ble lagt til etter en kildeliste fra faglærer i et av
studieemnene dette bygges for (2026-09-03). Kystverket og Sjøfartsdirektoratet
har ingen egen RSS på sine egne nettsider — feeden er deres offisielle
pressemeldinger via NTB Kommunikasjon, filtrert på hver etats publisher-ID.

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
| Supply Chain Digest | `<link>`-taggen peker på en feed som svarer 200 med 0 bytes (forlatt siden 2019) | Custom scraper med cheerio, eller rss.app |
| Supply Chain 24/7 | Hele siden bak Cloudflare-botsjekk | RSSHub-instans eller rss.app |
| TradeWinds | Betalingsmur, ingen RSS | Manuell gjennomgang / rss.app hvis de har en offentlig forside-feed |
| Lloyd's List | Betalingsmur, ingen RSS | Samme som over |
| Logistikk Inside | Ingen RSS-referanse, alle vanlige mønstre gir 404 | Custom scraper |
| Logistikknyhetene | Domenet svarer ikke (NXDOMAIN) — ser nedlagt ut | Fjern, eller sjekk om de har flyttet domene |
| MTLogistikk | Samme utgivelse som "Moderne Transport" fra faglærers liste (nå "Tidsskriftet Logistikk") — fortsatt ingen RSS-referanse | Custom scraper |
| Reuters Business | Reuters la ned offentlig RSS for flere år siden | RSSHub, eller dropp kilden |
| Bloomberg | Ingen offentlig RSS | RSSHub, eller dropp kilden |
| Bergen og Omland havnevesen | Nuxt-app uten RSS-autodiscovery, ingen vanlig feed-sti virker | Custom scraper |
| Vestland fylkeskommune | Ingen RSS-autodiscovery, gjettede feed-stier gir feilside | Custom scraper |
| GCE Ocean Technology | Ingen RSS-autodiscovery, vanlige mønstre gir 404 | Custom scraper |
| Bergensavisen | Kun RSS for hele forsiden, ingen næringsliv-/samferdselsseksjon — ville druknet i lokalt stoff uten nøkkelordfiltrering | Bygg keyword-filter, se Reuters/Bloomberg |
| Bergens Tidende (Økonomi) | Har en "økonomi"-scoped feed, men i praksis generell regional næringslivsdekning (f.eks. boligpriser), ikke logistikk-spesifikt | Samme som Bergensavisen — trenger nøkkelordfiltrering |
| UNCTAD | Nettsiden er bak en interaktiv Cloudflare-sjekk som blokkerer automatisk henting | Sjekk manuelt i nettleser, eller RSSHub |
| OECD | Hadde RSS tidligere (`/newsroom/index.xml`), men den redirecter nå til HTML — ser ut til å være fjernet ved siste redesign | RSSHub, eller dropp kilden |

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
