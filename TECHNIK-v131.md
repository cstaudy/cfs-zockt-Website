# CFS_ZOCKT Technik v131

Diese Phase führt einen zentralen technischen Status ein, ohne bestehende APIs zu entfernen.

## Neue API: `/api/public/creator-state`

Die öffentliche Startseite kann jetzt LIVE, aktuelles Game, TikTok, Discord und zuletzt gespielte Games aus **einem gemeinsamen Snapshot** laden.

Enthalten sind nur öffentliche Daten. Tokens, NPSSO, Account-IDs und andere Secrets werden nicht ausgeliefert.

## Neue API: `/api/creator/technical-status`

Nur für angemeldete Creator. Sie bündelt den Zustand von:

- Website
- Datenbank
- TikTok
- Launcher / Creator-PC
- LIVE-Signal
- Game-Präsenz
- PlayStation Network
- Discord

Die API gibt keine Tokens, Secrets oder OAuth-Zugangsdaten zurück.

## Neue Seite

`/pages/technical-status.html`

Die Seite aktualisiert sich automatisch und zeigt die wichtigsten technischen Komponenten in einem Dashboard. Sie ist außerdem im Dashboard unter **MEHR → TECHNIK STATUS** verlinkt.

## Kompatibilität

Die bisherigen Endpunkte bleiben bestehen:

- `/api/public/community-stats`
- `/api/public/live-session`
- `/api/public/status`

Die Startseite verwendet bevorzugt `/api/public/creator-state` und fällt bei einem Fehler automatisch auf die bisherigen Endpunkte zurück.

## Keine neuen Render-Variablen

Für v131 sind keine zusätzlichen Environment Variables erforderlich.

## Lokaler Test

```bash
node tools/creator-state-v131-test.mjs .
```

Der Test prüft unter anderem, dass die neuen Status-Payloads keine Token-/NPSSO-Felder enthalten und dass die zentralen Routen eingebaut sind.
