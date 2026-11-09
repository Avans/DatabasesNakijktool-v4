# DatabasesNakijktool v4

SQL-nakijktool voor de Datab1-opdrachten in Brightspace. Alles draait **in de browser van de student**:
de oefendatabases zijn SQLite (WebAssembly), en het nakijken gebeurt lokaal. Er is geen server en
geen database meer die uit kan vallen; Vercel serveert alleen statische bestanden.

## Gebruik in Brightspace

Precies dezelfde tag als in v2. Alleen de `src` van het script verandert:

```html
<wd-datab1 aid="21506"></wd-datab1>
<wd-datab1 aid="21507"></wd-datab1>
<script src="https://<vercel-url>/datab1-component.js"></script>
```

Meerdere opdrachten op één pagina delen één database-engine. Op de site zelf staan ook:

- `/` — overzicht van alle 459 opdrachten, met zoeken en voortgang
- `/opdracht.html?aid=21506` — één opdracht, met de code om hem in Brightspace te zetten
- `/demo.html` — de demo-pagina zoals die in Brightspace staat

## Wat er anders is dan v2

| | v2 | v4 |
|---|---|---|
| Database | MySQL 5.7 in Docker (Azure) | SQLite in de browser (sql.js) |
| Nakijken | op de server, frontend polt | direct, lokaal, in een web worker |
| Inzendingen | server-tabel `submissions` | alleen in de browser (`localStorage`) |
| Docent ziet resultaten | ja | nee (bewuste keuze) |
| Modelantwoorden | geheim op de server | zichtbaar in de broncode (bewuste keuze) |

De nakijkregels zijn dezelfde als in v2/v3 (`src/engine/grader.ts`): alles na de eerste `;` telt
niet, commentaar en niet-`SELECT` worden geweigerd, het resultaat moet dezelfde rijen en kolommen
(op kolomnaam) hebben als het modelantwoord, en daarna gelden de eisen uit de regexes. Twee
verschillen:

- De meldingen zijn in het Nederlands.
- Heeft het modelantwoord **geen** `ORDER BY`, dan telt de volgorde van de rijen niet mee. SQLite
  kiest daar zelf een volgorde, net als MySQL, en een student kan daar niets aan doen.

### MySQL in SQLite

Studenten schrijven gewoon MySQL. `src/engine/rewrite.ts` vertaalt het verschil weg (dubbele quotes
als tekst, `||` als OR, `/` als decimale deling, `DATE_ADD(... INTERVAL ...)`, `EXTRACT`,
`GROUP_CONCAT ... SEPARATOR`, `HAVING` zonder `GROUP BY`, `schema.tabel`, enzovoort).
`src/engine/mysql-functions.ts` voegt de MySQL-functies toe die SQLite niet heeft (`YEAR`,
`DATE_FORMAT`, `CONCAT` met NULL-gedrag, `IF`, `LEFT`/`RIGHT`, `DATEDIFF`, `TIMESTAMPDIFF`, …).
Tekstkolommen vergelijken hoofdletterongevoelig, zoals bij MySQL.

`npm run verify` voert alle 459 modelantwoorden uit en controleert dat elk antwoord werkt en
goedgekeurd wordt. Het vergelijkt ook met de uitvoer van de oude MySQL-server. De ongeveer 25
verschillen die overblijven zijn rijvolgorde zonder `ORDER BY`, opdrachten met `CURDATE()` en
decimale weergave. Op het nakijken hebben ze geen invloed, omdat modelantwoord en studentquery
op dezelfde engine draaien.

## Ontwikkelen

Node 22.18 of nieuwer (de scripts zijn TypeScript en draaien zonder buildstap).

```bash
npm install
npm run dev          # bouwt alles en serveert dist/ op http://localhost:5173
npm test             # unit tests (vitest)
npx vitest run -t "HAVING"   # één test
npm run verify       # alle modelantwoorden; exit 1 als er één faalt
npm run typecheck
npm run build        # dist/ = wat Vercel serveert
```

### Data

`data/` is de bron van alle inhoud en staat in git:

- `data/schemas/<database>.sql` — de zeven oefendatabases als SQLite-script
- `data/assignments.json` — opdrachten, modelantwoorden, eisen (regexes) en de oorspronkelijke
  MySQL-uitvoer (`expected`, alleen voor `npm run verify`)

`npm run build` maakt daar `public/data/*.sqlite` en een kleinere `assignments.json` van.

Een opdracht aanpassen of toevoegen doe je in `data/assignments.json`. Draai daarna `npm run verify`.

`data/` is eenmalig gemaakt uit de v2-dumps met `npm run import-v2 -- <pad>/DatabasesNakijktool-v2/sqlinit`.
Dat script neemt **geen** studentgegevens over (submissions, studentnummers) en ook geen
wachtwoorden uit de `connections`-tabel.

## Deploy

Vercel, gekoppeld aan deze repo. `vercel.json` bevat de build-instellingen en de CORS-headers,
zodat Brightspace het script en de data van een ander domein mag laden.
