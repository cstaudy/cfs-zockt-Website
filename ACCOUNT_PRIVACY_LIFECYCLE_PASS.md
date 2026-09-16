# cfs_zockt – Account & Privacy Lifecycle Pass

Stand: 15.09.2026

## Ziel

Der öffentliche Vertrauens-/Security-Fokus wird bis in den Account-Lifecycle gezogen: aktive Sitzungen verwalten, TikTok trennen, eigenen Datenexport erstellen und Account dauerhaft löschen.

## Neu

- aktive Creator-Sessions sind im Account sichtbar (nur Start/Ablauf; keine IP, kein User-Agent, kein Fingerprint)
- einzelne Sessions können widerrufen werden; die aktuelle Session kann gezielt beendet werden
- bestehendes Logout-all bleibt erhalten
- passwortgeschützter JSON-Datenexport mit eigenem Rate Limit
- Export redigiert/entfernt Passwörter, Hashes, OAuth-Tokens, Source-/Bridge-/Device-Secrets und vergleichbare Zugangsdaten
- Roh-Mediendateien sind nicht Teil des JSON-Exports; Media-Metadaten werden exportiert
- detaillierte LIVE-/Chat-Akteursdaten Dritter werden nicht in die Selbstauskunft aufgenommen
- TikTok kann direkt im Account getrennt werden
- Account-Löschung versucht nach erfolgreicher lokaler Löschung zusätzlich, eine accountgebundene TikTok-Autorisierung beim Provider zu widerrufen
- Datenschutz- und Settings-Seiten an den realen Funktionsstand angepasst

## Sicherheitsereignisse

Neu protokollierbar: `session_revoked`, `data_export_requested`, `tiktok_disconnected`. Wie bisher ohne Klartext-IP/User-Agent/Fingerprint.

## Bewusst nicht behauptet / nicht umgesetzt

- keine fertige E-Mail-Verifizierung
- kein Passwort-Reset per Mail
- keine 2FA
- kein Export von Roh-Mediendateien in diesem JSON-Pass
- keine Garantie, dass rechtlich getrennte externe Aufbewahrung durch die Website-Kontolöschung automatisch beendet wird

## Test

`npm run lifecycle:check`

Große Acceptance-, Last- und echte LIVE-Tests bleiben pausiert. Backend 3.12.0 / Launcher 0.42.0 bleiben unverändert.
