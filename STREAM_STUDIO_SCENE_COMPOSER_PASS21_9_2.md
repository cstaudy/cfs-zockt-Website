# CFS Stream Studio – Scene Composer Pass 21.9.2

**Stand:** 2026-09-17  
**Status:** Repository-Abnahme PASS · Production-/Browser-Abnahme nach Deploy offen

## Ziel

Das bisher separate Scene Studio wird als **Scene Composer** direkt in das CFS Stream Studio integriert. Das alte Scene Studio bleibt vorerst als kompatibler Fallback bestehen, damit bestehende Links und Workflows nicht abrupt brechen.

## Umgesetzt

- Scene Composer als eigenes verschiebbares Studio-Panel
- 16:9- und 9:16-Scenes direkt im Stream Studio erstellen
- Scenes direkt auswählen und bearbeiten
- Scene-Namen, Format, Hintergrund und Safe Area bearbeiten
- Scene-Übergang: Schnitt, Fade, Dissolve, Slide und Zoom
- Übergangsdauer und Easing direkt konfigurieren
- Übergang direkt im Composer testen
- veröffentlichte Widgets und Overlays nativ zur Scene hinzufügen
- Source-Position per Drag & Drop auf dem Canvas
- X/Y, Skalierung, Rotation, Deckkraft und Ebene numerisch bearbeiten
- Source ein-/ausblenden
- Source sperren / entsperren
- Ebene vor / zurück
- Source aus Scene entfernen
- Scene speichern
- Scene veröffentlichen
- Scene duplizieren
- Scene mit expliziter Bestätigung löschen
- Scene-Reihenfolge per Drag & Drop sortieren
- nur veröffentlichte Scenes können Preview / Program übernehmen
- Scene-Reihenfolge wird nur als erlaubte, Creator-eigene Scene-ID gespeichert
- Scene-Source-Besitz und Publish-Status bleiben serverseitig geprüft
- Stream Studio behält die sichere Trennung: Cloud = Control Plane, Launcher = lokale Media Engine

## Nicht in diesem Pass

- Crop / Maskierung
- Source-Filter wie Chroma Key, Blur oder Color Correction
- echte lokale Capture-Engine
- echte Encoder-/Recording-Engine
- echte RTMP-/RTMPS-Ausgabe
- echter Multistream-Datenpfad
- finale Browser-/Production-Abnahme

Diese Punkte bleiben bewusst offen und werden in den nächsten Passes umgesetzt bzw. getestet.

## Sicherheitsgrenzen

Der Scene Composer verwendet weiterhin die bestehenden authentisierten Creator-Routen. Scene-Konfigurationen werden serverseitig allowlist-basiert bereinigt. Eine Scene kann nur Creator-eigene veröffentlichte Quellen enthalten. Draft-Quellen können nicht veröffentlicht werden. Die Stream-Studio-Konfiguration speichert keine Stream-Keys oder RTMP-Zugangsdaten.

## Repository-Checks

```text
Stream Studio Scene Composer Pass 21.9.2: 115/115 PASS
Stream Studio Dock Layout Pass 21.9.1:      60/60 PASS
Stream Studio Foundation Pass 21.8:         46/46 PASS
Local Multistream Pass 21.9:                70/70 PASS
Scene Transitions Pass 21.7:                59/59 PASS
End-to-End Acceptance Pass 21.6:            88/88 PASS
Integration Acceptance Pass 21.5:           52/52 PASS
GitHub Repository Readiness Pass 21:         30/30 PASS
```

## Lokal prüfen

```powershell
npm.cmd run scene-composer21:check
```

## Nach GitHub-Push und Render-Deploy prüfen

```powershell
npm.cmd run production21:scene-composer-smoke
```

Der Production-Smoke ist nicht destruktiv. Er erstellt, verändert oder veröffentlicht keine Scene. Er prüft nur die ausgelieferte Oberfläche und die Schutzgrenzen der anonymen APIs.

## Nächster Block

**Pass 21.10 – Stream Studio + Launcher Streaming Engine Integration**

Danach folgen echtes Screen-/Window-/Game-Capture, Kamera, Mikrofon/Desktop-Audio, Hardware-Encoding, Recording, RTMP/RTMPS, Reconnect, Zielisolierung und der reale Local-Multistream-Datenpfad.
