# mpl26 — Montpellier familjeapp

Next.js-app för familjens tvåveckorsresa till Montpellier 10-24 juli 2026.
Live på Vercel, deployas från GitHub main-branch. Alla familjemedlemmar 
kan lägga till och redigera aktiviteter från sina telefoner. Chatten drivs 
av Anthropic API och känner till kontexten: datum, väder, vem som är var, 
vad som hänt tidigare i konversationen.

## Familjen

- **Andreas** (jag), IT-konsult, tränar halvmaraton, gillar äkta 
  upplevelser över turistfällor
- **Elin** (min partner), ergonom på Volvo, fyller 50 den 12 juli. 
  Gillar städer, kultur, vin, mat, promenader. Inte strapatser.
- **William** 25, snart klar civilingenjör Lund, med flickvän Anna 
  på resan
- **Anna** 25, Williams flickvän
- **Leja** 24, juridik Örebro första året
- **Leo** 17 (fyller 18 den 17 juli), naturvetenskap Sjölins Stockholm, 
  gillar utegym och kalastenik
- **Elton** 9, coachas i fotboll av Andreas
- **Viktor**, Lejas pojkvän, med 15–22 juli: landar 15/7 kl 14.00 på
  MPL, reser hem 22/7 kl 14.50 med Leja och Leo

Alkohol i Frankrike: 18+. Leo är 17 fram till 17 juli.

Resedatum: William & Anna hem 20/7 kl 14.50 (MPL), Leja/Leo/Viktor
hem 22/7 kl 14.50 (MPL). Övriga 10–24 juli.

Bor: 12 Rue Nicolas Copernic, 34000 Montpellier (Prés d'Arènes,
södra Montpellier — nära Lez och Parc de la Rauze).
Egen bil på plats: 5 platser, upp till 8 personer, alltid ett pussel.

## Stack

- Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui)
- Vercel hosting, GitHub Actions inte nödvändigt (Vercel deployar på push)
- Persistens: Vercel KV eller Vercel Postgres, ditt val, motivera
- Anthropic API via @anthropic-ai/sdk, modell claude-sonnet-4-5 för chat
- Lättviktsauth: ett delat familjelösenord (env APP_PASSWORD) via 
  middleware + httpOnly-cookie, giltig 1 år per enhet. Namn väljs från 
  dropdown vid första besök, sparas i localStorage.
- Mobil först. Poängen är att appen används från soffan i huset i 
  Montpellier och på tåget till Sète, inte på en 27-tums skärm.

## Kärnobjekt (datamodell utgångspunkt, justera vid behov)

- **Aktivitet**: id, titel, beskrivning, plats (lat/lng + adress), 
  taggar, budget-range, tidsåtgång, kategori (utflykt/mat/bar/etc), 
  tillagd-av, tillagd-datum, uppdaterad-datum, foton
- **Dag**: datum (2026-07-10 till 2026-07-24), planerade aktiviteter, 
  vilka i familjen som är med, väderprognos, fri anteckningsyta
- **Person**: namn, ålder, preferenser (fritext), tags, sparad som JSON
- **Chattmeddelande**: roll, innehåll, tidsstämpel, kopplat till dag 
  eller aktivitet eller fritt

## Chattens systemprompt ska alltid innehålla

- Dagens datum och plats i resan (t.ex. "Dag 3 av 14, ni är i Montpellier")
- Väderprognos för idag och imorgon
- Aktiviteter planerade för idag och imorgon
- Familjemedlemmar med kort profil
- Senaste 10 chattmeddelanden som kontext
- Alla aktiviteter i databasen som referensmaterial
- Vem som skriver (från localStorage-namnet)

## Deploy

Push till main triggar Vercel-deploy automatiskt. 
Env variable ANTHROPIC_API_KEY finns redan satt i Vercel.

## Referensmaterial

Mappen `reference/` innehåller fem PPT-filer med tidigare research och 
en Reveal.js-experiment. PPT-filerna är seed-material för aktiviteter, 
läs dem när det är dags