# cfs_zockt – Application Recovery / Rollback Pass 19

**Stand:** 16.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Pass 19 schließt die Lücke zwischen einem grünen Release und einem realen Betriebsfehler nach dem Deploy. Datenbank-Recovery aus Pass 18 bleibt bewusst getrennt.

## Neue Bausteine

- `ops/application-recovery-policy.json`
- `tools/release-state-snapshot.mjs`
- `tools/release-state-verify.mjs`
- `tools/application-recovery-evidence.mjs`
- `tools/application-recovery-doctor.mjs`
- `.github/workflows/production-recovery.yml`
- JSON-Ausgabe für den bestehenden Edge-/TLS-Check

## Release-State Snapshot

`npm run release:snapshot` erzeugt einen datensparsamen Snapshot des auszurollenden Stands. Enthalten sind Git-SHA, Backend-/Launcher-Version, Lockfile-Status und SHA-256-Hashes releasekritischer Repository-Dateien.

Secret-Werte werden nicht gespeichert. Für erforderliche Production-Secrets wird ausschließlich festgehalten, ob im aktuellen Prozess ein Wert vorhanden ist.

## Recovery-Verfahren

Der manuelle GitHub-Workflow akzeptiert nur einen expliziten Git-SHA und die Bestätigungsphrase `RECOVER_PRODUCTION`. Der Ziel-Commit wird ausgecheckt, gegen seinen SHA geprüft, mit `npm ci` installiert und durch den Release-Preflight geschickt.

Danach wird der bekannte gute Commit über den vorhandenen Render Deploy Hook mit `ref=<commit>` redeployed. Nach dem Deploy sind zwingend:

- Production Canary
- kompletter Edge-/DNS-/TLS-Check
- Recovery-Evidence

## Wichtige Sicherheitsgrenze

Application-Rollback führt **keinen** Datenbank-Restore aus. Damit können neuere Nutzerdaten nicht versehentlich durch einen Code-Rollback überschrieben werden. Ein DB-Restore folgt ausschließlich dem separaten Pass-18-Verfahren.

## Evidence

`application-recovery-evidence.mjs` schreibt die Evidence nur, wenn Canary und Edge-Report beide erfolgreich sind. Zusätzlich werden SHA-256-Hashes der beiden Input-Evidence-Dateien gespeichert.

## Operations-Status

In der aktuellen Arbeitsumgebung kann der echte Recovery-Drill noch nicht als bestanden gelten, weil Root-/Launcher-Lockfiles fehlen und die Production-Domain nicht öffentlich auflösbar ist. `npm run apprecovery:doctor` soll deshalb bis zum realen Drill fail-closed bleiben.
