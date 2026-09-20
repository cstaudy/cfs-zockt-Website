# Pass 21.10.16 – Windows WASAPI Audio Helper Acceptance & Packaging

## Ziel

Pass 21.10.15 hat die Process-Loopback-Foundation und die getrennten Audio-Busse für Game / Discord / Music / Alerts eingeführt. Pass 21.10.16 härtet jetzt den Windows-Auslieferungs- und Diagnosepfad, damit ein lediglich vorhandenes `cfs-audio-loopback.exe` nicht fälschlich als funktionsfähig gilt.

## Umgesetzt

- Mindest-Windows-Build für Process Loopback: **20348**.
- Launcher unterscheidet zwischen:
  - Helper-Datei vorhanden (`staged`)
  - Helper tatsächlich gestartet und Protokoll bestätigt (`runtimeVerified`)
- Runtime-Probe über `cfs-audio-loopback.exe --probe`.
- Erwartetes Protokoll: `CFS_AUDIO_LOOPBACK_V1`.
- Stream Engine verwendet Process Loopback nur nach erfolgreicher Runtime-Probe.
- Streaming-Preflight prüft ebenfalls den Runtime-Status.
- Launcher-UI hat einen eigenen **WASAPI HELPER TESTEN**-Button.
- Zustände in der UI:
  - `HELPER FEHLT`
  - `HELPER PRÜFEN`
  - `WASAPI BEREIT`
- `build.cmd` findet Visual C++ Build Tools bei Bedarf automatisch über `vswhere.exe` und lädt `vcvars64.bat`.
- Build aktiviert `/guard:cf`, `/DYNAMICBASE` und `/NXCOMPAT`.
- Nach dem Build wird `--probe` automatisch ausgeführt.
- Für das gebaute Binary wird eine SHA-256-Datei erzeugt.
- `dist:win`, `dist:portable` und `release:win` bauen den Helper vor Electron Builder automatisch.
- Neues Windows-Acceptance-Tool:
  - `npm.cmd run audio-helper:doctor`
  - `npm.cmd run audio-helper:acceptance -- --pid <PID> --seconds 5`
- Der reale Capture-Smoke-Test zählt nur empfangene PCM-Bytes. Im Evidence-JSON wird **keine Audio-Payload** gespeichert.
- Evidence-Datei: `launcher/reports/application-audio-windows-acceptance.json`.

## Warum Build 20348?

Microsoft dokumentiert `AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS`, `PROCESS_LOOPBACK_MODE` und das Application-Loopback-Beispiel mit Windows 10 Build 20348 als Mindeststand. CFS blockiert deshalb ältere Windows-Builds bereits vor der Stream-Session.

## Windows-Abnahme

Auf dem echten Windows-Zielsystem zuerst:

```bat
npm.cmd run audio-helper:build
npm.cmd run audio-helper:doctor
```

Danach eine Anwendung mit laufender Audioausgabe wählen, PID ermitteln und z. B. fünf Sekunden testen:

```bat
npm.cmd run audio-helper:acceptance -- --pid 1234 --seconds 5
```

PASS bedeutet hier:

- Windows-Build geeignet,
- Helper-Datei vorhanden,
- `--probe` liefert das erwartete Protokoll,
- bei angeforderter PID-Abnahme werden PCM-Bytes empfangen.

## Bewusst noch offen

- Der native C++-Helper wurde in dieser Linux-basierten Entwicklungsumgebung **nicht** mit einem echten Windows SDK kompiliert.
- Echter Build mit Visual Studio/Build Tools auf dem Ziel-Windows-System bleibt weiterhin offen.
- Reale Process-Loopback-Abnahme für Game, Discord, Music und Alerts bleibt offen.
- App-Neustart/Silence-Recovery während laufender Session bleibt offen.
- Mehrstündiger Multi-Ziel-Soak-Test bleibt offen.
- Code Signing des nativen Helper-Binaries gehört in den späteren Release-Signing-Block.

## Repository-Test

```bat
npm.cmd run studio-audio-windows21:check
```

Kompletter Stream-Studio-Check:

```bat
npm.cmd run stream-studio21:check
```
