# Pass 21.8 — CFS Stream Studio Foundation

## Ziel
Ein eigenes Streaming-Cockpit auf Basis der vorhandenen CFS Creator Suite. Kein OBS-Klon: Scene Studio, Widgets, Overlays, Launcher und eigene Output-Presets werden in einem gemeinsamen Control Plane zusammengeführt.

## Enthalten
- neue interne Seite `public/pages/stream-studio.html`
- Preview/Program-Workflow mit TAKE und vorhandenen Scene-Transitions
- Bibliothek aller Creator-Widgets; veröffentlichte Widgets und statische Overlays können direkt in den Quick Overlay Rack
- Overlay-Positionen im Program-Monitor per Drag & Drop
- lokale Capture-Auswahl für Bildschirm, Fenster, Game und Kamera
- Audio-Zielwerte für Mikrofon, Desktop, Musik und Alerts
- Output-Presets für Auflösung/FPS, Ziel, Encoder, Bitrate, Audio und Aufnahmeformat
- dedizierte Creator-API `GET/PUT /api/creator/stream-studio`
- geschützte Launcher-Bridge `GET /api/bridge/stream-studio/config`
- Stream-Keys werden bewusst nicht in den Cloud-Einstellungen gespeichert

## Architekturgrenze
Pass 21.8 baut die Website-Steuerzentrale und den sicheren Konfigurationskanal. Echtes Screen-/Window-/Game-/Camera-Capture, Audio-Routing, Recording und RTMP/RTMPS-Encoding bleibt lokal im Desktop Launcher und wird in einem späteren Desktop-Engine-Pass umgesetzt.

## Prüfung
```powershell
npm.cmd run stream21:check
```
Nach Deploy:
```powershell
npm.cmd run production21:stream-smoke
```
