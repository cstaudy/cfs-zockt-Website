# TECHNIK v161 — TikTok LIVE Tracking & Transparent Brand

## Stand
- Paketstand: **v161**
- Backend: **3.20.7**
- Schema: **73**
- Launcher: **0.47.29**
- Feature Freeze: aktiv; v161 ist ein Reliability-/Website-Polish-Pass.

## Ziel
Die öffentliche Startseite soll Twitch und TikTok getrennt und nachvollziehbar darstellen. TikTok darf dabei nicht so behandelt werden, als gäbe es über die normale TikTok Display API einen autoritativen LIVE-Endpunkt. Zusätzlich soll das CFS-Logo ohne eingebrannten schwarzen Bildhintergrund direkt in den Website-Header integriert sein.

## TikTok LIVE-Erkennung
Die bestehende TikTok OAuth-/Display-API-Verbindung bleibt für Profil-/Videodaten zuständig. Der LIVE-Zustand wird separat über den lokalen Launcher-LIVE-Provider ermittelt.

Unterstützte Tracking-Hinweise:
- `tiktool`
- `tikfinity`
- `tiktok`

Der Server liest dafür `integration_health.live_provider` aus dem Launcher-Bridge-State. Aktive Providerzustände bzw. passende LIVE-Evidence führen zu TikTok `LIVE`; explizite Zustände wie `offline`, `idle`, `disconnected` oder `stopped` verhindern, dass ein altes generisches LIVE-Signal weiter als aktuell gilt.

TikTok wird in der öffentlichen Payload bewusst mit `authoritative:false` gekennzeichnet. Damit bleibt erkennbar, dass der Status aus dem CFS-/Launcher-LIVE-Signal und nicht aus einem direkten offiziellen TikTok-LIVE-Status-Endpunkt stammt.

## TikTok „Zuletzt live“
CFS verwendet die bereits vorhandene Session-/Provider-Historie:
- Launcher-Session mit Provider `tiktool`, `tikfinity` oder `tiktok`
- erkannter Übergang LIVE → OFFLINE im Provider-Tracker
- vorhandene Start-/Endzeitpunkte in der Creator-LIVE-Historie

Die bestehende Tabelle `creator_provider_live_state` wird dafür auch für Provider `tiktok` genutzt. **Keine Schemaänderung** ist nötig.

## Twitch + TikTok gleichzeitig
Die öffentliche Statuslogik bewertet beide Plattformen unabhängig:
- Twitch LIVE + TikTok LIVE → `provider: multistream`
- eine Plattform LIVE → Gesamtstatus LIVE
- OFFLINE nur, wenn alle aktuell verbundenen/verfolgten Plattformen eindeutig OFFLINE sind
- unbekanntes TikTok-Signal wird nicht durch Twitch-OFFLINE fälschlich als TikTok-OFFLINE dargestellt

Zuschauerwerte können bei echtem Multistream addiert werden. TikTok-Likes/Shares werden nur gezeigt, wenn TikTok tatsächlich als LIVE erkannt wurde.

## Startseite
Die LIVE-Karte enthält jetzt kompakte getrennte Plattformzeilen:
- **Twitch:** LIVE / OFFLINE / STATUS OFFEN + eigener letzter LIVE-Zeitpunkt
- **TikTok:** LIVE / OFFLINE / STATUS OFFEN + eigener letzter LIVE-Zeitpunkt

Beide Kanalbuttons bleiben erhalten. Auf mobilen Ansichten stehen die Plattformzeilen und Kanalaktionen sauber untereinander.

## Transparentes Logo
Die bisherige Datei `cfs-zockt-logo.png` enthält einen dunklen Hintergrund direkt in den Bildpixeln. v161 verwendet stattdessen die bereits vorhandene echte RGBA-Datei:

`/assets/img/brand/cfs-zockt-wordmark-transparent.png`

Sie wird im Header und Footer mit `object-fit: contain` und ohne schwarzen Bildcontainer dargestellt. Der transparente Alphakanal wurde im v161-Test direkt aus dem PNG geprüft.

## Sicherheit
- TikTok Access-/Refresh-Tokens bleiben serverseitig verschlüsselt und werden nicht in die öffentliche Payload übernommen.
- Launcher-/Provider-Secrets werden nicht ausgegeben.
- Der Browser erhält ausschließlich Status, öffentliche Kanal-URL, Anzeigename und Zeit-/Zählerdaten.
- Kein TikTok-Scraping und keine Umgehung von TikTok-Zugriffsbeschränkungen.
- CSP-Hash für das geänderte JSON-LD wurde synchronisiert.

## Tests
- `npm run public-tiktok161:check` → **48/48 PASS**
- `npm run public-twitch160:check` → **49/49 PASS**
- `npm run project:check` → **40/40 PASS**
- `npm run homepage156:check` → **32/32 PASS**
- vollständiger `npm run release:v161` → **PASS / Exit 0**
