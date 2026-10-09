# Render-R12: Startfix und Grenzen

Render: `MODULE_NOT_FOUND ./lib/shop-downloads-v32054` beim Start in `server.js`.
Das Modul fehlt selbst in der kompakten Website-3.20.71 und in R11.

## Geaenderte Dateien gegenueber R11

- `lib/shop-downloads-v32054.js` – sicherer Legacy-Download-Adapter.
- `tools/render-startup-preflight.cjs` – erkennt fehlende lokale CommonJS-Module vor dem Deploy.
- `tools/render-startup-repair-test.cjs` – simulierte Downloadpruefungen.

## GitHub statt nur lokaler Installation

Render cloned `https://github.com/cstaudy/cfs-zockt-Website` Branch `main`.
Ohne Commit + Push der neuen Moduldatei bleibt der Fehler bestehen.

## Wartung

Render Build Command:

```bash
npm ci --omit=dev --ignore-scripts --no-audit --no-fund && node tools/render-startup-preflight.cjs
```

Der letzte Teil blockiert einen Build mit fehlenden lokalen Servermodulen.
Eine erfolgreiche Build-Vorpruefung ersetzt keine Live-Abnahme mit Datenbank und Credentials.

## Shop

Die historischen `shop-downloads-v32054`-ZIP-Dateien und die
`public/assets/data/shop-download-catalog-v32054.json` fehlen.
Deshalb antwortet der alte Katalog mit `products: []` und die alte
Downloadroute mit 404. Es werden keine Lizenzen oder Zahlungen fingiert.
Die moderne Shop-/Designlogik wird nicht angetastet.

BETA weiterhin HOLD.
