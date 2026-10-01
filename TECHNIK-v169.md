# TECHNIK v169 — Widget-Umwandler & Provider-Trennung

- Backend: **3.20.14**
- Schema: **73**
- Launcher: **0.47.30** (unverändert)
- Feature Freeze bleibt aktiv; v169 erweitert den bereits begonnenen Widget-Studio-Flow gezielt.

## Änderungen

- TikTok, Twitch, YouTube und Allgemein sind im Widget Studio providerrein.
- Provider-Definitionen besitzen genau eine `studio_areas`-Kategorie.
- Neuer Bild/Logo → Widget-Umwandler für TikTok und Twitch.
- Converter-Erstellung sendet `requested_platform`; Cross-Provider-Erstellung wird serverseitig abgelehnt.
- Provider-Karten ohne verbundene Registry-Typen werden ausgeblendet.
- `?platform=tiktok|twitch|youtube|obs` wird als Deep-Link ausgewertet.
- Bestehende Widgets und Runtime-IDs bleiben erhalten.

## Test

`npm run widget169:check` prüft die Trennung, den Converter, Servervalidierung und Legacy-Grenzen. Vollständiger Release-Gate: `npm run release:v169`.

## Lokaler Release-Stand

- `npm run project:check`: **40/40 PASS**
- `npm run studio-operator168:check`: **92/92 PASS**
- `npm run widget169:check`: **69/69 PASS**
- `npm run release:v169`: **Exit 0 / PASS**
