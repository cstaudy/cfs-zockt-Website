# HANDOFF v195

Aktiver Stand: **v195** · Backend **3.20.38** · Schema **78** · Launcher **0.47.30**.

- v192 Website/Brand bleibt vollständig vereinheitlicht.
- v195 ist die feste Acceptance-Basis; v193/v194 wurden wegen bereits vorhandener historischer Artefakte bewusst übersprungen.
- Runtime + Acceptance-Tooling sind in `reports/rc-freeze-v195.json` per SHA-256-Tree versiegelt.
- Secret-/Config-Scan und lokaler Artifact-Rollback-Drill sind verpflichtende Release-Gates.
- `reports/rc-fixed-baseline-v195.json` bestätigt nur die feste Basis, nicht die reale Abnahme.
- Reale Matrix bleibt initial 0/48 · HOLD.
- Ablauf: `ABNAHME-ABLAUFPLAN-v195.md`.
- Bei Runtime-Drift oder Bugfix: neuer Kandidat, neuer Freeze, neuer Acceptance-Lock.
- `CFS_COMMERCIAL_MODE=false`.
