# cfs_zockt – Technical Acceptance Part 2

Dieser Gate deckt den realen Abnahmeweg soweit automatisierbar ab, ohne einen fremden TikTok- oder OBS-Account in CI zu benötigen.

Automatisch geprüft werden:

- TikTool Provider: Follow, Like, Gift, Share, Viewer und Chat
- Offline-Spool bei Netzwerkunterbrechung
- Launcher-Neustart mit ausstehenden Events
- Resume/Reconnect ohne doppelte Events
- Stream-Bot Konfiguration und TTS-Action/ACK
- Stream-Deck Counter +1/-1/+5/Reset
- Stream-Timer Start/Pause, +/- 1 Minute und Reset
- Alert-Sound-Synthese inklusive Test-Alert
- OBS/Local-Output Window und Test-Events
- 12 parallele OBS Browser-Source Poller
- bestehende Security-/Secret-Gates

## Letzter manueller Real-World-Gate vor Release

Dieser Teil kann nicht seriös in CI simuliert werden und muss mit einem echten Creator-Account einmal durchgeführt werden:

1. TikTok LIVE starten und TikTool verbinden.
2. Je einen echten Follow-, Like-, Gift-, Share-, Viewer- und Chat-Event prüfen.
3. Follow/Gift/Share Alert in einer echten OBS/TikTok-Ausgabe inklusive Ton hören.
4. Chat Widget öffnen und Sonderzeichen/Emoji testen.
5. Stream-Bot Command aus dem echten TikTok Chat auslösen.
6. Über CFS Stream Deck einen Counter und den Stream Timer bedienen.
7. Netzwerk kurz trennen, wieder verbinden und prüfen, dass kein Event doppelt erscheint.
8. Launcher neu starten und prüfen, dass Deck, Bot und ausstehende Queue wiederhergestellt sind.
9. Mindestens 30 Minuten mit mehreren Browser Sources/Widgets laufen lassen.

Erst nach diesem manuellen Gate sollte der Stand versioniert und als neuer Launcher-Build veröffentlicht werden.
