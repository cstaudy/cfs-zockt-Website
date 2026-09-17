# Pass 21.9.1 – Dockable Stream Studio Workspace

Stand: 2026-09-17

## Ziel

Das CFS Stream Studio soll sich wie ein echtes Produktions-Workspace anfühlen. Creator können wichtige Studio-Panels an die Stelle verschieben, an der sie sie während des Streams brauchen, ohne dass dabei beliebiges HTML, CSS oder Script gespeichert wird.

## Umgesetzt

- Layout-Bearbeitungsmodus mit explizitem Button `LAYOUT ANPASSEN`.
- Eigener Drag-Handle pro Studio-Panel, damit normale Slider, Selects, Buttons und Formfelder nicht versehentlich als Drag-Fläche dienen.
- Verschiebbare Panels:
  - Szenen
  - Szenenübergang
  - Quick Overlay Rack
  - Quellen
  - lokale Capture-Quellen
  - Audio Mixer
  - Output
  - Local Multistream
- Fünf Dock-Zonen: links, Mitte, rechts, unten und breit.
- Panels passen ihr Raster automatisch an schmale Seitendocks an.
- Das Layout wird als reine ID-/Zonen-Konfiguration gespeichert.
- Server-Allowlist akzeptiert ausschließlich bekannte Zonen und bekannte Panel-IDs.
- Doppelte, unbekannte oder fehlende Panels werden bei der Normalisierung bereinigt bzw. auf sichere Defaults zurückgeführt.
- `STANDARDLAYOUT` stellt jederzeit die Ausgangsanordnung wieder her.
- Änderungen am Workspace werden automatisch gespeichert.
- Bestehende Scene-, Transition-, Widget-, Audio-, Output- und Multistream-Konfiguration bleibt davon getrennt erhalten.

## Sicherheitsgrenze

Die Workspace-Konfiguration speichert keine benutzerdefinierten HTML-, CSS- oder JavaScript-Fragmente. Sie enthält nur eine feste, serverseitig geprüfte Reihenfolge bekannter Panel-IDs innerhalb bekannter Dock-Zonen. Streamkeys, RTMP-Zugangsdaten sowie Rohvideo und Rowaudio bleiben weiterhin außerhalb der Cloud-Konfiguration.

## Standardlayout

- Links: Szenen
- Mitte: Szenenübergang, Quick Overlay Rack
- Rechts: Quellen
- Unten: lokale Quellen, Audio Mixer, Output
- Breit: Local Multistream

## Nächster UI-Schritt

Pass 21.9.2 integriert das bisherige Scene Studio als **Scene Composer** direkt in das Stream Studio. Danach sollen Scene-Erstellung, Ebenen, Quellen, Widgets, Transform, Crop, Sichtbarkeit, Reihenfolge und Übergänge ohne Wechsel auf eine separate Hauptseite bearbeitet werden können.

## Prüfung

```powershell
npm.cmd run studio-layout21:check
```
