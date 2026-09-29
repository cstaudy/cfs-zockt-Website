# cfs_zockt v136 – technische Grundfestigung

## Ziel
v136 stärkt drei Kernbereiche, bevor weitere große Funktionen dazukommen:

1. Launcher ↔ Backend
2. LIVE-/Event-Übertragung
3. Widget Studio / sichere Veröffentlichung

Der Schwerpunkt ist nicht neues Marketing, sondern Fehlertoleranz, Schutz vor falschen Zuständen und Schutz vor unbeabsichtigtem Überschreiben.

## Launcher / Bridge

### Sichere Transport-Grundregel
Der Launcher blockiert Remote-Backend-URLs über unverschlüsseltes HTTP. Für echte Remote-Verbindungen ist HTTPS Pflicht. HTTP bleibt nur für lokale Entwicklung über localhost / 127.0.0.1 / ::1 erlaubt.

Damit kann ein falsch konfigurierter Creator-PC seinen Bridge-Schlüssel nicht versehentlich über eine unverschlüsselte Remote-Verbindung senden.

### Bridge-Protokoll v2
Der Launcher meldet jetzt unter anderem:

- `session_scoped_events_v1`
- `secure_transport_guard_v1`
- `protocol_version: 2`

Launcher-Version: **0.47.14**.

### LIVE-Events an Session gebunden
Neue Launcher-Events tragen die bekannte LIVE-Session-ID mit. Der Server verwirft Events, die zu einer alten Session gehören, statt sie in einen neuen Stream zu übernehmen.

Das schützt besonders vor verspäteten Events nach Reconnect, Neustart oder längerer Offline-Phase.

### Zeitliche Event-Grenzen
Launcher-Events erhalten einen Client-Zeitstempel. Der Server verwirft extrem verspätete oder unplausibel zukünftige Events.

Aktuelle Obergrenzen:

- Viewer Update: 2 Minuten
- Chat: 5 Minuten
- Likes: 10 Minuten
- Follow / Share / Gift: 60 Minuten

Alte Launcher-Versionen ohne Zeitstempel bleiben vorerst kompatibel.

Der Launcher zählt serverseitig verworfene Events in `metrics.droppedByServer`, damit solche Fälle später diagnostizierbar bleiben.

## Widget Studio

### Schutz gegen Multi-Tab-/Multi-Gerät-Überschreiben
Entwurf, Veröffentlichen und manuelle Live-Steuerung senden jetzt die erwartete Widget-Version an das Backend.

Wenn dasselbe Widget inzwischen in einem anderen Tab oder auf einem anderen Gerät geändert wurde, antwortet das Backend mit `409 widget_version_conflict`, statt den neueren Stand still zu überschreiben.

Das schützt Creator insbesondere vor verlorenen Layout-/Konfigurationsänderungen.

### Bestehende Sicherheitsregeln bleiben erhalten
Die bisherigen Sanitizer, Plan-/Entitlement-Prüfungen, Public-Token-Rotation, Draft-vs-Published-Trennung und serverseitige Runtime-Bereinigung bleiben unverändert aktiv.

## Bereits vorhandene Sicherheitsgrundstufe
Der aktuelle Projektstand besitzt bereits unter anderem:

- gehashte Passwörter mit versioniertem scrypt-KDF
- MFA / TOTP / Recovery Codes
- Passkeys / WebAuthn
- serverseitige Sessions
- CSRF-Schutz
- Browser-Write-Origin-/Fetch-Site-Prüfung
- sensible API-Antworten mit `no-store`
- Rate Limits auf kritischen Auth-/Launcher-/Bridge-Flows
- gehashte Bridge-Tokens in der Datenbank
- widerrufbare Launcher-Geräte-/Bridge-Zugänge
- Device-Link mit Ablaufzeit
- Security Events / Account Lifecycle
- öffentliche Output-Tokens können rotiert werden
- Widget-Konfiguration wird serverseitig sanitisiert

## Was noch nicht als „fertig abgesichert“ gelten sollte
Die Grundstufe ist belastbar, ersetzt aber keine externe Sicherheitsprüfung. Vor einem größeren öffentlichen Creator-Rollout bleiben besonders wichtig:

1. externer Penetrationstest / unabhängiger Security Review
2. echte Windows-Launcher-Abnahme mit signiertem Release-Artefakt
3. Restore-Test der produktiven Datenbank-Backups
4. Dependency-/Supply-Chain-Prüfung bei jedem Release
5. längere Reconnect-/Offline-/Soak-Tests mit echten Creator-Sessions
6. kontrollierter Beta-Rollout vor breiter Freigabe

## Verifikation v136

- Technical Foundation v136: 19/19
- Launcher Bridge Resilience: 10/10
- Launcher Bridge Health: 7/7
- Widget Core Flow: 22/22
- Widget 30s UX: 40/40
- Creator Tools: 35/35
- Browser Request Integrity: 20/20
- Credential Security: 36/36
- MFA Security: 49/49
- Passkey Security: 75/75
- Release Readiness: 20/20
- Website Acceptance: 34/34
- Server-/Launcher-/Widget-JavaScript Syntax: OK
