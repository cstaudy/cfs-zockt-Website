# cfs_zockt – Release Candidate v22

v22 friert den aktuellen Website-Stand als Release Candidate ein.

## Was geprüft wird

- konsolidierte Runtime-Dateien vorhanden
- alte Split-Runtime v5-v17 nicht mehr vorhanden
- globaler Shell-Loader zeigt auf v18 Bundle
- offensichtliche Secret-Literale fehlen
- lokales Post-Deploy-Gate
- Website Acceptance
- Accessibility / Responsive
- Visual Polish
- Website Security
- MFA Security
- Passkey Security
- GitHub Readiness
- Deployment Readiness
- Pre-Deploy Doctor

## Ausführen

```bash
npm run release22:verify
```

Ein erfolgreicher Lauf endet mit:

```text
RC22_READY
```

## Bedeutung

`RC22_READY` heißt: der lokale Repository-Stand ist als Release Candidate konsistent.

Es bedeutet ausdrücklich nicht:
- bereits zu GitHub gepusht
- bereits auf Render deployed
- reale Browser-Abnahme bestanden
- R62 abgeschlossen

## Nach dem Push/Deploy

```bash
npm run postdeploy21:ui
```

Danach Desktop/Mobile real prüfen und erst anschließend R62 weiterführen.
