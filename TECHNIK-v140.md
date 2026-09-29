# cfs_zockt — TECHNIK v140

## Ziel von v140
v140 schließt den Code-Audit für **Widget Studio** und den **Launcher-Kern** ab und prüft gleichzeitig die bereits vorhandene Scene-/Stream-Studio-Basis. Das Ziel ist ein klarer Übergang von „Feature-Bau“ zu „reale Abnahme“ für Widget Studio und Launcher.

## Widget Studio
Status: **FEATURE FROZEN / READY_FOR_REAL_WORLD_ACCEPTANCE**

Abgedeckt und lokal geprüft:
- Entwurf, Speichern, Publish und Runtime-Pfad.
- Veröffentlichte Runtime ist `published-only` und `no-store`.
- Runtime-Token bleibt im URL-Fragment und damit außerhalb normaler Server-/Proxy-Query-Logs.
- Runtime reconnectet bei Online-/Visibility-Wechsel und pollt kontrolliert.
- Renderer escaped Creator-Inhalte und verwendet den getrennten Runtime-Renderer.
- Optimistic Locking schützt vor stillen Überschreibungen bei paralleler Bearbeitung.
- Copy/Paste, Upload-Pfad, Beginner-/Pro-Workflow und zentrale Widget-Flows sind geprüft.

Lokale Prüfergebnisse:
- Widget Studio Completion v140: **21/21 PASS**
- Widget Core Flow: **22/22 PASS**
- Widget Studio 30s UX: **40/40 PASS**

Noch offen ist keine bekannte Code-Funktion des Widget-Studio-Kerns, sondern reale Abnahme: OBS Browser Source, längere Laufzeit und Creator-Workflow auf einem echten Streaming-PC.

## Launcher
Status: **FEATURE FROZEN / READY_FOR_WINDOWS_ACCEPTANCE**

Launcher-Version: **0.47.17**

Abgedeckt und lokal geprüft:
- Renderer ↔ preload ↔ IPC für aktuell verwendete Methoden.
- Persistente Game-Activity-Einstellungen und sichere Clear-/Sync-Flows.
- Game-Activity-Tracker und Website-/Bridge-Publishing.
- Interactive-Games-Service-Manager und lokales Runtime-Bundle.
- NEXUS Action Receipts.
- Runtime-Fehlerklassifikation.
- Stream-Game-Context-Persistenz.
- Provider-Auswahl fail-closed; unbekannte Provider werden nicht still auf Simulator umgebogen.
- Signierte Bridge-Requests, Replay Guard, HTTPS-Regel und Heartbeat-/Reconnect-Basis aus den vorigen Sicherheitsstufen bleiben aktiv.
- Lokale Stream-Credentials bleiben lokal und verschlüsselt; keine Stream-Keys in der Cloud.

Lokale Prüfergebnisse:
- Launcher Completion v140: **42/42 PASS**
- Bridge Integration: **PASS**
- Bridge Stability: **PASS**
- Bridge Safety v136: **PASS**
- Provider Switch: **PASS**
- Game Activity: **PASS**
- Acceptance Part 2: **PASS**
- Release Check: **PASS**

Noch offen ist reale Windows-Abnahme: Installer, Code Signing/SmartScreen, echter Device-Link, Reconnect unter Netzstörung, TikTok-LIVE-Soak und lokaler Runtime-/OBS-Feldtest.

## Scene Studio / Stream Studio
Der vorhandene Code wurde mit den aktuellen Protokollen nachgezogen. Mehrere veraltete Tests erwarteten alte Stream-Studio-Protokollstände; diese Tests wurden auf den aktuellen Vertrag angepasst, ohne die eigentliche Runtime abzuschwächen.

Der komplette lokale `stream-studio21:check` läuft jetzt durch. Enthalten sind unter anderem Scene Composer, Dual Canvas, Multi-Chat, Provider Adapter, Live Health, Routing/Recording, Native Scene Graph, Hybrid Compositor, Application Audio, Game Capture, Recording→Cut, Timeline Audition, A/B Loop, Click Guard und Zero-Cross.

Wichtig: Das bedeutet **nicht**, dass Twitch/OBS-WebSocket oder reale Multistream-Produktion schon fertig abgenommen sind. Diese Provider-/Produktionsschritte bleiben echte Feature- bzw. Integrationsarbeit der nächsten Creator-Suite-Phasen.

## Creator-Suite-Gate v140
- `npm run creator-suite140:check`: **PASS**
- `npm run stream-studio21:check`: **PASS**
- `npm run release:v140`: **PASS**

Der Release-Gate-Workflow verwendet jetzt `release:v140`.

## Nächste technische Reihenfolge
1. OBS-Integration finalisieren: Browser-Source-Feldabnahme, danach optional OBS WebSocket mit minimalen Rechten.
2. Twitch-Account/OAuth inklusive Token-Lifecycle, Trennung und Least-Privilege-Scopes.
3. Multistream reale Zieltests, Reconnect-Isolation, Upload-/Encoder-Budget und Langzeit-Soak.
4. Erst danach kompletter Creator-Suite-Release-Candidate und externe/produktive Abnahme.
