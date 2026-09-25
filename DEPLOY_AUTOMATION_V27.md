# cfs_zockt – Deploy Automation v27

v27 verbindet den aktuellen Creator-OS-Release-Stand direkt mit den bereits vorhandenen GitHub-Actions-Workflows.

## Pull Request / Push auf `main`

Der bestehende **Creator Suite Quality Gate** führt jetzt zusätzlich aus:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run deploy27:check
npm run release25:verify
```

Außerdem wird ein maschinenlesbares RC25-Evidence-JSON als GitHub-Artifact gespeichert.

## Manueller Production Deploy

Der bestehende Workflow **Production Deployment Gate** prüft vor dem Render-Trigger zusätzlich:

```bash
npm run deploy27:check
npm run release25:verify
```

Nach erfolgreichem Production-Canary und External-Security-Gate prüft er den tatsächlich ausgelieferten Creator-OS-Stand.

Der Post-Deploy-Check kontrolliert jetzt zusätzlich:

- `cfs-os-v24` in der globalen Shell
- v24 Creator-OS-Global-Layer im Theme
- v24 Component-Layer im konsolidierten UI-CSS
- weiterhin die v18 Bundle-Architektur
- öffentliche Kernseiten
- `/api/health`
- `/api/public/status`

Der Live-Check wird beim Deployment mehrfach wiederholt, damit ein kurzer Render-Rollout bzw. Cache-Übergang nicht sofort zu einem Fehlalarm führt.

## Manuelle Production Verification

Im `canary`-Modus wird die Creator-OS-UI ebenfalls geprüft und als Evidence hochgeladen.

Im `rollback`-Modus wird diese Designprüfung bewusst nicht erzwungen, weil ein legitimer Rollback auf einen älteren visuellen Stand zeigen kann.

## Lokal

```bash
npm run deploy27:check
npm run release25:verify
npm run postdeploy21:ui:local
```

## Sicherheitsgrenze

Die Workflows enthalten keine neuen Secrets. Der Render-Deploy-Hook bleibt ein GitHub Secret; die Production-URL bleibt eine Repository Variable.

v27 führt in dieser Chat-Sitzung selbst keinen Remote-Push und keinen Render-Deploy aus.
