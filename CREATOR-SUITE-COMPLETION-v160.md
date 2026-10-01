# Creator Suite Completion v160

v160 schließt die öffentliche Twitch-LIVE-Statuslücke auf der Startseite.

## Fertig
- Twitch Helix `streams` als direkte öffentliche LIVE/OFFLINE-Quelle eingebunden
- kurzer shared Server-Cache gegen API-Hammering
- Twitch LIVE priorisiert, ohne andere positive LIVE-Signale zu zerstören
- Twitch OFFLINE kann bisherigen `STATUS OFFEN` zuverlässig auflösen
- EventSub und Polling speichern LIVE→OFFLINE-Zeitpunkt
- bestehende Installationen können letzten Stream aus dem neuesten Twitch-Archiv bootstrappen
- direkter Twitch-Kanal-Link auf der Startseite
- TikTok-Kanal bleibt als zweiter Kanal-Link erhalten
- Twitch Viewer/Game/Streamtitel werden serverseitig übernommen
- Tokens/Secrets bleiben vollständig serverseitig
- Backend auf 3.20.6 synchronisiert; Schema 73 und Launcher 0.47.29 unverändert

## Acceptance weiterhin offen
Der Codevertrag ist grün. Für die reale Produktionsabnahme muss mit dem tatsächlich verbundenen Twitch-Konto einmal LIVE → OFFLINE getestet werden, damit API, EventSub, Deployment-Konfiguration und Anzeige gemeinsam bestätigt werden.
