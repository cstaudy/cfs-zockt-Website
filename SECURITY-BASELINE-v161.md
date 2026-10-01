# Security Baseline v161

v161 ergänzt TikTok-LIVE-Tracking und ein transparentes Website-Branding, ohne die bestehende Secret-Grenze aufzuweichen.

- Der offizielle TikTok OAuth-/Display-API-Pfad bleibt von der LIVE-Erkennung getrennt.
- TikTok LIVE wird nur aus lokalem CFS-/Launcher-Providerzustand und bestehender Session-Evidence abgeleitet; kein Scraping.
- Öffentliche TikTok-Daten sind auf `connected`, Status/Tracking-Status, Anzeigename, öffentliche URL und LIVE-Zeitpunkte/Zähler beschränkt.
- TikTok Access Token, Refresh Token, OAuth Client Secret, Launcher-Bridge-Secret und Stream Credentials werden nicht ausgegeben.
- Explizit inaktive Providerzustände verhindern stale LIVE-Falschpositiven.
- Twitch und TikTok werden unabhängig bewertet; ein unbekannter Providerstatus wird nicht fälschlich als OFFLINE behauptet.
- Das transparente Wortlogo ist ein lokales statisches RGBA-Asset; es werden keine externen Branding-/Tracking-Ressourcen eingebunden.
- Der CSP-Hash des Homepage-JSON-LD ist auf den v161-Inhalt synchronisiert.

`public-tiktok161:check`: **48/48 PASS**.  
`public-twitch160:check`: **49/49 PASS**.  
Vollständiger `release:v161`: **PASS / Exit 0**.
