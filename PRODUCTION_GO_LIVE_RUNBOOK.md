# cfs_zockt – Production Go-Live Runbook

**Stand:** 16.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0  
**Basis:** Release Candidate Pass 11 + Production Finalization Pass 12 + Database Recovery Pass 18

## Release-Regel

Der interne Release Candidate ist erst ein öffentliches **GO**, wenn `npm run production:gate` vollständig grün ist.

## Gate A – reproduzierbare Dependencies

Erforderlich:

- `package-lock.json`
- `launcher/package-lock.json`
- `npm run lockfiles:check` = PASS
- Backend und Launcher lassen sich mit `npm ci` aus einem frischen Checkout installieren.

Wenn lokal kein npm-Netz verfügbar ist, kann in GitHub Actions **Generate Dependency Lockfiles** manuell gestartet werden. Die beiden erzeugten Lockfiles müssen danach geprüft und in das Repository übernommen werden. Erst dann dürfen Production-/Launcher-Workflows laufen.

## Gate B – Render / DNS

1. Custom Domain `cfs-zockt.de` im Render-Service hinzufügen und verifizieren.
2. DNS beim Provider setzen.
3. Für einen klassischen DNS-Provider ohne CNAME-Flattening/ALIAS:
   - Root `@`: A → `216.24.57.1`
   - `www`: CNAME → `<dein-render-service>.onrender.com`
4. Vorhandene `AAAA`-Einträge für Root/`www` während der Render-Konfiguration entfernen.
5. `APP_BASE_URL=https://cfs-zockt.de` setzen.
6. `CFS_ALLOWED_HOSTS` mindestens auf kanonische Domain, `www`-Alias und benötigte Render-Operationsdomain begrenzen.
7. In Render Custom Domains die Domain verifizieren und TLS-Ausstellung abwarten.

Render verwaltet TLS für verifizierte Custom Domains und leitet HTTP auf HTTPS um. Die Anwendung prüft zusätzlich Host/Kanonisierung und Security Header.

## Gate C – Production Secrets

Vor Start müssen mindestens die im Config Doctor als required markierten Secrets gesetzt sein, insbesondere:

- `DATABASE_URL`
- `CFS_TOKEN_ENCRYPTION_KEY`
- `CFS_CSRF_SIGNING_SECRET`
- `CFS_PUBLIC_REVIEW_HASH_SALT`
- `CFS_PUBLIC_SUPPORT_HASH_SALT`
- `CFS_MFA_RECOVERY_HASH_SALT`
- `CFS_ADMIN_ELEVATION_SECRET`
- `CFS_ADMIN_AUDIT_HMAC_SECRET` – eigener stabiler HMAC-Schlüssel (mind. 32 Zeichen) für die manipulationssichtbare Admin-Audit-Kette

Mail/Billing nur aktivieren, wenn deren eigene Secrets vollständig vorhanden und real getestet sind.

## Gate D – echter Edge-Test

Nach erfolgreichem Deploy:

```bash
APP_BASE_URL=https://cfs-zockt.de npm run edge:check
```

Der Check prüft unter anderem:

- Root-DNS
- `www`-DNS und Canonical-Redirect
- HTTP→HTTPS
- HTTPS-Erreichbarkeit
- HSTS
- CSP
- nosniff
- Referrer Policy
- Permissions Policy
- `security.txt`
- `robots.txt`
- `sitemap.xml`
- vertrauenswürdiges, nicht abgelaufenes TLS-Zertifikat

## Gate E – externe Schnellprüfung

Nach einem bereits grünen internen Preflight kann ausschließlich die reale Außenkante erneut geprüft werden:

```bash
APP_BASE_URL=https://cfs-zockt.de npm run production:external-gate
```

## Gate F – kompletter Production-Gate

```bash
APP_BASE_URL=https://cfs-zockt.de npm run production:gate
```

Nur **GO** ist ein öffentlicher Release. `NO-GO` darf nicht manuell übergangen werden.

## Featureabhängige Realtests

Vor Aktivierung der jeweiligen Funktion zusätzlich:

- Mail: echte Zustellung + Bounce/Fehlerfall
- Passkeys: echter Browser + echter Authenticator auf finaler HTTPS-Origin
- Launcher: Windows Installer/Portable auf realem Windows-System
- LIVE: reale Provider-/OBS-Session entsprechend Release-Scope

## Pass 13 · Deployment Setup Doctor

Vor dem eigentlichen External Gate zusätzlich ausführen:

```bash
npm run deployment13:check
npm run deployment:doctor
```

Erwartung:

- `deployment13:check` muss vollständig grün sein.
- `deployment:doctor` bleibt **NO-GO**, solange Root-/Launcher-Lockfiles fehlen.
- Auf dem echten Production-Host bzw. mit echten Render-Environment-Werten prüft der Doctor zusätzlich kanonische Origin, TikTok-Callback, WebAuthn-RP-ID, Host-Allowlist sowie die bereits vorhandenen Runtime-Config-Doctor-Regeln.
- Secret-Werte werden nicht in den Doctor-Report geschrieben.

Für die DNS-Seite bleiben die Render-Vorgaben maßgeblich: Root-Domain auf Render zeigen; `www` als CNAME auf die Render-Servicedomain. Bei Providern ohne ALIAS/ANAME/CNAME-Flattening kann Render für die Root-Domain den A-Record `216.24.57.1` verwenden. Bei Cloudflare gelten die abweichenden Render-Hinweise für CNAME-Flattening.

## Gate G – Database Recovery / Restore-Drill (Pass 18)

Vor dem öffentlichen Go-Live muss nicht nur ein Backup existieren, sondern eine Wiederherstellung praktisch nachgewiesen sein.

1. Beim tatsächlich verwendeten Render-Postgres-Plan prüfen, ob PITR/Recovery verfügbar und aktiviert ist.
2. Vor größeren Migrationen zusätzlich einen logischen Backup-Export erzeugen.
3. Für unabhängige/offsite Backups optional das projektinterne verschlüsselte Custom-Format verwenden:

```bash
DATABASE_URL=... CFS_BACKUP_ENCRYPTION_KEY=... npm run dbbackup:create
CFS_BACKUP_ENCRYPTION_KEY=... npm run dbbackup:verify -- backups/<datei>.cfsbackup
```

4. Restore ausschließlich in eine separate, leere Recovery-Datenbank testen.
5. Anwendung gegen die Recovery-Datenbank validieren.
6. Danach:

```bash
npm run recovery:doctor
```

Der Doctor soll mit einer frischen `reports/database-recovery-evidence.json` grün werden. Die Evidence wird nicht committed.

Das Standard-Restore-Werkzeug nutzt absichtlich kein `--clean` und verweigert die aktuell konfigurierte Primärdatenbank als Ziel.

## Gate H – Application Rollback / Recovery (Pass 19)

Datenbank-Recovery und Application-Rollback bleiben strikt getrennte Verfahren.
Ein Code-Rollback darf **niemals** automatisch einen Datenbank-Restore auslösen.

Vor dem öffentlichen Go-Live:

1. Einen bekannten guten Git-Commit / Deploy eindeutig dokumentieren.
2. Vor jedem Production-Deploy einen Release-State-Snapshot erzeugen:

```bash
npm run release:snapshot
```

3. Einen Recovery-Drill auf einer geeigneten Staging-/Recovery-Umgebung oder – wenn bewusst freigegeben – über den manuellen GitHub-Workflow **Production Application Recovery** durchführen.
4. Der Workflow verlangt die Bestätigungsphrase `RECOVER_PRODUCTION`, committed Lockfiles, `npm ci`, den vollständigen Release-Preflight und einen expliziten Ziel-Commit.
5. Für den Fallback per Git-Commit wird der Render Deploy Hook mit `ref=<commit>` verwendet. Ein normaler Datenbank-Restore ist dabei ausgeschlossen.
6. Nach dem Recovery müssen sowohl der Production-Canary als auch der vollständige DNS/TLS/Edge-Check grün sein.
7. Erst danach darf `reports/application-recovery-evidence.json` entstehen.
8. Abschließend:

```bash
npm run apprecovery:doctor
```

Der Doctor soll mit einer frischen Recovery-Evidence, vorhandenen Lockfiles und echter Production-Konfiguration grün werden.

Für einen akuten Render-Vorfall ist der bevorzugte schnellste Weg weiterhin Render **Rollback to a previous deploy**, sofern der betreffende Build noch in der Render-Retention verfügbar ist. Der spezifische Commit-Redeploy im Repository ist der kontrollierte Fallback und benötigt anschließend dieselben Canary-/Edge-Gates.

## Gate I – Incident Response / Write-Freeze (Pass 20)

Vor dem öffentlichen Go-Live den Incident-Pfad einmal in einer sicheren Umgebung durchspielen:

1. Admin-Step-up entsperren.
2. Incident-Modus auf `degraded` setzen und öffentliche Meldung prüfen.
3. Modus auf `maintenance` setzen: Website/Support/Admin müssen erreichbar bleiben, Creator-/Account-/Review-Schreibwege müssen mit HTTP 503 + `Retry-After` pausieren.
4. Modus auf `security_lockdown` setzen. Optional den expliziten Widerruf aller anderen Login-Sitzungen testen.
5. Prüfen, dass der Admin-Zugang erhalten bleibt und die Änderung im Admin-Audit erscheint.
6. Zurück auf `normal` stellen und Kern-Schreibwege erneut prüfen.
7. Keine internen Ursachen, Secrets oder personenbezogenen Details in die öffentliche Incident-Meldung schreiben.

Automatischer Strukturcheck:

```bash
npm run incident20:check
```

Der Drill ersetzt weder DNS/TLS-Gates noch Recovery-/Rollback-Drills.
