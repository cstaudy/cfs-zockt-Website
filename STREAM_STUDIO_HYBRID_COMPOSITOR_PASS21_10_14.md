# CFS Creator Suite – Pass 21.10.14

## Hybrid Widget + Native Compositor

Pass 21.10.14 führt CFS-Widgets und lokale Native Sources in einem gemeinsamen lokalen FFmpeg-Scene-Graph zusammen.

### Umgesetzt

- veröffentlichte Program-Scenes werden für den Launcher mit den benötigten Widget-Runtime-Quellen hydratisiert
- Widgets werden im Launcher in sandboxed Electron-Offscreen-Renderern geladen
- Widget-Frames werden als transparente BGRA-Rawvideo-Quellen über zusätzliche lokale Prozess-Pipes an FFmpeg geliefert
- Widget-URLs und Public Tokens werden nicht in Launcher-Telemetrie oder Scene-Graph-Summaries ausgegeben
- Native Sources und Widget Sources werden gemeinsam nach `z_index` sortiert und in genau dieser Reihenfolge komponiert
- Position, Scale, Rotation, Opacity, Crop und Source-Filter laufen für beide Source-Klassen durch denselben Video-Compiler
- LIVE / RECORDING sowie 16:9 / 9:16 Routing wird vor dem lokalen Merge ausgewertet
- Widget-only Scenes behalten den bisherigen lokalen Capture-Pfad als Basis und legen Widgets darüber
- Hybrid Scenes mit expliziten nativen Quellen nutzen ausschließlich die Scene-Sources plus Widgets; der alte Capture-Pfad wird nicht versehentlich zusätzlich eingeblendet
- fehlende Widget-Runtime-Metadaten führen fail-safe auf den bisherigen Legacy-Capture-Pfad zurück statt einen unvollständigen Hybrid-Output zu behaupten
- Widget-Renderer sind auf 30 FPS begrenzt und berücksichtigen Pipe-Backpressure
- FFmpeg-Prozesse erhalten pro benötigter Widget-Quelle eine eigene zusätzliche stdio-Pipe; Quellen können zwischen mehreren Scene-Items wiederverwendet werden

### Sicherheitsgrenzen

- Offscreen BrowserWindows verwenden `sandbox`, `contextIsolation`, kein Node-Integration und kein Window-Opening
- nur HTTPS-Widget-URLs unter `/widgets/` sind remote erlaubt; localhost bleibt für lokale Entwicklung möglich
- Widget-Browseraudio ist im Compositor stumm; Audio bleibt weiterhin über die lokalen Audio-Busse kontrolliert
- Streamkeys, RTMP-Ziele und lokale Gerätebindungen bleiben ausschließlich im Launcher

### Bewusst noch offen

- echte native Game-Capture-Hooks statt Window/GDI-Foundation
- Windows Application Audio Capture / WASAPI-Prozessquellen
- zusätzliche Audio-Busse und mehr als drei Recording-Tracks
- Scene-Hot-Switch ohne FFmpeg-Neustart
- Performance-Profiling der Offscreen-BGRA-Pipeline für 3–4 parallele Ziele
- realer Windows-Soak-Test mit YouTube + Twitch + TikTok

### Repository-Prüfung

```powershell
npm.cmd run studio-hybrid21:check
npm.cmd run stream-studio21:check
```
