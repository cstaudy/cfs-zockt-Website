# CFS Studio Feature Freeze v154

**Stand:** v154 · Backend 3.20.0 · Schema 73 · Launcher 0.47.26

Mit v154 wird der geplante Feature-Freeze für die aktuelle private Beta vorbereitet und technisch festgehalten. Ab diesem Stand sollen **keine neuen großen Produktblöcke** mehr begonnen werden, bevor die gebündelte reale Acceptance abgeschlossen ist.

## Eingefrorene Funktionsblöcke

- Account, Login, Security-/Session-System und Admin Control
- geschlossene TikTok-/Twitch-Creator-Beta
- TikTok-, Twitch- und YouTube-Grundintegration
- Widget Studio inklusive Publish/Runtime/OBS Browser Source
- Launcher Bridge, SafeStorage und OBS WebSocket 5
- CFS Stream Studio mit Preview/Program, Scene Composer und Live Health
- lokale Streaming Engine, Recording und Recovery-Grundlagen
- lokaler Multistream mit Ziel-Isolation
- Provider → Streaming-Ziel-Zusammenführung aus v153
- integriertes Beta-Test-Handbuch aus v154

## Noch offen, aber keine neue Feature-Lücke

Diese Punkte sind **Acceptance/Setup**, nicht neue Produktentwicklung:

- echte Windows- und Installer-Tests
- echte OBS-Abnahme
- Twitch LIVE mit realem Creator-Konto
- TikTok LIVE nur bei offiziell vorhandenem Encoder-/Stream-Key-Zugang
- YouTube LIVE nach vollständiger Google-/YouTube-OAuth-Konfiguration beim Betreiber
- 2+ Streaming-Ziele gleichzeitig
- Netzwerkverlust, Reconnect und Zielausfall
- Launcher-/Backend-Neustart während des Betriebs
- Bandbreitengrenzen und Encoder-Overload
- längere Soak-Tests
- Multi-Creator-Isolation unter realem Betrieb
- Code Signing / SmartScreen / Provider Acceptance

## Freeze-Regel

Bis diese Acceptance abgeschlossen ist, sind nur noch erlaubt:

- Fehlerkorrekturen
- Sicherheitskorrekturen
- Test-/Diagnoseverbesserungen
- kleine UX-Korrekturen, die keinen neuen Produktblock eröffnen
- notwendige Provider-Anpassungen für die reale Acceptance

Neue große Funktionen, Monetarisierung, Analytics/Ads oder ein allgemeiner YouTube-Ausbau bleiben außerhalb dieses Freeze-Blocks.

## Lokaler Freeze-Vertrag

`npm run feature-freeze154:check` prüft die zentralen Funktionsblöcke und Sicherheitsinvarianten statisch. Dieser Gate ersetzt keine reale Windows-/OBS-/Provider-Acceptance.
