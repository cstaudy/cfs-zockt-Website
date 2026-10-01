# Security Baseline v160

v160 erweitert die öffentliche Startseite um Twitch-LIVE-Status, ohne Provider-Secrets in den Browser zu verschieben.

- Twitch LIVE wird serverseitig mit einem App Access Token geprüft.
- Die öffentliche DB-Abfrage liest nur `connected`, `twitch_user_id`, `login`, `display_name`, `updated_at`.
- Access Token, Refresh Token, Client Secret und Stream Key werden nicht in der öffentlichen Payload ausgegeben.
- Der öffentliche Twitch-Link wird auf HTTPS und `twitch.tv` / `www.twitch.tv` begrenzt.
- Twitch API-Ergebnisse werden kurz serverseitig gecacht; parallele Requests teilen denselben In-Flight-Request.
- Bei API-Fehlern wird nur ein sehr kurz zuvor bestätigter LIVE-State als nicht-autoritativer Fallback verwendet; ansonsten bleibt der Status `unknown` statt fälschlich OFFLINE/LIVE zu behaupten.
- Historische VOD-Daten werden nur als öffentlicher Zeit-/Titelkontext verwendet und ohne Tokens gespeichert.

`public-twitch160:check`: **49/49 PASS**.
