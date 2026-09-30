# TECHNIK v146 — Twitch Chat / Provider Chat Routing

## Ziel

v146 schließt den offenen Twitch-Chat-Block, ohne die Provider-Isolation aus v145 aufzuweichen. Ein Creator sieht Twitch-Chat-Widgets nur, wenn genau sein Twitch-Account verbunden und mit den nötigen Scopes autorisiert ist. TikTok-Chat bleibt separat an TikTok gebunden; allgemeine OBS-Widgets bleiben providerunabhängig.

## Twitch Chat

Implementiert ist `channel.chat.message` über Twitch EventSub Webhook. Die eingehenden Nachrichten werden nach HMAC-Prüfung dem Twitch-Broadcaster und damit exakt einer `creator_id` zugeordnet, als `provider='twitch'` / `event_type='chat'` normalisiert und über die vorhandene `creator_live_events`-Queue an Widget Runtime und Multi-Chat geliefert.

Für den gewählten Webhook/App-Token-Pfad werden zusätzlich angefordert:

- `user:read:chat`
- `user:bot`
- `channel:bot`

`user:write:chat` wird bewusst **nicht** angefordert, da v146 Chat nur liest und keine Nachrichten im Namen des Creators sendet.

## Widgets

Neu:

- `twitch_chat_overlay` — frei gestaltbares Twitch-Chat-Fenster
- Twitch-Chat als 30-Sekunden-Schnellstart im Twitch-Bereich

Die serverseitige Widget-Erstellung unterstützt jetzt mehrere benötigte Scopes pro Widget. Ein direkter API-Aufruf kann die UI-Sperre daher nicht umgehen. Fehlen Twitch-Chat-Scopes, antwortet der Server mit `provider_scope_missing` und der Creator muss Twitch erneut autorisieren.

## Widget-Studio-Fix

In v145 enthielt `studio_areas` bereits `twitch`, die Client-Filterfunktion akzeptierte intern aber versehentlich nur `tiktok` und `obs`. v146 korrigiert den Filter auf `tiktok | twitch | obs`. Dadurch werden Twitch-Widgets im Twitch-Bereich zuverlässig sichtbar.

## Multi-Chat

Der bestehende Stream-Studio-Feed `/api/creator/widget-studio/live/events` liest nun die aktuellen Session-IDs von TikTok und Twitch zusammen. Der Feed bleibt creator-isoliert und verwendet weiterhin die vorhandene Event-Queue; es wird keine zweite Chat-Historie angelegt.

## Sicherheit / Isolation

- Twitch EventSub bleibt Raw-Body + HMAC-SHA256 verifiziert.
- EventSub Message IDs bleiben dedupliziert.
- Broadcaster-ID wird serverseitig auf genau eine verbundene `creator_id` aufgelöst.
- Twitch-Chat-Nachrichten werden sanitisiert und auf 280 Zeichen für das Widget-/Activity-Modell begrenzt.
- Keine Twitch Tokens oder Client Secrets gelangen in Widget Runtime, Browser Source oder Launcher UI.
- Provider-Widgets bleiben serverseitig an den verbundenen Provider und die erforderlichen Scopes gebunden.

## Versionen

- Backend: **3.16.0**
- Database Schema Generation: **70** (keine neue Tabelle/Spalte erforderlich)
- Launcher: **0.47.22**

## Lokale Gates

- `npm run twitch-chat146:check` → PASS
- `npm run creator-suite146:check` → PASS
- `npm run release:v146` → PASS (nach finaler Metadaten-Synchronisierung)

Bestehende Regressionen bleiben Bestandteil des Aggregate-Gates, darunter Widget Studio 21/21, Launcher Completion 42/42, Scene Studio 59/59, Stream Studio 46/46, Multistream 70/70, Provider Adapter 31/31 und Live Health 45/45.

## Reale Acceptance bleibt offen

Code-seitig implementiert bedeutet weiterhin nicht automatisch produktionsabgenommen. Noch real zu testen sind insbesondere mehrere fremde Twitch-Creator, EventSub Webhook-Verifikation auf der Produktionsdomain, Chat unter realer Last, Reconnect/Revocation, paralleles TikTok+Twitch, Windows/Launcher/OBS und längere Soak-Läufe.
