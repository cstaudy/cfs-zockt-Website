# cfs_zockt – Production Finalization Pass 12

**Stand:** 15.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Pass 12 macht aus den zwei offenen Release-Blockern aus Pass 11 maschinenprüfbare, fail-closed Production-Gates.

## Neu

- `npm run production:gate`
- `npm run production:external-gate` für schnelle Wiederholung der externen Gates nach bereits grünem Preflight
- `npm run lockfiles:generate`
- `npm run lockfiles:check`
- GitHub Workflow `.github/workflows/dependency-lockfiles.yml`
- Production-/Launcher-Workflows auf `npm ci` umgestellt
- Edge Check V2 mit Root-/www-DNS, Canonical Redirect, TLS, Security Header und Standard-Discovery-Dateien
- `PRODUCTION_GO_LIVE_RUNBOOK.md`

## Aktueller Gate-Status

Interne Release-Automation aus Pass 11 bleibt grün. Das Production-Gate bleibt bewusst rot, solange:

1. `package-lock.json` und `launcher/package-lock.json` fehlen, oder
2. `cfs-zockt.de`/`www.cfs-zockt.de` nicht öffentlich auflösbar und via HTTPS prüfbar sind.

Es wurden keine Lockfiles künstlich konstruiert und kein Domain-/TLS-Status erfunden.

## Zusätzliche Deploy-Härtung

- `CFS_PRODUCTION_URL` ist im Production-Deploy nicht mehr optional.
- Der Workflow akzeptiert für Production nur die kanonische Origin `https://cfs-zockt.de`.
- Nach dem Canary läuft zusätzlich `production:external-gate`.
- Production Verification führt denselben externen Gate erneut aus.
- Damit kann eine funktionierende Render-Servicedomain eine kaputte Custom Domain nicht versehentlich als Production-GO verdecken.
