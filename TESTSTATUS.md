# cfs_zockt R10 – Teststatus

## Geprüft
- PASS: `node tools/cfs-obs-r10-readiness-qa.cjs` (12 manuelle Fälle, Report ohne Tokens/URLs, same-origin Creator-Status, 401/403, ungültige Antworten).
- PASS: `node tools/cfs-obs-r9-contract-test.cjs` (Maker/Scene/Widget-Ausgabeformate).
- PASS: `node tools/cfs-obs-setup-r8-test.cjs` (Source-URL-Filter und Quellen-API).
- PASS: `node tools/cfs-r5-security-test.mjs` (16/16).
- PASS: `node tools/cfs-ai-verified-bridge-v32072-test.mjs` (17/17).
- PASS: `node tools/admin-finance-v32071-test.mjs` (24/24).
- PASS: `node tools/stream-studio-foundation-pass21-8-test.mjs` (46/46).
- PASS: Kumulativer Installer --check/--apply/--verify/idempotent/unknown conflict auf 3.20.71 und R9 (siehe Testlauf).

## Grenzen und Betrieb
- Windows PowerShell/OBS-Realtest NICHT ausgeführt; der Windows-Helfer kann unter Linux nicht nativ geprüft werden.
- Automatische Creator-Readiness holt ausschließlich bestätigte Antworten aus `/api/creator/stream-ready`; sie prüft nicht das OBS-Vorschaubild.
- Die 12 Fälle werden nur vom Nutzer manuell bewertet, niemals automatisch auf PASS gesetzt.
- Keine Live-Deployment-/Render- oder echten Stream-/YouTube-/Twitch-/Stripe-End-to-End-Tests.
- Alte breite Regressionen/Originaldesign-Pakete weiterhin separat offen, da die Kompaktbasis das Designarchiv nicht enthält.
- Beta HOLD 0/56 externe/manuelle Original-Abnahmen; bezahlt Designpakete bleiben gesperrt.
