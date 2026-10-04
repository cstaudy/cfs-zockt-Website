# TECHNIK v195 — Fixed Acceptance Baseline

- Backend 3.20.38
- Schema 78
- Launcher 0.47.30
- Base: v192
- Versionen v193/v194 werden in dieser Release-Linie übersprungen, weil gleichnamige historische Artefakte bereits im Projekt vorhanden sind.
- Runtime-/Tooling-Freeze via SHA-256 tree.
- Evidence-/Report-Pfade bleiben mutable und liegen außerhalb des Runtime-Freeze.
- Secret-/Config-Scan prüft sensitive Dateitypen und Hochrisiko-Schlüsselpräfixe.
- Lokaler Rollback-Drill arbeitet ausschließlich in einem temporären Verzeichnis.
- Reale Acceptance: 48 Fälle, weiterhin manuell und evidencegebunden.
- CFS_COMMERCIAL_MODE=false.
