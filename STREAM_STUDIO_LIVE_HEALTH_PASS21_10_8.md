# CFS Stream Studio – Pass 21.10.8 Live Health

Stand: 2026-09-17

## Neu

- verschiebbares **Live Health** Panel direkt im Stream Studio
- Launcher-Heartbeat transportiert ausschließlich whiteliste technische Streaming-Telemetrie
- Engine-Status, LIVE-Ziele, aktive Upload-Bitrate, Dropped Frames, Encoder-Speed, Reconnects und Watchdog-Restarts
- Status pro Ziel mit FPS, Bitrate, Speed, Dropped Frames und Reconnect-Countdown
- leichter Runtime-Endpunkt `/api/creator/stream-studio/runtime` statt vollständigem Studio-Reload
- 5-Sekunden-Polling nur bei sichtbarem Browser-Tab
- Telemetrie wird nach 25 Sekunden als veraltet behandelt; Launcher-Heartbeat nach 30 Sekunden als offline
- Stream-Keys, RTMP-Adressen, lokale Recording-Pfade sowie Roh-Audio/-Video werden nicht in die Telemetrie übernommen

## Grenzen

Die Anzeige basiert auf FFmpeg-Progress und Launcher-Heartbeat. `ENCODER SPEED` ist der Echtzeitfaktor von FFmpeg, keine erfundene GPU-Prozentanzeige. CPU/GPU-Prozentwerte werden erst ergänzt, wenn wir sie auf Windows zuverlässig und herstellerunabhängig messen.

## Test

`npm.cmd run stream-health21:check`
