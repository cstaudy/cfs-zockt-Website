# SECURITY BASELINE v150 — Website / Creator Suite

## Einordnung
Diese Baseline ergänzt die bisherigen Security-Dokumente um den v150-Festigungsblock. Sie ist kein Versprechen absoluter Sicherheit und ersetzt keinen externen Penetrationstest oder eine reale Produktionsabnahme.

## Aktive Schutzschichten
- versioniertes scrypt-Passwort-Hashing mit individuellen Salts
- sichere Session-Cookies (`HttpOnly`, `Secure` in Produktion, Host-Präfixe)
- CSRF-Schutz und Same-Origin-/Fetch-Metadata-Prüfung für Browser-Schreibzugriffe
- MFA/TOTP, Recovery Codes, Passkeys/WebAuthn und Re-Auth/Step-up
- Session-Verwaltung und Widerruf
- HSTS, CSP, `nosniff`, Referrer Policy, Permissions Policy und deaktiviertes DNS-Prefetch
- Host-/HTTPS-Fail-Closed für Produktions-Schreibzugriffe
- Request-Target-, Body-, Header-, Timeout- und Socket-Grenzen
- TRACE/TRACK/CONNECT auf Anwendungsebene nicht erlaubt
- Rate Limits; 429-Antworten sind explizit nicht cachebar
- Production-Secrets fail-closed
- OAuth-/Provider-Tokens serverseitig verschlüsselt
- getrennte Creator-/Provider-Grenzen und Besitzprüfung externer Accounts
- Launcher Bearer-/HMAC-Verträge, Nonce-/Replay-Schutz und Remote-HTTPS-Regeln
- Widget-Versionierung / Optimistic Locking
- CSP-Verstoß-Telemetrie datensparsam aggregiert
- Admin Step-up und minimiertes Admin-Audit
- Recovery-/Incident-/Lifecycle-Verträge über aktive Regressionstests

## v150 neu bzw. nachgeschärft
- `TRACE`, `TRACK` und `CONNECT` werden mit 405 abgewiesen.
- HTTP-Headeranzahl ist zusätzlich zur Byte-Grenze begrenzt.
- `X-DNS-Prefetch-Control: off` ist in dynamischen und statischen Headern gesetzt.
- Rate-Limit-Fehler setzen Browser-/CDN-/Surrogate-No-Store.
- öffentliche Security-/Status-Navigation wurde sichtbarer gemacht.
- aktiver Projekt-Regressionstest wurde auf aktuelle vorhandene Sicherheitsprüfungen konsolidiert.
- neue v150-Hardening-Prüfung kontrolliert 35 Kernverträge.

## Lokal verifiziert
- Website Hardening v150: **35/35 PASS**
- aktiver Projekt-Regressionstest: **30/30 PASS**
- Release Readiness: **20/20 PASS**
- Technical Foundation: **19/19 PASS**
- JSON-Parse-Sweep: **26 Dateien**
- JS/MJS-Syntax-Sweep: **486 Dateien**
- kompletter `npm run release:v150`: **PASS**

## Bewusst noch nicht verifiziert
- externer Penetrationstest
- Online-Dependency-Advisory-Audit gegen npm Registry
- echte Production-Smokes aus externer Perspektive
- Backup-Restore-Drill in einer realen Produktionsumgebung
- reale Multi-Creator-Isolation über mehrere fremde Accounts
- reale Windows-/OBS-/Provider-/Reconnect-/Soak-Abnahme

Die Live-/Online-Prüfungen konnten in der isolierten Arbeitsumgebung nicht durchgeführt werden, weil externe Ziele bzw. die npm Registry dort nicht erreichbar waren. Dieser Umstand darf nicht als PASS gewertet werden.

## Aktive Script-Integrität
Der aktive v150-Release-Graph wird separat geprüft: **35 aktive npm-Skripte** besitzen keine fehlenden Alias- oder Node-Dateireferenzen. Historische, nicht mehr aktive npm-Aliase werden dadurch nicht fälschlich als aktuelle Release-Prüfung behandelt.
