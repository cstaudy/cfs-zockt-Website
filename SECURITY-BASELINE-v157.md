# SECURITY BASELINE v157

**Status:** UNVERÄNDERT GEHÄRTET / UI-REORGANISATION OHNE NEUE SECRET-PFADE

v157 verändert ausschließlich Navigation, Gruppierung, sichtbare Bezeichnungen, Versionsmetadaten und UI-Struktur.

Unverändert bleiben insbesondere:

- keine Stream-Keys in PostgreSQL oder Browser-State
- Launcher SafeStorage für lokale Stream-Credentials
- Bridge-Authentisierung und signierte/replay-geschützte mutierende Requests
- Creator-/Provider-/Ziel-Isolation
- `no-store` für Secret-nahe Bridge-Antworten
- kein Cloud Relay
- geschlossene TikTok-/Twitch-Provider-Beta
- `CFS_COMMERCIAL_MODE=false`
- keine neuen Tracking-, Analytics- oder Werbeskripte

Die neue Kategorie `Produzieren` hält die bestehende Aussage ausdrücklich sichtbar: `LOCAL MULTISTREAM`; Capture und Zugangsdaten bleiben im Launcher.

`workspace157:check` prüft, dass die bestehenden Launcher-Views und Widget-Studio-Actions trotz der Neuordnung weiterhin erreichbar sind.
