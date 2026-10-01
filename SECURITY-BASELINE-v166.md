# Security Baseline v166

v166 verändert keine Security-Grenze und keine Secret-Persistenz.

Erhalten bleiben insbesondere:

- serverseitige Sessions und CSRF-Schutz,
- Passkeys/WebAuthn,
- TOTP-MFA und Recovery-Codes,
- Passwortwechsel mit Session-Revoke,
- Session-Verwaltung,
- Datenexport mit Re-Authentifizierung,
- Account-Löschung mit Bestätigung,
- verschlüsselte Provider-Tokens,
- lokale Launcher-/Stream-Credentials,
- `no-store`/Secret-Grenzen der Launcher-Bridge.

Die einzige Änderung ist die Informationsarchitektur: technische Schutzdetails und Diagnosebereiche sind sekundär bzw. einklappbar, ihre Funktionen und IDs bleiben vorhanden.

`project:check`: **40/40 PASS**. `release:v166`: **PASS / Exit 0**.
