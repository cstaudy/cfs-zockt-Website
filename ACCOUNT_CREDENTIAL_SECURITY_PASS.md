# cfs_zockt – Account Credential Security Pass

Stand: 15.09.2026
Backend: 3.12.0
Launcher: 0.42.0

## Ziel

Passwort- und Credential-Sicherheit des Creator-Accounts härten, ohne einen noch nicht vorhandenen Mail-Recovery-Prozess vorzutäuschen.

## Umgesetzt

- Passwortwechsel im eingeloggten Creator-Account
- erneute Prüfung des aktuellen Passworts vor der Änderung
- eigenes Rate Limit für Passwortänderungen
- nach erfolgreicher Änderung: Widerruf aller alten Login-Sessions und Ausgabe einer neuen Session für den aktuellen Browser
- Sicherheitsereignis `password_changed`
- neue Passwörter benötigen mindestens 15 Zeichen, maximal 128
- keine Pflicht für Großbuchstaben, Zahlen oder Sonderzeichen; lange Passphrasen und Leerzeichen sind erlaubt
- serverseitige Blockliste für besonders häufige/erwartbare Werte sowie exakte accountbezogene Werte
- `password_kdf_version` in `creator_accounts`
- scrypt V2 mit N=2^15, r=8, p=3 und 64 MiB `maxmem`
- bestehende V1-Hashes bleiben verifizierbar und werden nach erfolgreichem Login automatisch auf V2 migriert
- Registrierung und Account-Oberfläche auf die neue Passwort-Policy aktualisiert
- Support kommuniziert transparent, dass Passwort-Reset per E-Mail noch nicht freigegeben ist und niemals Passwörter/Tokens über Support angefordert werden

## Bewusst noch nicht umgesetzt

- E-Mail-Verifizierung
- Self-Service „Passwort vergessen“ per E-Mail
- 2FA / Passkeys

Diese Punkte werden erst freigegeben, wenn ein vertrauenswürdiger Transaktions-Mail-/Recovery-Kanal konfiguriert und getestet ist. Kein manueller Reset allein aufgrund einer Support-Nachricht.

## Test

`npm run credential:check`

Erwarteter Stand: 36/36 Checks.

Die großen Acceptance-, Last- und echten LIVE-Endtests bleiben weiterhin pausiert.
