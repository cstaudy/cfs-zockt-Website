# VALIDATION v195 — Fixed Acceptance Baseline

## Lokale technische Validierung

- `npm run project:check` — **40/40 PASS**
- `npm run freeze195:check` — **36/36 PASS**
- `npm run freeze195:verify` — **FROZEN_INTACT**
- `npm run freeze195:secret` — **0 Issues**
- `npm run freeze195:recovery` — **PASS**; 2 simulierte Drift-Dateien erkannt, 5/5 kritische Dateien bytegenau wiederhergestellt
- `npm run release:v195` — **Exit 0**
- Freeze-Tree — **750** Runtime-/Tooling-Dateien
- Freeze Tree SHA-256 — `ef0881657b337dfd3f631553c445961659edfd9b071805353a53a132b8aa0da4`

## Feste Abnahmebasis

- Status: **FROZEN_ACCEPTANCE_BASELINE**
- Backend: **3.20.38**
- Schema: **78**
- Launcher: **0.47.30**
- Commerce: **deaktiviert**
- Reale Acceptance: **0/48 · HOLD**
- Automatisches Production-GO: **nicht möglich**

## Paketnachweis

- Diff v192 → v195: **45 Dateien**
- Neu: **21**
- Geändert: **24**
- Gelöscht: **0**
- Full Project: **1310 Dateien**
- Fresh v192 + v195 Update: **1310/1310 Dateien byteidentisch**
- Frisch entpacktes v195 Full Project: **1310/1310 Dateien byteidentisch**
- Fehlend: **0**
- Zusätzlich: **0**
- Byte-Abweichungen: **0**

## Noch real auszuführen

Windows/Launcher, OBS, Twitch, TikTok, YouTube, Multistream, Reconnect/60+-Minuten-Soak, reale Browser-/Responsive-Abnahme sowie Passkey/Creator-/Admin-Isolation. Diese Prüfungen werden nicht durch lokale Repo-Tests ersetzt.

## Release-Linie

v193/v194 werden in dieser aktuellen Linie bewusst übersprungen, weil gleichnamige historische Artefakte bereits vorliegen. v195 ist der direkte feste Acceptance-Nachfolger von v192.
