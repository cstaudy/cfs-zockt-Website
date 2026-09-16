# cfs_zockt – Widget Core Flow Pass

Stand: 15.09.2026
Backend-Version: 3.12.0 (unverändert)

## Ziel

Gezielter Praxis-/Code-Pass für die fünf Kernflüsse nach dem 30-Sekunden-UX-Pass:

- Goal
- Counter
- Timer
- Chat
- Kamera / statisches Overlay

Geprüft wurde der Weg von Widget-Definition und Datenquelle über Studio/Preview bis Renderer, Publish-/Output-Zustand und manuelle Live-Steuerung. Keine große Acceptance-, Last- oder echte LIVE-Suite wurde gestartet.

## Umgesetzte Korrekturen

### 1. LIVE Timer – Offline `hold` korrigiert

Der LIVE Timer sprang bei einer stale/offline Bridge trotz Einstellung `Letzten Wert halten` effektiv auf 00:00.

Jetzt wird bei `hold` der letzte bekannte Freshness-Zeitpunkt verwendet (`last_event_at`, `bridge_heartbeat_at`, `updated_at`) und der Timer dort eingefroren. `zero` setzt weiterhin auf 0; `hide` wird weiterhin im Runtime-Flow ausgeblendet.

Studio-Preview und veröffentlichter Renderer verwenden dieselbe Logik.

### 2. Manuelle Widgets wirklich plattformunabhängig

Manuelle Goals, Counter und Timer benötigen im öffentlichen Output jetzt keinen TikTok-/LIVE-Snapshot mehr.

- keine TikTok-Profilmetrik im Runtime-Modell
- kein TikTok-Avatar im manuellen Runtime-Modell
- Creator-Account-Identität statt Plattformidentität
- `cfs-standard` startet bei manuellen Widgets ohne TikTok-Avatar-Platzhalter
- öffentliche manuelle/static Outputs überspringen die externen Profil-/LIVE-/Bridge-Snapshot-Abfragen

Damit bleiben OBS-/manuelle Widgets auch ohne TikTok-Verbindung sauber nutzbar.

### 3. Unveröffentlichte Änderungen korrekt erkennen

`has_unpublished_changes` wurde bisher aus `updated_at > published_at` abgeleitet. Eine manuelle Counter-/Timer-Aktion konnte dadurch den Publish-Zeitpunkt verschieben und echte noch nicht veröffentlichte Designänderungen fälschlich als veröffentlicht erscheinen lassen.

Jetzt werden bereinigte Draft- und Published-Konfiguration direkt verglichen.

Manuelle Live-Steuerung synchronisiert weiterhin den Live-Wert in Draft + Published, verändert aber `published_at` nicht mehr.

### 4. Chat bei stale/offline Daten

Bei `offlineBehavior = zero` werden alte Chat-Nachrichten jetzt geleert. `hold` behält die letzten Nachrichten; `hide` blendet das Widget weiterhin vollständig aus.

### 5. Kamera / statische Overlays

Statische Kamera-/Overlay-Ausgaben greifen im öffentlichen Runtime-Endpunkt nicht mehr unnötig auf TikTok-/LIVE-/Bridge-Daten zu. Der Renderer bleibt vollständig statisch und transparent.

## Neuer gezielter Test

`npm run coreflows:check`

Prüft unter anderem:

- Follower Goal: aktueller Wert, Rest, Prozent
- manueller Counter
- manueller Timer
- LIVE Timer online / hold / zero
- Chat hold / zero
- Kamera/static Runtime
- Plattformentkopplung manueller/static Outputs
- Publish-/Unpublished-State
- Backend-Version 3.12.0

Ergebnis dieses Passes: 22/22 Checks bestanden.

## Zusätzliche Regressionen

- `npm run check` – OK
- `npm run ux30:check` – 40/40
- `npm run security:check` – OK
- `npm run seo:check` – OK
- `npm run funnel:check` – OK
- `npm run reviews:check` – 13/13
- `node tools/universal-widget-renderer-test.mjs .` – OK
- `node tools/widget-studio-v10-qa.mjs .` – OK

## Bewusst nicht durchgeführt

- keine echte TikTok-LIVE-Session
- keine Produktions-OBS-Acceptance
- keine große Last-/Reconnect-Suite
- kein Technical Finish Part 4
- kein Versionssprung

Diese Punkte bleiben gemäß Projektübergabe bis zum späteren Stabilitäts-/Release-Pass pausiert.

## Nächster sinnvoller Roadmap-Punkt

Launcher weiter stabilisieren, danach Stream Board final glätten und erst anschließend die pausierten alten/großen Tests wieder öffnen.
