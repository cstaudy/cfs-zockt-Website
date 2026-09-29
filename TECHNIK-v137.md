# cfs_zockt v137 – Launcher Security / Release Hardening

## Versionen
- Backend: 3.12.0
- Launcher: 0.47.15
- Bridge-Protokoll: 3

## Launcher ↔ Backend
- Mutierende Requests werden mit HMAC-SHA-256 signiert.
- Signatur enthält Methode, Pfad, Timestamp, Nonce und Body-Hash.
- Remote HTTP bleibt blockiert; HTTPS ist Pflicht.
- Alte Launcher bleiben migrationsfähig.
- Sobald eine Bridge Protokoll 3 meldet, ist ein Downgrade auf unsignierte Mutationen nicht mehr zulässig.

## Replay Guard
Neue DB-Tabelle:

`creator_bridge_request_nonces`

Sie enthält nur Bridge-ID, Nonce und Ablaufzeit. Keine Credentials werden darin gespeichert.

## Creator Suite Security Readiness
Neu:

`GET /api/creator/security-readiness`

Zusätzlich wurde der technische Status um die Karte `SICHERHEIT` erweitert. Damit wird sichtbar, ob die wesentlichen Runtime-Sicherheitskontrollen aktiv sind und ob der verbundene Launcher bereits den signierten Protokoll-v3-Modus verwendet.

## Widget Studio
Die in v136 eingeführte Versions-/Konfliktsicherung bleibt aktiv. Sie verhindert weiterhin stille Überschreibungen aus mehreren Tabs/Geräten.

## Verifikation
- Security Release v137: 10/10
- Technical Foundation: 19/19
- Launcher Bridge Health: 7/7
- Launcher Bridge Resilience: 10/10
- Creator State: 11/11
- Release Readiness: 20/20
- Website Acceptance: 34/34
- Browser Request Integrity: 20/20
- Credential Security: 36/36
- MFA Security: 49/49
- Passkey Security: 75/75
- Widget Core Flow: 22/22
- Creator Tools: 35/35
- Server-/Launcher-/Frontend-JavaScript Syntax: OK

## Release-Grenze
Die internen Prüfungen bestätigen die implementierten Kontrollen. Sie ersetzen keinen externen Penetrationstest, keinen echten Windows-Installer-Test und keinen produktiven Restore-Drill.
