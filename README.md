# cfs-zockt v198 Professional UI + CFS AI

Bereinigter aktiver Website-Main.

## Aktueller Stand
- Website: v198
- Backend: 3.20.39
- Database schema: 79
- Launcher: 0.47.30
- CFS AI Website Integration: v196
- CFS Admin Desktop: 1.0.0 (Electron, Windows)
- Unified Brand / UI Layer: v198 Professional
- Lokaler AI-Service: separat als `CFS_AI_LOCAL_SERVICE_v20`


## v198 Professional UI
- einheitliche Typografie ohne gemischte Display-/Impact-Schriften
- transparentes cfs_zockt Wordmark im Header statt quadratischem Logo-Kasten
- bereinigte Abstände, Karten, Buttons, Formulare und responsive Navigation
- ruhige Navy/Blue/Cyan-Palette; Grün/Gelb/Rot nur für echte Statuszustände
- Checkbox-/Form-Overflow auf Login/Registrierung korrigiert
- veraltete interne Routen `privacy.html` / `imprint.html` auf `datenschutz.html` / `impressum.html` korrigiert

## Wichtige Ordner
- `public/` – Website/Creator-Oberfläche
- `lib/` – Backend-Module
- `launcher/` – lokaler Creator-Suite/Launcher-Code
- `tools/` – aktive Prüf-, Release- und Wartungstools
- `ops/` – Recovery-/Incident-Policies
- `.github/` – GitHub Actions, Dependabot, Templates

## Lokal starten
1. `.env.example` als Vorlage für deine lokale `.env` verwenden. Keine echte `.env` committen.
2. `npm ci`
3. `npm start`

## CFS AI
Der lokale AI-Service gehört NICHT in dieses Repository. Er läuft separat auf deinem PC.
Sein `CFS_PROJECT_ROOT` muss auf diesen Website-Ordner zeigen.

Für den Live-Bridge-Betrieb werden serverseitig u. a. benötigt:
- `CFS_AI_ENABLED=true`
- `CFS_AI_TRANSPORT=bridge`
- `CFS_AI_BRIDGE_TOKEN=<secret>`

Keine Tokens oder Secrets committen.

## Aktive Checks
- `npm run check`
- `npm run cfsai:check`
- `npm run security:check`
- `npm run seo:check`
- `npm run lockfiles:check`
- `npm run deployment13:check`
- `npm run v197:check`
- `npm run v198:check`


## CFS Admin Desktop
Die neue Windows-Admin-App liegt unter `admin-desktop/`. Sie verwendet denselben serverseitigen Login wie die Website und enthält keine Produktions-Secrets.

Windows-Build:
1. `BUILD-CFS-ADMIN-WINDOWS.cmd` starten.
2. Der Installer wird unter `admin-desktop/dist/` erzeugt.
3. Die App öffnet `/pages/admin.html` und kann den lokalen CFS-AI-Bridge-Service starten bzw. dessen Status prüfen.
