# cfs_zockt — RC Preflight v191

Status: **READY_FOR_REAL_ACCEPTANCE**
Profil: **repository**
Backend: **3.20.38** · Launcher: **0.47.30**

> Dieser Preflight prüft nur Voraussetzungen und Werkzeuge. Er erzeugt keinen realen Acceptance-PASS.

- **PASS** `backend.version` — Backend-Version — 3.20.38 (erwartet 3.20.36+)
- **PASS** `backend.lock` — package-lock konsistent — 3.20.38
- **PASS** `launcher.version` — Launcher-Version bekannt — 0.47.30
- **PASS** `commerce.disabled` — Commerce bleibt deaktiviert — .env.example geprüft.
- **PASS** `acceptance.matrix` — v190 Acceptance-Matrix lesbar — 48 Fälle
- **PASS** `acceptance.no_false_go` — Acceptance bleibt realitätsgebunden — 0/48 aufgelöst · HOLD
- **PASS** `tool.obs_doctor` — OBS Browser-Source Doctor vorhanden — launcher/src/obs-doctor.js
- **PASS** `tool.obs_websocket` — OBS WebSocket Controller vorhanden — launcher/src/obs-websocket-controller.js
- **PASS** `tool.support_bundle` — Secret-armer Support Bundle vorhanden — launcher/src/support-bundle.js
- **PASS** `tool.runtime_evidence` — Runtime-Evidence Sammler vorhanden — launcher/src/stream-runtime-evidence.js
- **PASS** `tool.soak_guard` — Soak-Guard vorhanden — launcher/src/stream-soak-guard.js
- **PASS** `tool.acceptance_cli` — Acceptance CLI vorhanden — tools/rc-acceptance-v190.mjs
- **PASS** `tool.windows_runner` — Windows Acceptance Runner vorhanden — RUN-RC-ACCEPTANCE-v190.cmd
- **PASS** `obs.loopback_default` — OBS WebSocket Default ist loopback — ws://127.0.0.1:4455
- **PASS** `support.no_secret_claim` — Support Bundle deklariert Secret-Ausschluss — Support-Bundle README
- **PASS** `runtime.node` — Node.js Runtime — v22.16.0
- **PASS** `reports.writable` — reports/ beschreibbar — reports/
- **PASS** `target.windows` — Windows-Zielumgebung — Repo-Preflight: platform=linux; Realtest später auf win32.
- **PASS** `target.launcher_config` — Launcher-Konfiguration für Zieltest — Optional mit --launcher-config prüfen; kein Blocker im Repo-Preflight.

Blocker: **0**

