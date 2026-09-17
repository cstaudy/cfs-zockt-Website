# Pass 21.10.10 – CFS Studio Hub & Stream Session Dashboard

## Architekturentscheidung

CFS wird **in der Bedienung zusammengeführt**, aber **nicht als ein technischer Monolith** gebaut.

- **LIVE / Scene Composer / Live Audio Mixer:** direkt im CFS Stream Studio.
- **Widget Studio:** eigener Builder, seine Widgets und Overlays stehen im Stream Studio als Quellen bereit.
- **Cut Studio:** eigener Postproduktions-Workspace. Export läuft lokal über den Launcher und darf einen laufenden Stream nicht unnötig beeinflussen.
- **Audio Studio:** fortgeschrittene Presets/Processing bleiben als eigener Bereich; der Live-Mixer sitzt direkt im Stream Studio.
- **Launcher:** bleibt eine separate Desktop-Anwendung und lokale Media Engine. Das Stream Studio zeigt Status und Konfiguration, aber Stream-Keys, Capture und Rohmedien bleiben lokal.

Damit gilt: **ein Studio für den Creator, getrennte Fehler- und Sicherheitsdomänen unter der Haube.**

## Neu in Pass 21.10.10

- CFS Studio Hub im Stream Studio mit LIVE, AUDIO, CUT, LAUNCHER und WIDGETS.
- Rückwege aus Cut Studio, Audio Studio und Launcher in den gemeinsamen Studio-Workflow.
- Neues verschiebbares **Stream Session**-Panel.
- Session-Status, Laufzeit, Startzeit, aktive Ziele, Upload und Reconnects.
- Datenmenge wird nur als klar gekennzeichnete lokale Schätzung **seit dem aktuellen Studio-Aufruf** berechnet.
- Session-Panel liest ausschließlich bereits bereinigte Runtime-Telemetrie.
- Keine Stream-Keys, RTMP-Adressen, Roh-Audio- oder Roh-Video-Daten im Browser-Dashboard.

## Noch offen

- Reale Windows-Live-Session zur Kalibrierung von Telemetrie und Zeit-/Datenanzeigen.
- Persistente Session-Historie nur dann, wenn wir später einen datenschutzarmen Zweck dafür definieren.
- Direkte Start/Stop-Kommandos aus der Website erst nach einem separat abgesicherten Command-Kanal. Bis dahin bleibt die aktive Engine-Steuerung im Launcher.
