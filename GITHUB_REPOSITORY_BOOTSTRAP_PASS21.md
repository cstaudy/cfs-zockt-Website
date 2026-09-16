# GitHub Repository Bootstrap – Pass 21

Stand: 16.09.2026

## Aktives Repository

`cstaudy/cfs-zockt-Website`

Remote:

`https://github.com/cstaudy/cfs-zockt-Website.git`

Dieses Dokument ist ab Pass 21 für den aktuellen GitHub-Start maßgeblich. Die älteren `GITHUB_SETUP_V40.md` / `GITHUB_BOOTSTRAP_V41.md` bleiben historische Milestone-Dokumente.

## 1. Erstes Repository-Upload

Den **Inhalt** dieses Gesamtpakets in das leere Repository übernehmen. Nicht das ZIP selbst committen.

Vor dem ersten Push lokal:

```bash
npm run github21:check
git init -b main
git remote add origin https://github.com/cstaudy/cfs-zockt-Website.git
git add .
git status --short
git commit -m "Initial cfs_zockt Creator Suite release candidate"
git push -u origin main
```

Der Readiness-Check prüft u. a. `.gitignore`, Repository-Slug, GitHub-Metadaten, Actions-Runtime, große Dateien und verbotene Release-Artefakte.

## 2. Was nicht ins Repository gehört

- `.env` / lokale Secrets
- `node_modules`
- ZIP-/EXE-/MSI-/DMG-/APPX-Artefakte
- private Schlüssel / Zertifikate
- echte DB-Backups (`*.cfsbackup`)
- lokale Recovery-Evidence
- lokale Logs / Runtime-Daten / Creator-Uploads

Die `.gitignore` deckt diese Klassen ab.

## 3. Nach dem ersten Push

GitHub → **Actions**:

1. `Creator Suite Quality Gate`
2. `Generate Dependency Lockfiles`
3. Lockfile-Artifact herunterladen und `package-lock.json` + `launcher/package-lock.json` committen
4. danach Quality Gate erneut ausführen
5. `Creator Suite Configuration Doctor` erst nach Einrichtung der GitHub Environments ausführen

## 4. GitHub Environments

### `production`

Secret:

- `RENDER_DEPLOY_HOOK_URL`

Variable:

- `CFS_PRODUCTION_URL=https://cfs-zockt.de`

### `windows-release`

Secrets erst setzen, wenn Code Signing tatsächlich eingerichtet ist:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

## 5. Repository-Einstellungen

Unter Settings → Rules → Rulesets für `main` empfohlen:

- Force Push blockieren
- Branch-Löschung blockieren
- Status Checks verlangen
- `Repository Quality`
- `Launcher Release Gate`

Solange allein direkt am Repository gearbeitet wird, ist ein verpflichtender Pull Request optional. Vor Team-/Produktionsbetrieb sollte er aktiviert werden.

## 6. Security-Einstellungen

Unter Settings → Code security and analysis prüfen/aktivieren, soweit im Account verfügbar:

- Dependabot Alerts
- Dependabot Security Updates
- Secret Scanning
- Push Protection
- Private Vulnerability Reporting / Security Advisories

Die Repository-Datei `.github/SECURITY.md` weist ausdrücklich auf private Meldungen hin.

## 7. Production

Ein Push auf `main` deployt Production nicht automatisch. Production bleibt manuell gated.

Vor Go-Live müssen weiterhin mindestens grün sein:

- beide Lockfiles committed und `npm ci` erfolgreich
- DNS/TLS/Edge-Gate für `cfs-zockt.de`
- Database-Recovery-Drill
- Application-Recovery-Drill
- Incident-Response-Drill
