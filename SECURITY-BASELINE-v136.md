# cfs_zockt – Sicherheitsgrundstufe v136

## Status
**Grundschutz vorhanden und technisch erweitert.**

Dieser Status bedeutet: wichtige Standard-Schutzmaßnahmen sind im Code vorhanden und durch die vorhandenen automatisierten Tests abgedeckt. Er bedeutet ausdrücklich nicht, dass eine unabhängige Penetrationsprüfung oder ein vollständiges Produktionsaudit bereits abgeschlossen wurde.

## Account
- scrypt-basierte Passwortableitung mit Migration älterer KDF-Versionen
- Mindestpasswortlänge und serverseitige Blocklist
- MFA / TOTP
- Recovery Codes
- Passkeys / WebAuthn
- Session-Widerruf und Session-Verwaltung
- geschützte Account-Lifecycle-Funktionen

## Browser / API
- CSRF-Schutz
- Origin-/Referer-/Sec-Fetch-Site-Prüfung für geschützte Schreibzugriffe
- `Cache-Control: no-store/private` für sensible Antworten
- Rate Limiting
- serverseitige Validierung und Sanitizing

## Launcher
- Bridge-Schlüssel werden serverseitig nur gehasht gespeichert
- widerrufbare Bridge-Zugänge
- zeitlich begrenzter Device-Link
- Heartbeat / online-degraded-offline Zustände
- HTTPS-Pflicht für Remote-Backends ab v136
- Session-Bindung und Altersprüfung von LIVE-Events ab v136

## Widget Studio
- Draft und Published Version getrennt
- serverseitig sanitisiertes Widget-Modell
- rotierbare öffentliche Output-Tokens
- Feature-/Plan-Prüfung im Backend
- keine automatische Veröffentlichung durch Schnellstarts
- Optimistic Locking gegen versehentliches Überschreiben ab v136

## Vor größerem öffentlichen Rollout noch erforderlich
- unabhängiger Penetrationstest
- Windows Release-/Installer-Signierung und echte Geräteabnahme
- produktiver Backup-Restore-Test
- Dependency Audit im Release-Prozess
- Beta-/Soak-Test mit mehreren realen Creator-Accounts
