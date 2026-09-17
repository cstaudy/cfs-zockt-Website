# Pass 21.10.1 – Windows Real-World Acceptance

Diese Abnahme ist bewusst **noch offen**. Sie wird erst auf einem echten Windows-PC mit dem gebauten Launcher durchgeführt.

## Reihenfolge

1. Launcher starten und mit dem Creator Account verbinden.
2. **STREAM ENGINE → ENGINE PRÜFEN**. FFmpeg muss bereit sein; erkannte Encoder werden angezeigt.
3. **STUDIO SYNC**. Die in der Website aktivierten Streaming-Ziele müssen erscheinen.
4. **GERÄTE LADEN**. Kamera- und Audio-Geräte prüfen.
5. Zuerst **Recording only** bzw. parallele lokale Aufnahme aktivieren und mit Bildschirm-Capture testen.
6. 60 Sekunden aufnehmen, Datei stoppen und vollständig abspielen.
7. Window-Capture testen; bei Borderless-Game prüfen, ob Bild, FPS und Fokus stabil bleiben.
8. Kamera + ein lokales Audio-Gerät testen.
9. Erst danach ein privates/unlisted RTMP/RTMPS-Testziel konfigurieren. Stream-Key niemals in Chat, Screenshot oder Testlog kopieren.
10. Einen 10-Minuten-Teststream durchführen und FPS, Bitrate, Reconnects sowie Audio/Video-Sync beobachten.
11. Danach zwei Ziele gleichzeitig testen. Ein Ziel absichtlich trennen und bestätigen, dass das andere Ziel weiterläuft.
12. Launcher während einer lokalen Aufnahme/Stream-Session sauber stoppen und prüfen, dass FFmpeg-Prozesse beendet werden.

## PASS erst wenn real bestätigt

- Screen Capture stabil
- Window Capture stabil
- Kamera stabil
- gewähltes Audio-Gerät stabil
- Hardware-Encoder auf dem vorhandenen PC stabil
- MKV-Aufnahme abspielbar
- RTMP/RTMPS-Verbindung stabil
- zwei parallele Ziele stabil
- Fehler eines Ziels stoppt das andere nicht
- Stream-Key erscheint weder in Launcher-UI-Status noch in Logs/Exporten

Native Game Capture, Desktop-Audio-Loopback, mehrere Audio-Busse und Auto-Tuning gehören in Pass 21.10.2 und sind nicht Bestandteil dieser Real-World-Abnahme.
