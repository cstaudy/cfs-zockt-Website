# Übergabe – v22 Release Candidate Seal

## Status
Kein neuer Website-UI-Layer.

v22 friert den konsolidierten Stand als lokalen Release Candidate ein.

## Neue Repo-Dateien
- `tools/release-candidate-v22.mjs`
- `RELEASE_CANDIDATE_V22.md`
- `RELEASE-MANIFEST-v22.json`

## Geändert
- `package.json`

## Befehl
`npm run release22:verify`

Erwartetes Ende:
`RC22_READY`

## Danach
Der nächste echte Schritt bleibt:
GitHub-Push → Render Deploy → `npm run postdeploy21:ui` → reale Desktop/Mobile-Abnahme → R62.

## Wichtig
Kein Remote-Push und kein Live-Deploy wurden simuliert.
