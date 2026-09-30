# Creator Suite Completion v146

## Status

**TWITCH CHAT CODE READY / REAL PROVIDER ACCEPTANCE OPEN**

## Neu in v146

- Twitch `channel.chat.message` über EventSub Webhook angebunden.
- Chat-Events werden creator-spezifisch als `provider=twitch` normalisiert.
- Neues `twitch_chat_overlay` im Twitch-Widget-Katalog.
- Twitch-Chat-Schnellstart im Widget Studio.
- Twitch-Widgets erscheinen zuverlässig im Twitch-Bereich; v145-Clientfilter für `studio_areas` korrigiert.
- Mehrfach-Scope-Gating pro Twitch-Widget serverseitig erzwungen.
- Multi-Chat führt aktuelle TikTok- und Twitch-Session-Events gemeinsam zusammen.
- Launcher zeigt Twitch EventSub inklusive Chat als eigenen Readiness-Zustand.
- Twitch Chat ist read-only; `user:write:chat` wird nicht angefordert.

## Provider-Regel

- TikTok verbunden → TikTok-Widgets.
- Twitch verbunden + erforderliche Scopes → Twitch-Widgets inklusive Chat.
- Fehlende Twitch-Scopes → Widget bleibt gesperrt und `TWITCH BERECHTIGEN` ist erforderlich.
- OBS-/allgemeine Widgets bleiben providerunabhängig.
- Creator A kann keine Provider-/Widget-Daten von Creator B lesen.

## Versionen

- Backend **3.16.0**
- Schema **70**
- Launcher **0.47.22**

## Gates

- Twitch Chat v146: PASS
- Creator Suite v146 aggregate: PASS
- Release v146: PASS

## Offen

- echte Twitch-Webhook-/Chat-Abnahme mit mehreren externen Creator-Konten
- Reconnect, Revocation und Last-/Soak-Test
- paralleler TikTok+Twitch-LIVE-Test
- echte Windows-/Launcher-/OBS-Abnahme
- TikTok Production-App-Freigabe
- YouTube OAuth / echtes Multistream-Ziel
