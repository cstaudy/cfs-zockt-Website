# SECURITY BASELINE v155 — Acceptance Hardening

v155 verändert den Produkt-Sicherheitsvertrag nicht, sondern prüft ihn im Acceptance-Pfad strenger.

## Erhaltene Invarianten

- `CFS_COMMERCIAL_MODE=false` für die kostenlose private Beta
- keine Stream-Keys in PostgreSQL
- keine Stream-Keys im Browser-State
- keine Stream-Keys in URLs
- keine Stream-Keys in Support-Exports oder Logs
- kein Cloud Relay
- Stream-Credentials nur lokal verschlüsselt mit SafeStorage
- Bridge-Authentisierung, HMAC-signierte mutierende Requests, Nonce/Replay-Schutz
- `no-store` auf Secret-/Bridge-Antworten
- Creator-, Provider- und Ziel-Isolation
- Fail closed bei fehlender lokaler OS-Verschlüsselung
- Ausfall eines Streaming-Ziels darf andere Ziele nicht beenden
- manueller Zielstop darf keinen automatischen Reconnect dieses Ziels erzwingen

## Neue ausführbare Credential-Prüfung

`launcher/tools/stream-credential-store-test.mjs` prüft die lokale Secret-Persistenz mit **29/29 PASS**. Insbesondere wird verifiziert, dass weder der Stream-Key noch die vollständige RTMP/RTMPS-Server-URL im Klartext in der Credential-Datei stehen und öffentliche Snapshots keine Secrets enthalten.

## Acceptance-Regel

Reale Provider-/Windows-/OBS-Punkte werden nur als bestanden markiert, wenn sie tatsächlich ausgeführt wurden. Fehlende externe Voraussetzungen bleiben offen oder werden als übersprungen dokumentiert. Es gibt keine simulierten LIVE-PASS-Ergebnisse.
