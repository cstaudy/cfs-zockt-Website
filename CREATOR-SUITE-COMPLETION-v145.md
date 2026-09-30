# Creator Suite Completion v145

## Status

**MULTI-CREATOR PROVIDER ISOLATION: CODE READY / REAL-WORLD ACCEPTANCE OPEN**

## Neu in v145

- Registrierung bleibt offen für normale Creator und erzeugt pro Nutzer eine eigene `creator_id`.
- TikTok, Twitch, Launcher, OBS/Bridge und Widgets werden creator-spezifisch zugeordnet.
- Externe TikTok-/Twitch-Konten können nicht still an zwei Creator-Accounts gleichzeitig gebunden werden.
- Widget Studio filtert Provider-Katalog und bestehende Widgets nach tatsächlich verbundener Plattform.
- TikTok verbunden → TikTok-Widgets sichtbar.
- Twitch verbunden → Twitch-Widgets sichtbar.
- OBS-/allgemeine Widgets bleiben unabhängig von TikTok/Twitch verfügbar.
- Serverseitige Create-Guards verhindern das Umgehen der UI-Filter.
- Twitch EventSub verarbeitet LIVE/Offline, Follow, Sub/Resub/Gift-Sub und Cheer creator-spezifisch.
- Neue Twitch-Widgets: LIVE Timer, Follow Alert, Latest Follower, Sub Alert, Cheer Alert.
- Stream-Ready akzeptiert TikTok **oder** Twitch als LIVE-Plattform.
- Launcher 0.47.21 öffnet bei verbundenem Provider direkt dessen gefilterte Widget-Ansicht.

## Sicherheitsgrenzen

- OAuth-Tokens und Client-Secrets bleiben serverseitig.
- OBS-Passwort bleibt lokal im Launcher verschlüsselt.
- EventSub-HMAC wird auf Raw Body geprüft.
- EventSub wird per Message-ID dedupliziert.
- Twitch-Broadcaster-ID und TikTok-Open-ID werden creator-spezifisch zugeordnet.
- Provider-spezifischer LIVE-State verhindert TikTok/Twitch-Cross-Talk.

## Versionen

- Backend **3.15.0**
- Schema **70**
- Launcher **0.47.21**

## Gates

- Creator Provider Isolation v145: PASS
- Creator Suite v145 aggregate: PASS
- Release v145: PASS
- Release Readiness: 20/20 PASS
- Technical Foundation: 19/19 PASS

## Noch real abzunehmen

- Registrierung + E-Mail-Verifizierung mit mehreren echten Creator-Konten
- getrennte TikTok-Verbindungen mehrerer Creator
- getrennte Twitch-Verbindungen mehrerer Creator
- Twitch Re-Authorization für die neuen EventSub-Scopes
- echte Twitch EventSub-Zustellungen und Reconnect-/Revocation-Fälle
- echte TikTok-LIVE-Events je Creator
- Windows-/Launcher-/OBS-End-to-End inklusive One-Click Browser Source
- paralleler TikTok+Twitch-Betrieb und längerer Soak
- TikTok Production-App-Freigabe für externe Creator
