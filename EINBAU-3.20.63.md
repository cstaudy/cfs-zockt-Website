# CFS Zockt – Einbau 3.20.63

## Delta auf Basis 3.20.62
1. Projektkopie mit **exakt** Version 3.20.62 verwenden. Backup außerhalb des Projektordners empfohlen.
2. `CFS-Zockt-Update-3.20.63-Delta.zip` entpacken.
3. Aus dem entpackten Ordner `cfs-zockt-UPDATE-3.20.63`: `node install-update.cjs --check <Projektpfad>`.
4. Bei `CHECK OK` mit `node install-update.cjs --apply <Projektpfad>` installieren. Vorhandene ersetzte Dateien werden unter `.cfs-backups/3.20.63/...` gesichert. Bei `CONFLICT` manuell mergen; **nicht** erzwingen.
5. Im Projekt `npm run check:v32063` ausführen; optional `npm run cut:v32063:media-smoke` für echte lokale Softwarecodec-Prüfung (benötigt `ffmpeg` + `ffprobe`).
6. Cut Studio im Browser öffnen, ein Projekt laden, Quelle auswählen, optionale Musik/Voice-Dateien zur Hörprobe laden, einen Clip anspielen, Caption prüfen, anschließend Exportplan prüfen und den Job zum Launcher schicken.

## Abnahme nach der Installation
- Browser (Desktop/Mobilgerät): Wiedergabe/Seek, Caption, Mute/Solo, Startoffset, Musikloop, Blobs beim Reset und Browser-Autoplay-Einschränkungen testen.
- Windows: FFmpeg-Einsatz auf Zielgerät, echte Quelldateien inkl. Audiokanäle, CPU/GPU-Renderer, Exportresultate mit FFprobe, A/V Sync, Übergänge, Captions und OBS-Wiedergabe dokumentieren.
- Codec-Matrix: H.264/AAC via Software auf Linux in dieser Version **verifiziert**; NVIDIA NVENC, Intel QSV, AMD AMF, Windows FFmpeg-Bundle und OBS **nicht verifiziert**. Eine verfügbare Option im UI ist kein erfolgreicher Render-Nachweis.
- BETA-Freigabe bis zur realen Acceptance **HOLD**.
