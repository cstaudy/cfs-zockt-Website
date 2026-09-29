# cfs_zockt v135 – Launcher / Bridge Stabilisierung

## Ziel
Die Verbindung zwischen Launcher, Website, LIVE-Status und aktuellem Game wurde technisch gehärtet. Fokus ist ein stabiler Zustand ohne unnötiges Offline-Flackern und eine zuverlässige Übertragung der aktiven Game-Präsenz.

## Wichtigster gefundener Fehler
Im Launcher wurde `publishGameActivityPresence()` regelmäßig aufgerufen, aber `BridgeClient` hatte die dafür erwartete Methode `publishGameActivityState()` nicht implementiert. Dadurch brach die Funktion absichtlich früh ab und die laufende Game-Präsenz wurde nicht an `/api/bridge/community/game-activity/state` gesendet.

Das ist in v135 behoben.

## Änderungen

### 1. Game-Präsenz funktioniert jetzt wirklich
`launcher/src/bridge-client.js` enthält jetzt:

- `publishGameActivityState(payload)`
- Capability `game_activity_presence_v1`

Der vorhandene 60-Sekunden-Presence-Refresh im Launcher kann damit nun tatsächlich den aktiven Titel an das Backend senden.

### 2. Launcher-Heartbeat robuster
Bisher galt ein Launcher nach kurzer Unterbrechung sehr schnell als offline. v135 verwendet drei Zustände:

- `online` – Heartbeat frisch
- `degraded` – Heartbeat verspätet, aber noch innerhalb der Grace-Periode
- `offline` – Grace-Periode überschritten oder Authentifizierung ungültig

Standardwerte:

- Heartbeat: 10 Sekunden
- Online-Fenster: 45 Sekunden
- Grace-Periode: 90 Sekunden

Ein einzelner kurzer Netzwerkfehler schaltet den Launcher dadurch nicht sofort auf offline.

### 3. Server steuert Heartbeat-Timing
Der Heartbeat-Endpunkt liefert jetzt zusätzlich:

- `heartbeat_after_ms`
- `heartbeat_online_window_ms`
- `heartbeat_grace_ms`
- `protocol`

Der Launcher übernimmt das vom Server gelieferte Heartbeat-Intervall statt ausschließlich einen fest codierten Wert zu verwenden.

### 4. LIVE-State bekommt Grace-Periode
Für `launcher_bridge` wird ein aktiver LIVE-State erst nach der Grace-Periode als stale behandelt. Dadurch verschwindet ein laufender Stream bei einem einzelnen verpassten Heartbeat nicht sofort aus der Website.

### 5. Technischer Status erweitert
Launcher-Diagnose enthält jetzt:

- `connection_state`
- `reachable`
- `heartbeat_age_seconds`
- `heartbeat_after_ms`
- `heartbeat_grace_ms`
- `protocol`

Die technische Statusseite zeigt diese Werte sichtbar an.

### 6. Public Creator State erweitert
Der zentrale Public-State enthält im LIVE-Signal zusätzlich:

- `launcher_state`
- `launcher_reachable`
- `heartbeat_age_seconds`

Damit können Homepage und spätere Oberflächen zwischen kurz gestörter Verbindung und echtem Offline unterscheiden.

### 7. Launcher-Version
Da ausführbarer Launcher-Code geändert wurde, wurde der aktive Launcher-Vertrag auf **0.47.13** angehoben.

Bestehende Versionswerte wurden synchronisiert:

- Launcher package / lock
- `.env.example`
- Render Blueprint Example
- System Check
- Recovery Policy
- Creator Suite / Roadmap / Homepage

Es gibt keine neue Environment-Variable. Bei einem echten Launcher-Release müssen die bereits vorhandenen Render-Werte `CFS_LAUNCHER_BUILD_TARGET_VERSION` und `CFS_RELEASE_EVIDENCE_VERSION` auf `0.47.13` stehen.

## Tests

- Launcher Bridge Health v135: 7/7
- Launcher Bridge Resilience v135: 10/10
- bestehender BridgeClient Integration Test: PASS
- Creator State: 11/11
- Release Readiness: 20/20
- Website Acceptance: 34/34
- Server / Launcher / Frontend Syntax: OK
