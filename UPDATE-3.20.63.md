# Update 3.20.63 · Cut Studio

## Was sich ändert
- Die vorhandene lokale Videovorschau erhält eine Caption-Einblendung sowie zwei optionale, lokal zugeladene Audiodateien für vereinfachtes Musikhören und Voiceover.
- Für Einzelclips werden Video- und Audio-Playheads bei Abspielen/Seek/Pause gekoppelt. Loop und Startpunkt orientieren sich an Clip-/Audio-Einstellungen.
- Der Export-Check zeigt Fehler und Warnungen in Klartext. Ein ungültiger Plan kann keinen Launcher-Export-Job mehr erzeugen.
- Neuer Test für lokalen FFmpeg-H.264/AAC-Export und unabhängige FFprobe-Metadatenprüfung (nur wenn FFmpeg und FFprobe lokal installiert sind).

## Geprüft
28 neue Unit-/Integrationstests; fokussierte Regression; Linux-Softwareexport H.264/AAC, 360x640 und 1,1 s. Keine Behauptung über Windows-Hardwareencoder, OBS oder reale Audiovorschau.

## Bewusste Grenzen
Nur ein ausgewählter Clip, eine Musik- und eine Voice-Datei. Kein vollständiger finaler Render im Webbrowser. Projektdaten/Medien im Launcher zuordnen. Keine Cloud-Uploads der Mediendateien.

## Upgrade
Nur Delta von 3.20.62; nach Installation `npm run check:v32063`. Alternativ komplettes 3.20.63-Archiv verwenden. Keine Migration/Launcher-Veränderung.
