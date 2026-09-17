# CFS Stream Studio – Multistream Connections & Control Center – Pass 21.10.7

Stand: 2026-09-17

## Ziel

CFS Local Multistream soll Twitch, YouTube und – sofern das jeweilige TikTok-Konto Encoder-/LIVE-Zugang besitzt – TikTok parallel über den lokalen Launcher bedienen. Stream-Keys und Server-URLs bleiben ausschließlich auf dem Creator-PC.

## Provider-Modell

### YouTube
- Direktes Ziel über RTMPS + Stream-Key.
- Server-URL und Stream-Key werden aus YouTube Live Control Room übernommen.
- CFS speichert beides nur verschlüsselt im Launcher.

### Twitch
- Direktes Ziel über Twitch RTMP-Ingest + Stream-Key.
- Ingest-Server und Stream-Key werden im Launcher hinterlegt.
- Optional kann später Twitch OAuth zum komfortableren Abruf des Stream-Keys ergänzt werden; Pass 21.10.7 nutzt bewusst die lokale manuelle Variante.

### TikTok
- TikTok ist bewusst als zugangsabhängig markiert.
- CFS kann direkt zu TikTok senden, wenn das Konto von TikTok eine nutzbare LIVE-/Encoder-Server-URL und einen Stream-Key erhält.
- CFS versucht nicht, TikTok LIVE-Zugriffsregeln zu umgehen.

## Neu in Pass 21.10.7

- fester Provider-Katalog im Launcher
- provider-spezifische Setup-Hinweise
- Website zeigt Twitch/YouTube als direkte Ziele und TikTok als zugangsabhängig
- Launcher-Preflight vor dem Start
- Prüfung von Bridge, FFmpeg, SafeStorage, Planlimit und lokalen Credentials
- Start/Stop eines einzelnen Ziels während einer laufenden Multistream-Session
- manueller Stop verhindert den automatischen Reconnect dieses Ziels
- andere aktive Ziele laufen weiter
- externe Hilfe-Links werden ausschließlich aus dem festen lokalen Provider-Katalog geöffnet

## Sicherheitsgrenzen

- keine Stream-Keys in PostgreSQL
- keine Stream-Keys im Website-State
- keine Stream-Keys in portable Launcher-Backups
- Windows SafeStorage ist für gespeicherte Keys erforderlich
- FFmpeg-Logs werden gegen bekannte Secrets redigiert
- keine ungeprüften URLs aus Website-Daten werden als Hilfe-Link geöffnet
- Cloud Relay bleibt deaktiviert

## Reale Tests, die weiterhin offen bleiben

- Twitch mit privatem/Testkanal
- YouTube mit nicht gelistetem Teststream
- TikTok nur mit einem Konto, das tatsächlich Encoder-/Stream-Key-Zugang besitzt
- mindestens zwei Ziele parallel über längere Laufzeit
- Zielausfall, Reconnect, manueller Stop/Start und Bandbreitengrenzen auf echter Windows-Hardware

## Offizielle Referenzen für die aktuelle Implementierungsentscheidung

- Twitch Video Broadcast: https://dev.twitch.tv/docs/video-broadcast/
- Twitch Stream Key FAQ: https://help.twitch.tv/s/article/twitch-stream-key-faq
- YouTube RTMPS: https://support.google.com/youtube/answer/10364924
- YouTube Simulstreaming: https://support.google.com/youtube/answer/16404722
- TikTok LIVE Studio Help: https://www.tiktok.com/live/studio/help
