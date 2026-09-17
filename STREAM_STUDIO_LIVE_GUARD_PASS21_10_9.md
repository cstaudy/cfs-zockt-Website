# CFS Stream Studio – Live Guard Pass 21.10.9

Stand: 2026-09-17

## Ziel

Live Guard wertet die bereits vorhandene, secret-freie Launcher-Telemetrie im Browser aus und macht technische Streaming-Probleme verständlich. Die Diagnose ist absichtlich beratend: Sie verändert keine Bitrate, keinen Encoder, keine Scene und kein Streaming-Ziel automatisch.

## Umgesetzt

- rollierender Telemetrieverlauf im Browser für maximal ca. 2 Minuten
- Trendfenster für Dropped Frames, Reconnects und Watchdog-Eingriffe
- Encoder-Speed-Warnung unter 0,98×; kritisch unter 0,90×
- Warnung bei steigenden Dropped Frames
- Warnung/Kritisch bei wiederholten Reconnects und Watchdog-Restarts
- Zielstatus `error` und `reconnecting` werden verständlich erklärt
- Vergleich gemessene vs. konfigurierte Bitrate je LIVE-Ziel
- Profilabhängige FPS-Diagnose für 30-/60-FPS-Outputs
- Statusstufen: BEREIT / STABIL / WARNUNG / KRITISCH / OFFLINE
- maximal acht aktive Hinweise gleichzeitig, damit das Studio lesbar bleibt
- sichere Ausgabe ausschließlich per `textContent`

## Bewusste Grenzen

- keine automatische Reduktion von Bitrate/FPS
- kein automatischer Encoder-Wechsel
- kein automatisches Stoppen oder Starten eines Streaming-Ziels
- keine behauptete Internet-Speed-Messung: die echte verfügbare Upload-Kapazität ist noch nicht Teil der Telemetrie
- CPU-/GPU-Prozentwerte bleiben offen, bis die Windows-Messung zuverlässig profiliert wurde
- Grenzwerte sind konservative Produktheuristiken und müssen im echten Windows-Dauertest kalibriert werden

## Repository-Test

```powershell
npm.cmd run stream-guard21:check
```

Die reale Abnahme bleibt: YouTube/Twitch (danach TikTok) unter Last streamen, Warnungen mit echten Drops/Reconnects überprüfen und Schwellenwerte bei Bedarf kalibrieren.
