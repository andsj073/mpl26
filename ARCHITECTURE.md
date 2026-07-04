# Arkitektur — mpl26

Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui) på Vercel.
Mobil först. Ingen auth — delad länk, namn väljs via dropdown och sparas
i localStorage (`mpl26:name`).

## Databas: Postgres (Neon via Vercel Marketplace)

Valet stod mellan Vercel KV (numera Upstash Redis) och Vercel Postgres
(numera Neon). **Postgres vinner** för det här usecaset:

- Datan är relationell: aktiviteter kopplas till dagar, dagar har deltagare,
  chattmeddelanden kan kopplas till dag eller aktivitet.
- Vi filtrerar och sorterar: aktiviteter per kategori/tagg, dagar per datum,
  senaste 10 meddelanden. I KV hade varje sådan fråga krävt handbyggda index.
- Chatthistoriken växer under två veckor; `ORDER BY ... LIMIT 10` är gratis
  i SQL, klumpigt i Redis.
- Neons fria nivå räcker med god marginal för 7 användare i två veckor.

ORM: **Drizzle** + drizzle-kit för migrations. Typat, tunt, inga codegen-steg.

## Routes

| Route | Innehåll |
|---|---|
| `/` | redirect till `/dagar` |
| `/dagar` | 15 dagar (10–24 juli), aktiviteter, deltagare, väder, anteckningar |
| `/aktiviteter` | idébank: alla aktiviteter, filter på kategori/tagg |
| `/chatt` | delad familjetråd med AI-assistenten |

Layout: bottom-nav med tre flikar (tumavstånd, mobil först).

## API

| Endpoint | Metod | Gör |
|---|---|---|
| `/api/chat` | POST | Bygger systemprompt, streamar svar (SSE) via Anthropic SDK, persisterar user- + assistant-meddelande |
| `/api/activities` | GET/POST/PATCH/DELETE | CRUD för aktiviteter |
| `/api/days` | GET/PATCH | Dagar: planering, deltagare, anteckningar |
| `/api/weather` | GET | Open-Meteo-proxy, cachad 1h |

## Chatten

- **En delad tråd** för hela familjen, persistad i `messages`-tabellen.
  AI:n ser vem som skrev vad.
- **Streaming**: Anthropic SDK:s `messages.stream()` i en route handler
  som returnerar en `ReadableStream` (SSE). Klienten läser strömmen och
  renderar löpande.
- Modell: `claude-sonnet-4-5`.
- **Agent med verktyg**: chatten kan skriva till databasen via tool use —
  `add_activity`, `update_activity`, `plan_activity`, `unplan_activity`,
  `update_day`. Verktygsloopen körs server-side (max 8 rundor), varje
  utförd ändring skickas som händelse till klienten ("✓ Planerade in …").
- Systemprompten byggs server-side per request och innehåller alltid:
  dagens datum + dag N av 14, väder idag/imorgon, aktiviteter idag/imorgon,
  familjeprofiler, alla aktiviteter som referens, senaste 10 meddelanden,
  och avsändarens namn (skickas från klienten).

## Väder

Open-Meteo (gratis, ingen API-nyckel). Fasta koordinater för Montpellier
(43.62, 3.87). Hämtas server-side, cachas 1 h (`revalidate: 3600`).

## Sync mellan telefoner

SWR: refetch on focus + polling (30 s på chatten, 60 s på dagar).
Inga websockets — familjen sitter inte och stirrar på samma skärm.

## Foton

`activities.photos` (text-array med URL:er) finns i schemat från start.
Uppladdning via Vercel Blob byggs i v2 — ingen migration behövs då.

## Datamodell (tabeller)

- `activities` — id, title, description, lat, lng, address, tags[],
  budget_min/max, duration_min, category, added_by, photos[],
  created_at, updated_at
- `days` — date (PK, 2026-07-10 … 2026-07-24), participants[], notes
- `day_activities` — day_date, activity_id, sort_order
- `messages` — id, role, content, author, day_date?, activity_id?, created_at
- Personer hålls i kod (`lib/family.ts`), inte i databasen — familjen är fast,
  ingen CRUD-UI behövs, och chattens systemprompt får alltid profilerna

## Env

- `ANTHROPIC_API_KEY` — finns redan i Vercel
- `DATABASE_URL` — Neon, måste provisioneras (Vercel Marketplace → Neon,
  kopplas till projektet, dra ner lokalt med `vercel env pull`)
