# Übergabe – v21 Post-Deploy Live UI Acceptance

## Status
Kein neuer Website-UI-Layer.

v21 ergänzt ein eigenes Post-Deploy-Gate, das nach GitHub/Render prüft, ob der konsolidierte v18-Stand tatsächlich ausgeliefert wird.

## Neue Repo-Dateien
- `tools/postdeploy-ui-acceptance-v21.mjs`
- `POSTDEPLOY_UI_ACCEPTANCE_V21.md`

## Geändert
- `package.json`

## Neue Befehle
- `npm run postdeploy21:ui:local`
- `npm run postdeploy21:ui`

## Aktuelle Einschränkung
Der Live-Lauf wurde in dieser Sitzung nicht als PASS markiert.
Ein direkter Netzwerkzugriff auf `cfs-zockt.de` war aus der verfügbaren Laufzeit nicht zuverlässig möglich.

Der lokale Modus wurde ausgeführt und validiert.

## Nächster echter Schritt
1. finalen GitHub-Stand pushen
2. Render deployen
3. `npm run postdeploy21:ui`
4. reale Desktop-/Mobile-Abnahme
5. R62 fortsetzen
