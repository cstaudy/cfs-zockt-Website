# Post-Deploy UI Acceptance v21

Dieses Gate prüft nach einem GitHub/Render-Deploy, ob wirklich der konsolidierte Website-Stand ausgeliefert wird.

## Lokal vor dem Push

```bash
npm run postdeploy21:ui:local
```

Dabei wird ausschließlich der lokale Projektstand geprüft.

## Nach dem Render-Deploy

```bash
npm run postdeploy21:ui
```

Standardziel:

```text
https://cfs-zockt.de
```

Alternatives Ziel:

```bash
node tools/postdeploy-ui-acceptance-v21.mjs https://example.invalid
```

## Was geprüft wird

- öffentliche Kernseiten erreichbar
- `cfs-shell-v3.js` aktiv
- Shell lädt `cfs-ui-v18.css`
- Shell lädt `cfs-ui-v18.js`
- keine alten Split-Runtime-Dateien v5-v17 mehr in der Shell
- v18-Bundle enthält Landing-, Creator-Suite-, Plans-, Support- und Security-Layer
- globales v3 Theme erreichbar
- im Live-Modus zusätzlich `/api/health`
- im Live-Modus zusätzlich `/api/public/status`

## Bedeutung

Ein PASS bestätigt nur, dass der erwartete öffentliche Deploy-Stand ausgeliefert wird und die öffentlichen Health-Endpunkte online melden.

Es ersetzt nicht:
- Browser-/Layout-Abnahme
- Passkey-/Windows-Hardware-Test
- Mail-Drill
- Stripe-Live-Test
- R62-R67 Production-Drills
