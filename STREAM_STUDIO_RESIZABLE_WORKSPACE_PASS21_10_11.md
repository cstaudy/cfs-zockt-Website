# Stream Studio Resizable Workspace – Pass 21.10.11

## Ziel

Der CFS Stream Studio Workspace soll sich wie ein echter Produktionsarbeitsplatz anpassen lassen: Panels können verschoben **und** in der Größe geändert werden. Dazu gehören ausdrücklich Szenen, Preview/Program, Scene Composer, Szenenübergang, Quellen, Quick Overlay Rack, lokale Quellen, Audio Mixer, Output, Stream Check, Stream Session, Live Health, Multi-Chat und Multistream.

## Bedienung

1. `LAYOUT ANPASSEN` aktivieren.
2. Mit `↕ VERSCHIEBEN` ein Panel in eine andere Dock-Zone ziehen.
3. Mit dem Eckgriff `↘` Breite und Höhe ändern.
4. Doppelklick auf `↘` setzt nur die Größe dieses Panels zurück.
5. Die Trennkante der linken/rechten Studio-Spalte kann im Layout-Modus gezogen werden.
6. `STANDARDLAYOUT` setzt Positionen, Größen und Seitenbreiten komplett zurück.

Die Resize-Griffe unterstützen zusätzlich die Pfeiltasten. Mit `Shift` wird in größeren Schritten verändert.

## Sicherheit

Es werden keine CSS-Fragmente, HTML-Inhalte oder freien Style-Strings gespeichert. Persistiert werden nur:
- bekannte Panel-IDs,
- bekannte Dock-Zonen,
- numerisch begrenzte Breite/Höhe je Panel,
- numerisch begrenzte Breite der linken/rechten Studio-Spalte.

Der Server normalisiert die Werte erneut. Unbekannte Panel-IDs werden verworfen.

## Responsive Verhalten

Auf kleinen Viewports wird das Studio weiterhin einspaltig dargestellt. Gespeicherte Desktop-Größen bleiben erhalten, werden mobil aber nicht erzwungen.

## Repository Acceptance

`npm.cmd run studio-resize21:check`

Der Pass ist erst dann Production-bestätigt, wenn das Verhalten nach Deploy auch in einem echten Desktop-Browser geprüft wurde.
