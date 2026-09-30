# Security Baseline v152

Zusätzlich zur v151/v150-Basis:

- kostenpflichtige Checkouts fail-closed über `CFS_COMMERCIAL_MODE=false`
- versionierte Legal-Acceptance-Nachweise bei Registrierung
- Datenschutz-Kenntnisnahme wird nicht als pauschale Tracking-Einwilligung behandelt
- nicht notwendige Funnel-/Merch-Persistenz entfernt
- bestehende Session-/CSRF-/MFA-/Passkey-/Provider-Isolation aus der kumulativen Basis bleibt erhalten

Externe Rechtsberatung, Production-Smokes, Provider- und Windows-/OBS-Feldtests bleiben reale Abschlussgates.
