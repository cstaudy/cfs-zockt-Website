# Übergabe – v27 GitHub CI + Post-Deploy Automation

## Status
Keine neue Website-Runtime und keine Änderung an Backend/Auth/Billing.

v27 verbindet RC25 und den v24 Creator-OS-Stand mit den vorhandenen GitHub-Actions-Deploy-Workflows.

## Neue Repo-Dateien
- `tools/deploy-automation-v27-test.mjs`
- `DEPLOY_AUTOMATION_V27.md`

## Geändert
- `.github/workflows/quality-gate.yml`
- `.github/workflows/production-deploy.yml`
- `.github/workflows/production-verification.yml`
- `tools/postdeploy-ui-acceptance-v21.mjs`
- `package.json`
- `RELEASE-MANIFEST-v25.json`

## Neue Prüfung
`npm run deploy27:check`

## GitHub Push / PR
Quality Gate prüft jetzt:
- Deploy-Automation v27
- RC25
- bestehende Repository-/Backend-/Launcher-Gates

## Production Deploy
Nach Render Canary + External Security Gate:
- Creator-OS UI Live-Check
- Retry-Fenster
- Evidence JSON als Artifact

## Rollback
Der zusätzliche Creator-OS-Designcheck läuft nur für `canary`, nicht für `rollback`.

## Noch nicht ausgeführt
- kein Remote-Push
- kein Render-Deploy
- kein Live-PASS
- R62 weiterhin offen
