# Pass 21.10.17 – Application Audio Recovery & Soak Foundation

## Ziel

Pass 21.10.17 härtet die in 21.10.15/16 eingeführten Windows-Process-Loopback-Quellen für laufende Sessions. Ein Neustart von Game, Discord, Music oder Alerts soll nicht automatisch alle Streaming-Ziele und Recording-Prozesse neu starten müssen.

## Umgesetzt

- Application-Audio-Manager überwacht die vorbereiteten Prozessquellen während der Session.
- Gespeicherter Prozessname wird als Recovery-Identität genutzt.
- Wenn die ursprüngliche PID verschwindet und derselbe Prozessname mit neuer PID wieder erscheint, wird die Quelle lokal neu gebunden.
- Rebind erfolgt innerhalb derselben Application-Audio-Quelle; die bestehenden FFmpeg-Ziele bleiben bestehen.
- Unerwartet beendete `cfs-audio-loopback.exe`-Instanzen werden mit begrenztem Backoff neu gestartet:
  - 500 ms
  - 1 s
  - 2 s
  - 5 s
  - 10 s Maximum
- Während Helper-Recovery oder wenn die Zielanwendung vorübergehend nicht läuft, bleibt die bestehende FFmpeg-Audiopipe offen.
- Dafür wird lokales 48-kHz / Stereo / s16le Continuity-PCM als Stille eingespeist.
- Continuity startet erst nach einem begrenzten No-PCM-Fenster und stoppt unmittelbar, wenn echte Helper-PCM-Daten wieder eintreffen.
- Ein leerer Prozess-Snapshot wird als mögliche Enumeration-Störung behandelt und löst nicht sofort einen Massen-Rebind aller Quellen aus.
- Recovery-Telemetrie pro Audioquelle:
  - `helperRestarts`
  - `processRebinds`
  - `continuityBytes`
  - `waitingForProcess`
  - `processState`
  - `lastRecoveryAt`
- Aggregierte Recovery-Zähler stehen im Launcher-State zur Verfügung.
- Launcher-UI zeigt erfolgte Recovery-/Rebind-/Helper-Zähler im WASAPI-Status an.

## Windows-Soak-Tool

Neu:

```bat
npm.cmd run audio-helper:soak -- --game-pid 1234 --discord-pid 5678 --seconds 300
```

Optional können Music und Alerts ergänzt werden:

```bat
npm.cmd run audio-helper:soak -- --game-pid 1234 --discord-pid 5678 --music-pid 9012 --alerts-pid 3456 --seconds 600
```

Das Tool verwendet denselben `ApplicationAudioSourceManager` wie der Launcher. Während des Laufs kann eine Zielanwendung bewusst beendet und neu gestartet werden. Der Manager soll sie anhand des Prozessnamens auf die neue PID rebinden.

Evidence:

`launcher/reports/application-audio-windows-soak.json`

Die Evidence enthält Byte-Zähler, Recovery-Zähler und Zustände, aber **keine Audio-Payload** und keine gespeicherte WAV-/PCM-Datei.

## Sicherheits- und Stabilitätsgrenzen

- Streamkeys bleiben unverändert im lokalen Credential Store.
- Roh-Audio wird nicht an Backend oder Cloud geschickt.
- Continuity-PCM besteht ausschließlich aus Null-Samples.
- Prozessauflösung bleibt lokal über Windows-Prozessinformationen.
- Es gibt keinen automatischen Provider-/Stream-Neustart nur wegen eines App-Audio-Rebinds.
- FFmpeg-Ziele bleiben bestehen, solange die übrige Streaming-Pipeline gesund ist.

## Bewusst noch offen

- Echter Windows-Build und reale Helper-Abnahme auf dem Ziel-PC.
- Echter Windows Multi-Audio-Soak-Test mit Game + Discord + optional Music/Alerts.
- Reale App-Neustart-Abnahme während eines laufenden Twitch/YouTube/TikTok-Multistreams.
- Bewertung von A/V-Sync nach mehreren Rebinds auf echter Hardware.
- Mehrstündiger 3-Ziel-Soak mit Recording parallel.
- Native Game-Capture-Hooks.

## Repository-Test

```bat
npm.cmd run studio-audio-recovery21:check
```

Kompletter Stream-Studio-Check:

```bat
npm.cmd run stream-studio21:check
```
