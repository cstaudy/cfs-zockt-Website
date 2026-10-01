# TECHNIK v160 — Public Twitch LIVE Status & Last-Live Tracking

## Stand
- Paketstand: **v160**
- Backend: **3.20.6**
- Schema: **73**
- Launcher: **0.47.29**
- Feature Freeze: aktiv; v160 ist ein Reliability-/Website-Status-Pass.

## Ziel
Die öffentliche Startseite soll den LIVE-Zustand des verknüpften Twitch-Kanals zuverlässig erkennen, den letzten bestätigten LIVE-Zeitpunkt anzeigen und direkt zum Twitch-Kanal führen.

## Twitch LIVE-Erkennung
Der öffentliche Statuspfad fragt Twitch serverseitig über `GET /helix/streams?user_id=...` ab. Dafür wird ein Twitch App Access Token genutzt; Creator Access-/Refresh-Tokens werden nicht an den Browser übertragen. Der Status wird kurz serverseitig gecacht (`CFS_PUBLIC_TWITCH_LIVE_CACHE_TTL_MS`, Standard 12 Sekunden), damit viele Besucher nicht zu vielen Twitch-API-Aufrufen führen.

Priorität auf der Startseite:
1. bestätigtes Twitch LIVE
2. bestehendes CFS/TikTok-/Launcher-LIVE-Signal
3. bestätigtes Twitch OFFLINE
4. sonst `unknown`/Status offen

Dadurch kann ein eindeutiges Twitch-OFFLINE den bisherigen unklaren Zustand auflösen, ohne ein gleichzeitig vorhandenes anderes positives LIVE-Signal zu überschreiben.

## Letzter LIVE-Zeitpunkt
- `stream.offline` aus Twitch EventSub speichert den Endzeitpunkt.
- Der direkte Twitch-Poll speichert beim ersten bestätigten Wechsel LIVE → OFFLINE ebenfalls einen Endzeitpunkt.
- Fehlt bei einem bestehenden Deployment noch Historie, wird im Offline-Fall einmalig das neueste Twitch-Archiv über `/helix/videos?type=archive&first=1` verwendet. Aus `created_at + duration` wird ein letzter Endzeitpunkt abgeleitet und lokal in der bestehenden Provider-LIVE-State-Tabelle gespeichert.
- Wenn Twitch keine Archive bereitstellt, bleibt der historische Zeitpunkt leer, bis CFS selbst einen LIVE→OFFLINE-Übergang beobachtet.

## Öffentliche Payload
Die öffentliche Creator-State-Antwort enthält nur öffentliche Informationen:
- LIVE/OFFLINE/unknown
- Provider (`twitch`/andere)
- Twitch-Anzeigename/Login-Link
- aktuelle Zuschauerzahl bei Twitch LIVE
- Streamtitel und Game bei Twitch LIVE
- `last_live_at` / `last_live_started_at`
- kurze Prüfsignale (`twitch_checked_at`, authoritative ja/nein)

Keine Twitch Tokens, Client Secrets oder Stream Keys werden ausgegeben.

## Startseite
- Primärer Button: **TWITCH-KANAL ÖFFNEN**
- Sekundärer Button: **TIKTOK-KANAL ÖFFNEN**
- Mobile: Buttons stehen untereinander.
- Bei Twitch LIVE: direkte Kennzeichnung `Twitch LIVE · direkt erkannt`.
- Bei bestätigtem Offline: `Zuletzt live: TT.MM.JJJJ, HH:MM`.
- Twitch kennt keine TikTok-Likes/Shares; diese Felder bleiben bei Twitch LIVE bewusst `—`.

## Tests
- `npm run public-twitch160:check` → **49/49 PASS**
- `npm run project:check` → **40/40 PASS**
- `npm run homepage156:check` → **32/32 PASS**
- Twitch Runtime Hardening v148 → **20/20 PASS**
- vollständiger `npm run release:v160` → **PASS / Exit 0**
