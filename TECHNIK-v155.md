# TECHNIK v155 — Private-Beta Acceptance Hardening

**Status:** LOCAL ACCEPTANCE GATES PASS / REAL WINDOWS-OBS-PROVIDER ACCEPTANCE OPEN  
**Backend:** 3.20.1  
**Schema Generation:** 73  
**Launcher:** 0.47.27

## Ziel

v155 eröffnet keinen neuen Produktblock. Der Feature Freeze bleibt aktiv. Der Stand härtet ausschließlich die Test-/Diagnosekette für die jetzt beginnende reale Private-Beta-Acceptance.

## Gefundene und korrigierte Gate-Lücken

Während des ersten Acceptance-Laufs wurden zwei reale Testketten-Inkonsistenzen sichtbar:

- R59 war nicht in `project:check` verdrahtet.
- R68 war nicht in `project:check` verdrahtet und erwartete noch Schema Generation 68 statt des aktuellen Schemas 73.

`project:check` enthält jetzt die statischen Security-/Predeploy-Contracts R59 bis R68 und läuft **40/40 PASS**.

Die v154-Gates akzeptieren nachfolgende Patchversionen, ohne ihren Mindestvertrag zu lockern. Dadurch kann v155 die v154-Contracts weiterhin vollständig ausführen.

## Stream-Credential-Store

Neu ist `launcher/tools/stream-credential-store-test.mjs` als echter ausführbarer Test des lokalen Credential Stores.

Geprüft werden unter anderem:

- ausschließlich RTMP/RTMPS
- keine Credentials in der Server-URL
- Stream-Key-Validierung
- SafeStorage muss verfügbar sein, sonst fail closed
- Server-URL und Stream-Key werden nur verschlüsselt persistiert
- Public Entry und Snapshot enthalten keine Secrets
- maximal acht lokale Ziele
- Update vorhandener Ziele bleibt bei voller Kapazität möglich
- Remove / Clear
- korrupte Datei fällt sicher auf leeren Zustand zurück
- Decrypt-Fehler geben kein Secret preis

Ergebnis: **29/29 PASS**.

## Private-Beta Acceptance Runner

Neu:

- `RUN-PRIVATE-BETA-ACCEPTANCE.cmd`
- `PRIVATE-BETA-ACCEPTANCE-v155.md`
- `npm run private-beta155:check`

Der Runner ist bewusst vom älteren allgemeinen Production-R59-R67-Workflow getrennt. Die aktuelle kostenlose geschlossene Beta startet keinen Stripe-LIVE-Test und aktiviert keine Monetarisierung.

## Aktueller lokaler Stand

- `project:check` → **40/40 PASS**
- R59 Render Production Security → **56/56 PASS**
- R60 Database Recovery Security → **50/50 PASS**
- R61 Mail Production Security → **8/8 PASS**
- R62 Auth Production Security → **7/7 PASS**
- R63 Windows Launcher Security → **7/7 PASS**
- R64 LIVE Soak Security → **6/6 PASS**
- R65 Monitoring Security → **6/6 PASS**
- R66 Stripe Security-Contract → **8/8 PASS**; nicht Teil des Private-Beta-LIVE-Ablaufs
- R67 Launch Gate Security → **7/7 PASS**
- R68 Predeploy Migration Safety → **52/52 PASS**
- Stream Provider Targets v153 → **45/45 PASS**
- Beta Test Handbook v154 → **57/57 PASS**
- Feature Freeze v154 → **33/33 PASS**
- Stream Credential Store → **29/29 PASS**
- Private Beta Acceptance v155 → **34/34 PASS**
- kompletter `npm run release:v155` → **PASS**

## Noch nicht real bestätigt

Dieser Stand behauptet ausdrücklich noch keinen realen PASS für:

- Windows Launcher / Installer / Signing / SmartScreen
- OBS WebSocket und Browser Sources auf echter Windows-Installation
- Twitch LIVE
- TikTok LIVE mit offiziellem Encoder-Zugang
- YouTube LIVE nach vollständigem Betreiber-OAuth-Setup
- 2+ reale Streaming-Ziele
- Netzwerkverlust / Reconnect / Zielausfall
- Launcher-/Backend-Neustart unter realer Session
- Bandbreitengrenze / Encoder Overload
- 2h+ Soak
- Multi-Creator-Isolation im realen Betrieb

Der öffentliche Smoke gegen `cfs-zockt.de` konnte in der isolierten Build-Umgebung nicht ausgeführt werden, weil dort DNS/externes npm-Netzwerk nicht verfügbar war. Das wird nicht als Produkt-Fail gewertet und nicht als PASS simuliert.
