# TECHNIK v152 — konsolidierte Private-Beta Legal-/Privacy-Härtung

## Versionen

- Backend: **3.18.3**
- Schema Generation: **72**
- Launcher: **0.47.24**

## Inhalt

- v151 bleibt vollständig als kumulative technische Basis erhalten.
- Legal-/Privacy-Hardening wurde auf den aktuellen v151-Code-Stand gemergt, nicht als älterer `server.js`-Stand darüberkopiert.
- Registrierung dokumentiert Terms, Privacy-Hinweis, Beta-Hinweis und 18+-Bestätigung versioniert.
- `CFS_COMMERCIAL_MODE=false` blockiert kostenpflichtige Checkouts serverseitig.
- Öffentliche Funnel-Persistenz und persistente Merch-Feedback-ID sind entfernt.
- Datenschutz, Nutzungsbedingungen, Impressum und Planseite sind für die kostenlose Privat-Beta aktualisiert.
- TikTok/Twitch-Beta-Admin-Control aus v151 bleibt erhalten.

## Gate

- `npm run release:v151`
- `npm run legalbeta:check`
- `npm run funnel:check`
- zusammengefasst: `npm run release:v152`

Reale Provider-/OBS-/Windows-/Soak-/externe Rechtsabnahme bleibt davon getrennt.
