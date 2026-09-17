# Pass 21.10.1 – CFS Local Streaming Engine Core

Stand: 2026-09-17

## Ziel

Der CFS Launcher bekommt eine echte lokale Media-Engine-Grundlage. Die Website bleibt Control Plane für Scenes, Widgets, Overlays, Output-Profile und Multistream-Ziele. Capture, lokale Geräte, Stream-Keys, FFmpeg-Prozesse, Recording und RTMP/RTMPS bleiben auf dem Creator-PC.

## Umgesetzt

- neue `launcher/src/stream-engine.js`
- neue `launcher/src/stream-credential-store.js`
- Bridge-Sync über `/api/bridge/stream-studio/config`
- neue Launcher-Seite **STREAM ENGINE**
- lokale Auswahl für Bildschirm, Fenster/Borderless Game und Kamera
- lokale DirectShow-Geräteerkennung für Video/Audio
- FFmpeg-Probe und Encoder-Erkennung für x264, NVENC, AMF und QSV
- H.264-Streamingprofile 1080p60, 1080p30, 720p60 und 1080x1920p60
- RTMP/RTMPS-Ausgabe pro Ziel
- getrennte FFmpeg-Prozesse pro Ziel für Fehlerisolierung
- Reconnect mit gestaffeltem Backoff
- lokales Recording als MKV oder MP4
- FPS-/Bitrate-/Speed-Status aus FFmpeg
- Stop der Engine bei Launcher-Shutdown und Device-Logout

## Secret-Grenze

Stream-Zugangsdaten werden in einer separaten lokalen Datei gespeichert. Server-URL und Stream-Key werden mit Electron/Windows SafeStorage verschlüsselt. Der öffentliche Launcher-State enthält nur `configured`, den Server-Host als Hinweis und Zeitstempel. Stream-Keys werden nicht an die Website, das Backend oder PostgreSQL gesendet und sind nicht Teil des portablen Config-Backups.

FFmpeg benötigt die endgültige RTMP/RTMPS-Ausgabe-URL an der lokalen Prozessgrenze. Deshalb werden bekannte Secret-Werte aus FFmpeg-Status-/Fehlermeldungen redigiert und niemals absichtlich geloggt. Die Betriebssystem-Prozessgrenze bleibt lokal und wird im späteren Security-Pass nochmals geprüft.

## Bewusst noch offen

Dieser Pass ist **Repository-/Engine-Core**, nicht die finale Windows-Abnahme. Noch nicht als real bestätigt sind:

- tatsächliches Screen-/Window-/Camera-Capture auf einem Windows-PC
- native Game-Capture-Hooks wie bei OBS (Fenster-Capture ist kein Ersatz dafür)
- natives Desktop-Audio/Loopback ohne ein passendes DirectShow-Gerät
- mehrere Audio-Busse, Mixer, Metering und Monitoring
- echte Hardware-Encoding-Lasttests
- echter RTMP/RTMPS-Test zu einer Plattform
- Multistream-Dauertest mit zwei oder mehr Zielen
- Watchdog, Dropped-Frames-Auswertung und Auto-Tuning
- crash-sicherer MKV→MP4-Remux-Workflow

## Test

```powershell
npm.cmd run stream-engine21:check
```

Repository-Ergebnis bei Erstellung dieses Passes: **76/76 PASS**.

Die reale Windows-Abnahme bleibt in der Master-Checkliste gelb/offen, bis sie auf echter Streaming-Hardware durchgeführt wurde.
