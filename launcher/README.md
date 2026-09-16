# cfs_zockt Creator Suite Launcher — Beta V0.10

Dieser Ordner ist die Desktop-Grundlage für die Creator Suite.

## Was bereits funktioniert

- Electron Desktop App
- System Tray
- sichere Speicherung des Bridge-Keys über Electron `safeStorage`
- Heartbeat / Reconnect zur Creator Cloud
- LIVE Session Start / Ende
- Event Queue und Batch Upload
- Follow / Like / Gift / Share / Viewer Simulator
- Launcher Action Queue
- AutoThanks TTS
- Windows Autostart
- lokale Logs mit Token-Maskierung
- Provider-Architektur
- optionaler TikTool LIVE Provider für echte Follow/Like/Gift/Share/Viewer Events

## LIVE Provider

Standardmäßig läuft der Launcher mit dem **Simulator**.

Optional ist der Drittanbieter-Provider **TikTool / `tiktok-live-api`** integriert. Er benötigt:
- TikTok Username
- TikTool API-Key

Der Provider ist nicht offiziell von TikTok. Bridge-Key und Provider-Key werden getrennt und lokal über Electron `safeStorage` verschlüsselt gespeichert.

Die Provider-Schicht bleibt austauschbar, damit später andere LIVE-Quellen ergänzt werden können.

## Lokal starten

```bash
cd launcher
npm install
npm run dev
```

## Windows Installer bauen

```bash
npm run dist:win
```

Ausgabe:

`launcher/dist/cfs_zockt-Creator-Suite-0.10.0-Setup.exe`

Für einen echten Release sollten später Code Signing und Auto Update ergänzt werden.

## Verbindung

1. Widget Studio auf der Website öffnen.
2. Launcher Bridge Key erzeugen.
3. Desktop Launcher → Bridge öffnen.
4. Backend URL + Key speichern.
5. `Bridge online` prüfen.
6. LIVE starten.
7. Mit dem Simulator Events End-to-End bis OBS testen.

## V0.22 LIVE Reliability
Persistenter Session Marker, explizites Resume-Protokoll vor dem ersten Heartbeat und geleaste AutoThanks/TTS-Aktionen mit ACK/NACK.
