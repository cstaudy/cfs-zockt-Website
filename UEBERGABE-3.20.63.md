# CFS Zockt · Übergabe 3.20.63

## Basis / Ziel
3.20.62 → 3.20.63 · Arbeitsblock 05, Cut Studio: lokale audiovisuelle Einzelclip-Vorschau und Exportplan-Prüfung, abgesicherte Job-Queue sowie realer Software-Codec-Smoke-Test.

## Status
**CODE-TESTS PASS · REALE WINDOWS-/OBS-/BROWSER-ACCEPTANCE HOLD.** 28 neue Tests und fokussierte Regression bestanden; synthetischer H.264/AAC-Softwareexport auf Linux mit echtem FFmpeg/FFprobe validiert. Keine Live-Freigabe und keine Hardware-Encoder-Validierung.

## Neuer Funktionsstand
- Lokale Videodatei abspielen; Start-/Endmarken auf ausgewählten Clip übernehmen.
- Caption als sichere reine Text-Einblendung anzeigen; Positions-/Basisstil aus Clip-Einstellungen übernehmen.
- Für eine **Einzelclip-Hörprobe** zusätzlich eine lokale Musikdatei und eine Voiceover-Datei auswählen. Startverzögerung, Musik-Loop und vereinfachte Gain/Mute/Solo-Werte werden am Video-Playhead ausgerichtet. Keine persistierten Audiofiles; temporäre Blob-URLs werden freigegeben.
- **Explizite Begrenzung:** keine exakte Vorschau des finalen Launcher-Mixes. Keine SFX-/Multitrack-/Pan-/Duck-/Fades-/Keyframes-/Transition-/Loudnorm-Simulation. Gespeicherte Projektdaten und Video müssen weiterhin im Launcher zugeordnet werden.
- Exportplan-Check: markierte Clips und Grenzen, Quellname/Dateimismatch, lokales Videolängenlimit nur bei passendem Quelldateinamen, aktive Audio-Dateinamen, Caption-Warnungen; keine Job-Erstellung bei Fehlern; unveränderte Speichern-vor-Queue-Reihenfolge.

## Verifizierter Testumfang
- `node tools/cut-preview-v32063-test.mjs`: **28/28 PASS** (reine Funktionen, Browser-Controller mit Fake DOM, Blob-Cleanup, sichere Caption, Job-Preflight).
- `npm run check:v32063`: **PASS** nach Anpassung rein versionsgebundener älterer Testassertions (`3.20.61`/`3.20.62` dürfen durch Nachfolgeversion ergänzt werden). Enthält v32062/v32061/v32060 Provider-/Widget-Regression und vorheriges `cut-export-workflow-test.cjs`.
- `npm run cut:v32063:media-smoke`: **PASS** auf Linux mit installiertem `ffmpeg`/`ffprobe`: bestehende `CutMediaEngine` erzeugt realen vertikalen Einzelclip, **H.264 + AAC, 360×640, 1,1 s**. Softwareencoder; kein Plattform-/Hardware-Nachweis.
- Weiterhin **keine** reale Hörprüfung im Zielbrowser, keine Windows-/OBS-Evidenz, kein vollständiger externer Encoder-Support oder Render für komplexe Reel-/Mehrspur-Projekte.

## Bewusst nicht geändert
Schema 80, Launcher 0.47.31 (Quellcode unverändert), Stream Maker, Widgets, Anbieterbindungen, Checkout. Keine DB-Migration, kein Windows-Build, keine Änderung am Server-Export-Vertrag. Alte Designkatalog-Dateien und historische Testdateien fehlen weiterhin.

## Installation
Delta 3.20.62 → 3.20.63, nur bei passenden SHA-256-Ausgangsständen. `node install-update.cjs --check <Projekt>`, dann `--apply`, danach `npm run check:v32063`. Backup beim Anwenden, Abbruch bei Konflikt mit benutzerdefinierten Änderungen. Für eine Neuinstallation das Vollarchiv verwenden.

## Nächste Arbeiten
Cut Studio im echten Browser/Launcher testen, Windows Encoder NVENC/QSV/AMF separat prüfen, Mehrspur-/Caption-/Übergangs-Exporte samt Audio-Sync und resultierendem MediaInfo/FFprobe erfassen. Danach fehlende Original-Designpakete (06), CFS AI (07), optionales Checkout-Gate (08); Provider-/OBS-/Windows-Soak bleibt übergreifender Blocker. **BETA HOLD**.
