# TECHNIK v145 — Multi-Creator Provider Isolation & Provider Widgets

## Ziel

v145 macht den Creator-Pfad ausdrücklich mandantenfähig: Registrierung, TikTok, Twitch, Launcher, OBS und Widgets werden pro `creator_id` getrennt. Zusätzlich zeigt das Widget Studio nur Provider-Widgets an, deren zugehöriger Account tatsächlich mit diesem Creator verbunden ist.

## Multi-Creator Account- und Provider-Isolation

- `/api/account/register` erzeugt für jede Registrierung eine eigene `creator_id`.
- TikTok- und Twitch-Verbindungen, OAuth-State, Launcher-Handoffs, Bridges, Widgets und Provider-LIVE-State sind creator-spezifisch gespeichert.
- Ein externer Twitch-/TikTok-Account darf nicht still mit zwei verschiedenen cfs_zockt-Creator-Konten verbunden werden. Der OAuth-Abschluss prüft die externe Provider-ID und bricht bei einem bestehenden anderen Besitzer mit `provider_account_in_use` ab.
- Account-Löschung räumt auch Twitch EventSub-Subscriptions und provider-spezifischen LIVE-State auf.

## Provider-spezifischer Widget-Katalog

- OBS-/allgemeine Widgets bleiben providerunabhängig sichtbar.
- TikTok-Widgets werden nur geliefert/angezeigt, wenn TikTok für den aktuellen Creator verbunden ist.
- Twitch-Widgets werden nur geliefert/angezeigt, wenn Twitch für den aktuellen Creator verbunden ist.
- Die Server-Create-Route erzwingt dieselbe Regel mit `provider_not_connected`; ein verstecktes Widget kann deshalb nicht per direktem Request umgangen werden.
- Scope-gebundene Twitch-Widgets werden nur freigeschaltet, wenn die passende OAuth-Berechtigung vorhanden ist (`provider_scope_missing`).
- Launcher-Buttons wechseln nach Verbindung von `VERBINDEN` zu `TIKTOK WIDGETS` bzw. `TWITCH WIDGETS` und öffnen das Widget Studio direkt mit `?platform=tiktok` bzw. `?platform=twitch`.

## Twitch EventSub Runtime

v145 ergänzt den realen Twitch-Eventpfad für die ersten providergebundenen Widgets:

- `stream.online` / `stream.offline`
- `channel.follow` v2
- `channel.subscribe`
- `channel.subscription.message`
- `channel.subscription.gift`
- `channel.cheer`

Neue Twitch-Widget-Typen:

- Twitch LIVE Timer
- Twitch Follow Alert
- Twitch Latest Follower
- Twitch Sub Alert
- Twitch Cheer Alert

Benötigte Twitch-Scopes:

- `moderator:read:followers`
- `channel:read:subscriptions`
- `bits:read`

Bereits verbundene Twitch-Creator, die v143/v144 vor diesen Scopes autorisiert haben, bekommen im Launcher `TWITCH BERECHTIGEN` und müssen Twitch einmal neu autorisieren.

## EventSub Security

- Webhook wird vor `express.json()` als Raw Body angenommen.
- Twitch-HMAC-SHA256-Signatur wird gegen Message-ID + Timestamp + unveränderten Body geprüft.
- Vergleich erfolgt mit `crypto.timingSafeEqual`.
- Zeitfenster ist begrenzt.
- EventSub Message-ID wird als Event-Key verwendet; doppelte Zustellungen werden mit `ON CONFLICT DO NOTHING` dedupliziert.
- Broadcaster-ID wird serverseitig auf genau die verbundene `creator_id` aufgelöst.
- Twitch und TikTok besitzen getrennten Provider-LIVE-State und können sich bei paralleler Nutzung nicht gegenseitig überschreiben.

## Stream-Ready

Der Stream-Startcheck verlangt nicht mehr zwingend TikTok. Ein Creator ist auf der Provider-Stufe bereit, wenn mindestens **TikTok oder Twitch** verbunden ist. OBS und Launcher bleiben eigenständige Voraussetzungen.

## Versionen

- Backend: **3.15.0**
- Database Schema Generation: **70**
- Launcher: **0.47.21**

## Lokale Gates

- `npm run creator-provider145:check` → PASS
- `npm run creator-suite145:check` → PASS
- `npm run release:v145` → PASS
- Widget Studio Completion v140 → 21/21 PASS
- Launcher Completion v140 → 42/42 PASS
- Scene Studio → 59/59 PASS
- Stream Studio → 46/46 PASS
- Multistream → 70/70 PASS
- Provider Adapters → 31/31 PASS
- Live Health → 45/45 PASS
- Release Readiness → 20/20 PASS
- Technical Foundation → 19/19 PASS

## Nicht als real abgenommen markieren

Code-seitig ist der Multi-Creator-/Provider-Widget-Pfad vorbereitet und lokal geprüft. Weiterhin erforderlich sind echte Tests mit mehreren realen Creator-Konten, mehreren Twitch-/TikTok-Accounts, Windows/Launcher, OBS, Browser-OAuth, Twitch EventSub und realen TikTok-LIVE-Sessions. TikTok muss außerdem für echte fremde Creator im produktiven TikTok-App-Modus freigegeben sein; ein Sandbox-/Test-Setup reicht dafür nicht.
