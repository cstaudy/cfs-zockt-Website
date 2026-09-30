# TECHNIK v149 — YouTube Creator Integration

## Versionsstand
- cfs_zockt Backend: **3.18.0**
- Datenbank-Schema: **72**
- Launcher: **0.47.23**
- Pakettyp: kumulatives Updatepaket, kein Full Project

## Ziel dieses Blocks
v149 schließt ausschließlich den YouTube-Creator-Provider code-seitig auf demselben Architekturprinzip wie TikTok und Twitch. Reale Provider-/Windows-/OBS-/Soak-Abnahmen werden entsprechend der aktuellen Entwicklungsreihenfolge erst nach dem Feature-Freeze durchgeführt.

## YouTube OAuth / Creator-Isolation
- serverseitiger OAuth-2.0 Authorization Code Flow
- `access_type=offline` für persistente Creator-Verbindungen
- OAuth-State wird serverseitig gehasht und zeitlich begrenzt
- Access- und Refresh-Token werden ausschließlich serverseitig verschlüsselt gespeichert
- automatischer Access-Token-Refresh vor Ablauf
- Disconnect widerruft die Google-Autorisierung und entfernt lokale Verbindungsdaten
- exakt ein verbundener YouTube-Kanal kann gleichzeitig nur einem `cfs_zockt`-Creator gehören
- Launcher-Handoff unterstützt YouTube über denselben kurzlebigen Einmalcode wie TikTok/Twitch; OAuth-Tokens oder Bridge-Secrets landen nicht in der URL

## Least Privilege
v149 fordert ausschließlich:

`https://www.googleapis.com/auth/youtube.readonly`

Damit werden in diesem Block keine Videos, Kommentare, Broadcasts oder Kanalinhalte im Namen des Creators verändert. Schreibende YouTube-Scopes sind nicht Bestandteil von v149.

## Kanal / LIVE Runtime
- Kanalauflösung über `channels.list(..., mine=true)`
- Kanal-ID, Titel, Handle, Avatar und Abonnentenzahl werden creator-spezifisch synchronisiert
- aktiver Broadcast wird über `liveBroadcasts.list` erkannt
- `snippet.liveChatId` wird ausschließlich für den aktuell erkannten Broadcast gebunden
- YouTube führt einen eigenen `creator_provider_live_state` und überschreibt weder TikTok- noch Twitch-LIVE-State
- Startzeit und Session-ID werden providergebunden geführt
- Runtime-Fehler bleiben am betroffenen Creator/Provider

## Live Chat
- `liveChatMessages.list` mit `nextPageToken`
- das von YouTube gelieferte `pollingIntervalMillis` wird respektiert und auf einen sicheren Bereich begrenzt
- historische Nachrichten der ersten Poll-Seite werden beim initialen Attach nicht rückwirkend als neue LIVE-Events ausgelöst
- `liveChatEnded` / `liveChatNotFound` beendet den Chat-Poll sauber
- Event-Deduplizierung über die YouTube-Message-ID

Normalisierte YouTube-Events:
- `textMessageEvent` → `chat`
- `newSponsorEvent`, `memberMilestoneChatEvent`, `membershipGiftingEvent`, `giftMembershipReceivedEvent` → `membership`
- `superChatEvent`, `superStickerEvent` → `super_chat`

Super-Chat-Werte werden aus `amountMicros` in normale Währungseinheiten überführt; Währung und formatierter Anzeigenwert bleiben im Payload erhalten.

## YouTube Widgets
Nur nach verbundener YouTube-Verbindung sichtbar/erstellbar:
- YouTube Abonnenten Goal
- YouTube Abonnenten Counter
- YouTube LIVE Timer
- YouTube Live Chat
- YouTube Mitgliedschaft Alert
- YouTube Latest Member
- YouTube Super Chat Alert
- YouTube Latest Super Chat

Die Provider-Taxonomie ist serverseitig fail-closed. YouTube-Widgets dürfen keine TikTok-Events wie Like/Gift/Share und keine Twitch-Events wie Follow/Sub/Cheer verwenden. TikTok und Twitch dürfen umgekehrt keine YouTube-Mitgliedschafts-/Super-Chat-Definitionen übernehmen.

## Widget Studio / Preview
- eigener YouTube-Bereich und eigene Schnellstarts
- YouTube-Filter erscheint nur bei passender Creator-Verbindung
- direkter API-Erstellungsversuch ohne YouTube-Verbindung wird serverseitig blockiert
- Channel-/LIVE-Snapshot ist YouTube-spezifisch
- Mitgliedschaft und Super Chat besitzen eigene Vorschauereignisse
- Twitch-Preview verwendet weiterhin ausschließlich Twitch-LIVE-State; kein TikTok-Fallback für Twitch-Widgets

## Launcher / Integrations-Hub
Launcher 0.47.23:
- `YOUTUBE VERBINDEN`
- nach Verbindung direkter YouTube-Widget-Zugriff
- automatisches Status-Polling nach Browser-OAuth
- Creator-Library zählt TikTok-, Twitch-, YouTube- und allgemeine/OBS-Widgets getrennt

Integrations-Hub:
- YouTube verbinden
- Kanal synchronisieren
- Verbindung trennen
- Kanal-/LIVE-/Runtime-Status sichtbar
- klarer Hinweis auf nur lesende Berechtigung und noch offene reale Provider-Abnahme

## Stream Startcheck
Ein Creator benötigt nicht mehrere Plattformen gleichzeitig. Für die Provider-Voraussetzung genügt jetzt:

**TikTok ODER Twitch ODER YouTube**

Danach gelten Launcher, OBS und veröffentlichtes Widget weiterhin als getrennte Voraussetzungen.

## Noch nicht Bestandteil von v149
- YouTube Broadcast/Stream erzeugen oder verändern
- YouTube Stream-Key/RTMP-Ziel verwalten
- echtes YouTube-Multistream-Ziel
- reale Google-/YouTube-OAuth-Acceptance
- reale YouTube-LIVE-/Chat-/Membership-/Super-Chat-Abnahme
- Windows-/OBS-/Reconnect-/Soak-Abnahme

Diese Punkte werden nicht als abgeschlossen behauptet.

## Lokale Gates
- YouTube Integration v149: **32/32 PASS**
- Widget Studio Completion: **21/21 PASS**
- Launcher Completion: **42/42 PASS**
- Scene Studio: **59/59 PASS**
- Stream Studio: **46/46 PASS**
- Multistream Core: **70/70 PASS**
- Provider Adapter: **31/31 PASS**
- Live Health: **45/45 PASS**
- Twitch Runtime Hardening: **20/20 PASS**
- Release Readiness: **20/20 PASS**
- Technical Foundation: **19/19 PASS**
- `npm run release:v149` → **PASS**
