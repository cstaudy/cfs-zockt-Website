# cfs_zockt – Security Baseline v138

v138 übernimmt die Sicherheitskontrollen aus v137 unverändert und ergänzt ein explizites Release-Gate.

## Kernkontrollen
- scrypt-Passwortschutz und Session-Widerruf
- MFA/TOTP, Recovery Codes, Passkeys/WebAuthn
- CSRF- und Browser-Origin-Prüfung
- CSP/HSTS/no-sniff/Same-Origin-Framing
- verschlüsselte Drittanbieter-Secrets
- gehashte Bridge-/Device-Link-Secrets
- HTTPS-Pflicht für Remote-Launcher
- HMAC-signierte Launcher-Mutationen
- Replay-Nonce-Guard
- Session-/Zeitbindung für LIVE-Events
- Widget-Sanitizing, Draft/Published-Trennung und Optimistic Locking
- rotierbare öffentliche Widget-Tokens
- manipulationssichtbare Admin-Audit-Kette

## Release-Sicherheitsregel
`/api/creator/release-readiness` trennt interne technische Bereitschaft von externer Production-Abnahme. Solange Penetrationstest, Supply-Chain-Audit, Windows-Signing/Installer, Restore-Drill und Soak-Tests offen sind, wird `production_ready` nicht als wahr ausgegeben.

Damit wird ein lokaler grüner Teststand nicht fälschlich als vollständige externe Sicherheitsfreigabe dargestellt.
