# cfs_zockt – Sicherheitsgrundstufe v137

## Ziel
v137 härtet die kritische Verbindung zwischen Creator-PC/Launcher und Backend weiter ab und macht den Sicherheitszustand im Creator-Bereich sichtbar.

## Neu in v137

### Signierte mutierende Launcher-Anfragen
Ab Launcher 0.47.15 signiert der Launcher jede mutierende Bridge-Anfrage (POST/PUT/PATCH/DELETE) zusätzlich zum bestehenden Bearer-Token.

Die Signatur bindet:
- HTTP-Methode
- Request-Pfad
- Client-Zeitstempel
- kryptografische Nonce
- SHA-256-Hash des Request-Bodys

Algorithmus: HMAC-SHA-256 mit dem bestehenden, ausschließlich lokal gespeicherten Bridge-Credential.

### Replay-Schutz
Der Server speichert nur kurzlebige Nonces – keine Bridge-Secrets. Eine bereits verwendete signierte Mutation wird innerhalb des Gültigkeitsfensters abgewiesen.

- Signatur-Zeitfenster: ±2 Minuten
- Nonce-Aufbewahrung: 5 Minuten
- Nonce ist pro Bridge eindeutig
- abgelaufene Nonces werden entfernt

### Sichere Migration alter Launcher
Alte Launcher bleiben vorerst kompatibel. Sobald eine Bridge `signed_requests_v1` / Protokoll 3 meldet, werden für diese Bridge mutierende Requests nur noch mit gültiger Signatur akzeptiert. Dadurch kann ein bereits aktualisiertes Gerät nicht still auf den unsicheren Legacy-Modus zurückfallen.

### Security Readiness
Im technischen Status gibt es jetzt eine eigene Sicherheitskomponente. Zusätzlich:

`GET /api/creator/security-readiness`

Der Endpunkt ist nur für eingeloggte Creator zugänglich und gibt ausschließlich Prüfergebnisse zurück – keine Secrets, Schlüssel oder Tokens.

Geprüft werden unter anderem:
- HTTPS / kanonischer Origin
- CSRF-Signing
- Token-Verschlüsselung
- MFA-Recovery-Secret
- Account-Step-up-Secret
- Admin-Audit-Secret
- WebAuthn-Origin
- CSP-Grundregeln
- HSTS-Produktion
- Widget Conflict Guard
- Launcher Request Signing
- Launcher Replay Guard

## Bereits vorhandene Sicherheitsbasis
- scrypt KDF mit Versionierung und Legacy-Migration
- Passwort-Mindestlänge 15
- MFA / TOTP / Recovery Codes
- Passkeys / WebAuthn
- serverseitige Sessions und Widerruf
- Account-/Admin-Step-up
- CSRF + Browser-Origin-/Fetch-Site-Prüfung
- `no-store/private` für sensible APIs
- Rate Limits
- CSP / HSTS / no-sniff / Same-Origin Framing
- verschlüsselte TikTok-/Mail-/Token-Secrets
- gehashte Bridge- und Device-Link-Secrets
- sichere Device-Link-Ablaufzeit
- HTTPS-Zwang für Remote-Launcher
- Session-/Zeitbindung für LIVE-Events
- Widget Sanitizing
- Widget Draft/Published-Trennung
- Optimistic Locking gegen Multi-Tab-Überschreiben
- rotierbare öffentliche Widget-Tokens
- manipulationssichtbare Admin-Audit-Kette

## Was vor einem großen öffentlichen Release weiterhin extern geprüft werden muss
Kein Softwarestand kann seriös als „ohne jede Sicherheitslücke“ garantiert werden. Vor einer breiten Freigabe bleiben deshalb als Release-Gates:

1. unabhängiger Penetrationstest
2. Dependency-/Supply-Chain-Audit mit Online-Advisory-Datenbank
3. signierter Windows-Installer und SmartScreen-/Update-Abnahme
4. produktiver Backup-Restore-Drill
5. Mehrgeräte-/Mehraccount-Beta und längerer Soak-Test
6. reale Reconnect-/Netzausfall-/Sleep-/Resume-Tests auf Windows
7. Incident- und Credential-Rotation-Drill

Diese Punkte sind bewusst als offene Release-Gates dokumentiert und werden nicht durch interne Tests als erledigt dargestellt.
