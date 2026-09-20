# CFS Creator Suite – Pass 21.10.15

## Windows Application Audio Capture + Multi-Track Audio Foundation

Pass 21.10.15 erweitert die lokale Launcher-Audio-Pipeline von zwei allgemeinen DirectShow-Bussen auf getrennte Stream-/Recording-Quellen für Mikrofon, Game, Discord, Music und Alerts.

### Umgesetzt

- strukturierte lokale Audioquellen: `mic`, `game`, `discord`, `music`, `alerts`
- Mikrofon bleibt über das ausgewählte lokale DirectShow-Gerät angebunden
- Game / Discord / Music / Alerts werden als Windows Process-Loopback-Quellen vorbereitet
- nativer C++-Helper auf Basis von `ActivateAudioInterfaceAsync` und `AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK`
- Process-Tree-Capture ist standardmäßig aktiv, damit Child-Prozesse einer Anwendung mit erfasst werden können
- Helper liefert lokales 48-kHz / Stereo / s16le PCM über stdout; keine Roh-Audiodaten verlassen den Launcher
- eine vorbereitete Application-Audio-Quelle kann an mehrere lokale FFmpeg-Ziele gefächert werden, ohne pro Streaming-Ziel einen zweiten App-Capture zu starten
- zusätzliche FFmpeg-Pipes für Application Audio werden kollisionsfrei hinter Widget-Pipes vergeben
- Cloud-Mixer-Level/Mute und lokaler Trim/Mute werden vor dem FFmpeg-Mix kombiniert
- Audio-Sync-Delay bleibt pro Quelle erhalten
- Recording kann Stream Mix plus Mic / Game / Discord / Music / Alerts als getrennte Audio-Tracks schreiben
- Recording-Track-Metadaten erhalten verständliche Track-Namen
- gespeicherte Process-ID wird bei einem Neustart der Anwendung anhand des Process-Namens neu aufgelöst, soweit eindeutig verfügbar
- Launcher listet laufende Windows-Prozesse für die vier Application-Audio-Busse
- Preflight prüft Helper-Verfügbarkeit und konfigurierte Prozessquellen
- Electron-Builder übernimmt den Audio-Helper-Ordner als Release-Resource
- alter Audio-1/Audio-2-Pfad bleibt als Legacy-Fallback erhalten

### Native Helper

Quellen:

- `launcher/native/audio-loopback/cfs-audio-loopback.cpp`
- `launcher/native/audio-loopback/build.cmd`
- `launcher/native/audio-loopback/README.md`

Build unter Windows in einer Visual-Studio-Developer-Command-Prompt:

```powershell
cd launcher
npm.cmd run audio-helper:build
```

Das Build-Skript legt `cfs-audio-loopback.exe` unter `launcher/vendor/audio/` ab. Ein vorkompiliertes Binary wird absichtlich nicht im Repository mitgeführt.

### Kompatibilität

- vorhandene Installationen mit `streamAudioDevice` / `streamAudioDevice2` funktionieren weiter
- ältere `audio1` / `audio2` Recording-Einstellungen werden server- und clientseitig auf Mic / Game migriert
- alte Tests und IDs bleiben als Legacy-Aliase erhalten
- Streamkeys und App-Audio-Prozessbindungen bleiben lokal im Launcher

### Bewusst noch offen

- realer Windows-Build des nativen Helpers im Zielsystem
- echte Process-Loopback-Abnahme mit Game / Discord / Music / Alerts
- Verhalten bei App-Neustart während einer laufenden Session und längeren Silent-Phasen
- Performance-/Soak-Test mit mehreren Streaming-Zielen und mehreren App-Audioquellen
- Cut Studio: komfortable Verarbeitung von mehr als drei Recording-Audiotracks
- echte native Game-Capture-Hooks

### Repository-Prüfung

```powershell
npm.cmd run studio-audio21:check
npm.cmd run stream-studio21:check
```
