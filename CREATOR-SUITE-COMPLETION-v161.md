# Creator Suite Completion v161

v161 schließt zwei sichtbare Punkte der öffentlichen Startseite: TikTok erhält einen eigenen nachvollziehbaren LIVE-/Last-LIVE-Pfad und das CFS-Logo wird ohne schwarzen Bildblock eingebettet.

## Fertig
- TikTok-LIVE-State aus `integration_health.live_provider` korrekt gelesen
- TikTool/TikFinity/TikTok als getrennte TikTok-Tracking-Provider erkannt
- explizite Offline-/Idle-/Disconnected-Zustände gegen stale LIVE-Evidence abgesichert
- TikTok LIVE→OFFLINE-Historie für `Zuletzt live` in bestehendem Provider-State gespeichert
- bestehende TikTok-Live-Sessions als historische Quelle berücksichtigt
- Twitch und TikTok getrennt auf der Startseite dargestellt
- Multistream-Zustand bei gleichzeitigem Twitch- und TikTok-LIVE unterstützt
- eigener letzter LIVE-Zeitpunkt je Plattform
- Twitch- und TikTok-Kanalbuttons weiterhin direkt erreichbar
- altes Logo mit eingebranntem schwarzem Hintergrund auf echtes transparentes RGBA-Wortlogo umgestellt
- Header/Footer für transparentes Logo und Mobile-Layout angepasst
- Backend 3.20.7; Schema 73; Launcher 0.47.29

## Wichtige Grenze
Twitch besitzt im CFS-Pfad eine direkte serverseitige Helix-LIVE-Prüfung. TikTok wird dagegen über das lokal verbundene Launcher-LIVE-Signal erkannt und deshalb bewusst nicht als autoritativer direkter TikTok-API-Status bezeichnet.

## Acceptance weiterhin offen
Für den realen TikTok-Nachweis muss auf dem Windows-PC der gewünschte TikTok-LIVE-Provider im Launcher verbunden sein und ein echter LIVE→OFFLINE-Lauf durchgeführt werden. Erst dann ist auch der konkrete Provider-/Deployment-Pfad in der Produktionsumgebung bestätigt.
