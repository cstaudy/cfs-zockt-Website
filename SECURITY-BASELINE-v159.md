# Security Baseline v159

v159 verändert die bestehende Secret-/Provider-Architektur nicht.

## Neuer öffentlicher Launcher Endpoint

`GET /api/public/launcher/releases`

Er liefert ausschließlich öffentliche GitHub-Release-Metadaten. Der Endpoint besitzt keinen Creator-Kontext und gibt keine Account-, Device-, OAuth-, Bridge- oder Stream-Credentials aus.

## Download Trust Boundary

Die Website speichert oder proxyt keine Launcher-EXE als verstecktes internes Binary. Download-URLs werden nur aus normalisierten GitHub Release Assets übernommen.

Ohne veröffentlichtes Setup bleibt die Download-Schaltfläche deaktiviert.

## Öffentliche Release-Signatur

Für GitHub Tag-Releases ist ab v159 eine gültige Windows Authenticode-Signatur Pflicht. Der Workflow prüft alle erzeugten `.exe`-Dateien vor dem Publish-Schritt.

Manuelle interne Workflow-Builds dürfen weiterhin unsigniert bleiben, werden aber nicht als öffentlicher GitHub Release veröffentlicht.

## Unverändert

- keine Stream Keys in PostgreSQL
- keine Stream Keys im Browser-State
- Launcher SafeStorage
- Creator Isolation
- Provider Isolation
- HMAC/Nonce/Replay-Schutz
- kein Cloud Relay
- Private Beta / Commercial Mode off
