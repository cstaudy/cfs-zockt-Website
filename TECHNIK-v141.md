# cfs_zockt — TECHNIK v141

## Ziel von v141
v141 setzt direkt auf v140 auf und bündelt den nächsten Creator-Suite-Integrationsblock: **OBS WebSocket 5**, Launcher-Integration und UI-Struktur, TikTok-LIVE-Health/Recovery-Sichtbarkeit sowie eine bewusst noch unvollständige Twitch-/YouTube-OAuth-Grundlage.

Widget Studio und Launcher-Core bleiben feature-seitig eingefroren. Die Änderungen im Launcher sind Integrationspunkte für den bereits geplanten Creator-Suite-Workflow und kein neuer unabhängiger Feature-Bereich.

## Launcher
Launcher-Version: **0.47.18**

### OBS WebSocket 5
Neu ist ein eigener `ObsWebSocketController` im Electron-Main-Process.

Implementiert:
- OBS-WebSocket-5-Handshake inklusive Passwort-Authentifizierung.
- Standardziel `ws://127.0.0.1:4455`.
- `ws://` wird nur für localhost zugelassen; entfernte Hosts benötigen `wss://`.
- Benutzername/Passwort, Query und Fragment sind in der WebSocket-Verbindungs-URL verboten.
- OBS-Passwort wird ausschließlich lokal über Electron `safeStorage` verschlüsselt persistiert.
- optionaler Auto-Connect und kontrollierter Reconnect mit begrenztem Backoff.
- OBS-Version/WebSocket-Version lesen.
- Szenen lesen und aktuelle Program-Szene wechseln.
- Browser Sources auflisten und deren URL aktualisieren.
- OBS-Events für Scene-Änderungen abonnieren.
- Status wird über die bestehende Launcher-State-Pipeline an den Renderer geliefert.

### Least-Privilege-Grenze
OBS WebSocket besitzt keine Creator-Suite-spezifische Scope-Struktur. Deshalb begrenzt der Launcher die erlaubten Requests selbst auf eine feste Allowlist:

- `GetVersion`
- `GetSceneList`
- `GetCurrentProgramScene`
- `SetCurrentProgramScene`
- `GetInputList`
- `GetInputSettings`
- `SetInputSettings`

Streaming-Start/Stop, Recording-Steuerung, frei wählbare OBS-Requests und sonstige mutierende Funktionen sind über diesen Controller nicht freigegeben.

Der Bridge-Health-Status enthält nur einen sanitisierten OBS-Zustand (`connected`, aktuelle Szene, Request-Policy). Das OBS-Passwort wird nicht an Cloud/Bridge/Renderer zurückgegeben.

### Browser-Source-Schutz
Der bestehende OBS Doctor redigiert nun zusätzlich geheime Werte im URL-Fragment, z. B. `#token=...`. Die echte Browser-Source-URL kann lokal an OBS übergeben werden, während Diagnose-/Action-Ergebnisse die Tokenwerte nicht zurückspiegeln.

## Launcher UI
Die Navigation ist ohne Funktionsverdopplung in verständlichere Gruppen gegliedert:
- Start
- LIVE & Automation
- Produktion
- System

Der frühere OBS-Diagnosebereich ist jetzt **OBS Control**. WebSocket-Steuerung und Browser-Source-Diagnose bleiben dort zusammen, statt neue verstreute Menüpunkte zu erzeugen.

## TikTok LIVE
Der bestehende TikTool-Provider bleibt der implementierte Drittanbieter-LIVE-Pfad. v141 erfindet keine neuen TikTok-Metriken und ersetzt Profil-OAuth nicht durch einen falschen LIVE-Status.

Ergänzt wurden:
- Provider-Zustände `idle`, `connecting`, `connected`, `reconnecting`, `error`.
- `lastConnectedAt`, `lastDisconnectedAt`, `lastEventAt`, letzter Fehler.
- begrenzte Health-Metriken für Connect-Versuche und tatsächlich empfangene Events.
- explizite Kennzeichnung `thirdParty=true`, `official=false`.
- sichtbare Reconnect-Zustände, während das Provider-Paket Auto-Reconnect übernimmt.

Reale TikTok-LIVE-/Reconnect-/Soak-Abnahme bleibt offen.

## Twitch / YouTube
v141 implementiert **noch kein** Twitch- oder YouTube-Account-OAuth.

Neu ist nur ein serverseitiger, nicht-geheimer Provider-Vertrag mit:
- offiziellen Authorization-/Token-/Revoke-Endpunkten,
- geplanter Least-Privilege-Scope-Policy,
- geplantem Token-Lifecycle,
- Konfigurations-Präsenzstatus ohne Secretwerte,
- eindeutigen Flags `oauth_implemented=false` und `production_ready=false`.

Der geschützte Endpoint `/api/creator/integration-capabilities` macht diesen Status für die Integrationsseite transparent. Die UI bezeichnet beide Provider bewusst als **FOUNDATION** / OAuth noch offen.

Für v141 sind deshalb **keine neuen Render-Secrets erforderlich**. Die vorgesehenen Twitch-/Google-Konfigurationsnamen werden erst relevant, wenn die echten OAuth-Flows implementiert werden.

## Öffentliche/Creator-Statusdarstellung
Die Integrationsseite trennt nun klar:
- TikTok Profil-OAuth vs. TikTok LIVE über Launcher/Provider,
- OBS WebSocket code-seitig implementiert vs. reale OBS-Abnahme offen,
- Twitch/YouTube Foundation vs. echte Account-Verbindung.

## Lokale v141-Prüfungen
Neu:
- OBS WebSocket Controller v141: **PASS**
- TikTok LIVE Health v141: **PASS**
- Provider OAuth Foundation v141: **PASS**
- Creator Suite Integrations v141: **PASS**
- Launcher Release Check 0.47.18: **PASS**

Regression/Aggregate:
- Widget Studio Completion v140: **21/21 PASS**
- Launcher Completion v140-Baseline: **42/42 PASS**
- Interactive Games Core v140: **PASS**
- Scene Studio Aggregate: **PASS**
- Stream Studio Foundation: **46/46 PASS**
- Multistream Core: **70/70 PASS**
- Provider Adapters: **31/31 PASS**
- Stream Studio Live Health: **45/45 PASS**
- `npm run creator-suite141:check`: **PASS**
- `npm run release:v141`: **PASS**
- Launcher Static Check: **PASS**

## Was v141 ausdrücklich nicht behauptet
- kein echter OBS-Windows-Feldtest,
- keine reale OBS-Authentifizierungs-/Reconnect-Abnahme gegen den Creator-PC,
- kein TikTok-LIVE-Langzeit-/Netzunterbrechungs-Soak,
- kein Twitch OAuth,
- kein YouTube OAuth,
- keine produktiv abgenommene Twitch-/YouTube-/TikTok-Multistream-Zielintegration,
- kein Windows Installer-/Code-Signing-/SmartScreen-Abschluss.

## Nächste Reihenfolge
1. OBS WebSocket und Browser Source real auf dem Creator-Windows-/OBS-System abnehmen.
2. TikTok LIVE mit echten Events, Reconnect und längerem Soak abnehmen und nur reale Lücken nachziehen.
3. Twitch OAuth/Account-Link/Token-Rotation/Live-/Chat-Status implementieren.
4. YouTube OAuth/Kanalzuordnung/Broadcast-/Stream-Lifecycle implementieren.
5. echte Multistream-Ziele mit Ziel-Isolation, Reconnect und Upload-/Encoder-Budget zusammenführen.
6. danach Creator-Suite Feature Freeze und vollständiger Real-World-Acceptance-Block.
