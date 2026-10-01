# CFS Studio Operator Workspace v168

## Ziel

CFS Studio soll sich wie ein Streaming-Arbeitsplatz anfühlen und nicht wie eine technische Einstellungsseite. Die normale Produktion bleibt im ersten Blick sichtbar; seltene oder technische Funktionen liegen dahinter.

## Standard-Arbeitsplatz

- **Links:** Scenes und Quellen
- **Mitte:** Preview, Program, Scene Composer, Übergang und Quick Overlays
- **Rechts:** Stream Session, Stream-Check und Multistream-Ziele
- **Unten:** Audio Mixer direkt sichtbar
- **Bei Bedarf:** Capture, Output, Live Health und Multi-Chat/Activity

## Workspace-Migration

Das neue Standardlayout verwendet Workspace-Schema **v3**. Nur ein unverändertes altes v2-Standardlayout wird automatisch auf die neue Ordnung gehoben. Sobald ein Creator Panels, Größen oder Seitenbreiten individuell angepasst hat, wird diese Anordnung nicht ungefragt zurückgesetzt.

## Bedienung

Layout-/Workspace-Werkzeuge sind standardmäßig eingeklappt. Im Layout-Modus werden eingeklappte Dock-Panels vorübergehend geöffnet, damit sie verschoben und skaliert werden können. Deep-Links wie `#stream-output` oder `#stream-activity` öffnen das jeweilige Panel automatisch.

## Produktgrenze

CFS Studio bleibt die Produktionsoberfläche. Der Launcher bleibt lokale Engine, Capture-/Encoding-Laufzeit und Secret-Grenze. OBS bleibt optional.

## Verifikation

- `studio-operator168:check`: **92/92 PASS**
- `project:check`: **40/40 PASS**
- kompletter `release:v168`: **PASS / Exit 0**
