# TECHNIK v147 — Provider-Widget-Taxonomie

## Ziel
TikTok- und Twitch-Widgets/Overlays im Widget Studio strikt nach Provider trennen. Keine TikTok-Begriffe oder -Metriken im Twitch-Bereich und umgekehrt. YouTube wird in v147 bewusst noch nicht funktional erweitert.

## Änderungen
- Backend 3.16.1; Launcher bleibt 0.47.22; Schema bleibt 70.
- Serverseitiger Taxonomie-Guard für Widget-Definitionen.
- Twitch blockiert TikTok-spezifische Eventtypen/Metric-Pfade wie Likes, Gifts, Shares und Viewer.
- TikTok blockiert Twitch-spezifische Eventtypen wie Subscribe und Cheer.
- Provider-spezifische Suchbeispiele, Kategorie-Beschreibungen und Latest-Guides.
- Twitch spricht von Subs/Gift-Subs und Cheers/Bits, nicht von TikTok Gifts/Likes/Shares.
- TikTok Latest zeigt Follow/Gift/Share; Twitch Latest zeigt nur tatsächlich vorhandene Twitch-Latest-Typen.
- Neuer Gate `provider-taxonomy147:check`.

## Abgrenzung
Diese Version erweitert YouTube noch nicht. Erst TikTok/Twitch-Sortierung und Provider-Isolation werden abgeschlossen; YouTube folgt als eigener Block.
