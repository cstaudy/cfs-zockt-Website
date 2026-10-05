# cfs-zockt v196 + CFS AI

Bereinigter aktiver Website-Main.

## Aktueller Stand
- Website: v196
- Backend: 3.20.39
- Database schema: 79
- Launcher: 0.47.30
- CFS AI Website Integration: v196
- Lokaler AI-Service: separat als `CFS_AI_LOCAL_SERVICE_v20`

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
