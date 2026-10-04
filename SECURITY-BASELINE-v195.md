# SECURITY BASELINE v195

v195 verändert keine Auth-, Provider- oder Commerce-Funktion. Der Stand wird vor der realen Acceptance nur versiegelt.

- Runtime/Tooling wird SHA-256-gebunden.
- Secret-/Key-Dateien im Projekt sind verboten; `.env.example` darf keine echten sensitiven Werte enthalten.
- Acceptance-Evidence wird weiterhin auf sichere relative Referenzen und Hashes begrenzt.
- PASS benötigt Evidence; Pflicht-SKIP bleibt Blocker.
- Freeze-Drift erzwingt einen neuen Kandidaten.
- Creator-/Admin-Isolation und Passkey bleiben Teil der 48 Realtests.
- `CFS_COMMERCIAL_MODE=false`.
