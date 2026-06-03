# HYBRID 7r

Personleg treningslogg og treningsprogram. Rein statisk React + Vite + TypeScript-app utan backend. All data ligg lokalt i nettlesaren (IndexedDB), med full JSON-eksport/import for backup og synk mellom einingar.

## Funksjonar

- **Planlagt treningsprogram** (8 veker fram), redigerbart, med drag mellom dagar og import av program som JSON.
- **Kalender** (månad/veke) med fargekoda økter.
- **Treningsdagbok** med fritekstsøk og strukturerte filter (kategori, dato, øving, vekt, puls, fart).
- **Statistikk** over valbare periodar: løp-km, SkiErg/RowErg-meter, knebøy totalvolum og tyngste løft, økttal per kategori, og trendgrafar for fokusøvingar.
- **Logg dagens økt** med forhåndsutfylling frå planlagt økt.
- **Import** frå Garmin (CSV / GDPR-eksport / .fit / .gpx), Strava (bulk-eksport CSV), Beyond the Whiteboard (CSV) og iCal (.ics), med dedup og førehandsvising.
- **iCal-eksport** (Europe/Oslo).
- **Eksporter for AI-analyse**: kompakt markdown-underlag (utan GPS) klart til å lime inn i Claude.
- Pulssoner etter **Olympiatoppen 5-sonemodell** (HRmax og soner er redigerbare).

## Køyre lokalt

```bash
npm install
npm run dev      # utviklingsserver
npm run build    # produksjonsbygg til dist/
npm run preview  # førehandsvis produksjonsbygget
```

Krev Node 20+.

## Deploy på Netlify (frå GitHub)

1. Push dette repoet til GitHub.
2. I Netlify: **Add new site → Import an existing project**, vel repoet.
3. Build-innstillingane les automatisk frå `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy. Appen er reint statisk, så ingen miljøvariablar eller backend trengst.

## Datalagring

Alt ligg i IndexedDB i nettlesaren (database `hybrid7r`). Bruk **Innstillingar → Eksporter database (JSON)** jamleg for backup, og **Importer database** for å flytte data til ein annan eining eller nettlesar. Tøm nettlesardata = mist lokal logg, så ta backup.

## Strava

Live Strava-API er medvite ikkje bygd inn. For live data og AI-analyse: bruk Strava sin offisielle MCP i Claude (inkludert i Strava-abonnement). For historikk i denne appen: last ned gratis bulk-eksport frå Strava og importer CSV-en.

## Program-JSON

Sjå importfeltet i program-seksjonen for skjema. Eit Claude-generert 8-vekers program kan limast rett inn.
