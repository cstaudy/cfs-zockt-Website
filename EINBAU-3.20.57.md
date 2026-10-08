# Einbau 3.20.57 · ALL TESTS READY

## Basis
Dieses Delta ist für **3.20.56** vorgesehen.

## Vor dem Einbau
1. Projekt sichern.
2. Keine eigenen Änderungen verwerfen.
3. Installer zuerst mit `--check` ausführen.

## Installation

```bash
node install-update.cjs --check /pfad/zur/cfs-zockt-Website
node install-update.cjs --apply /pfad/zur/cfs-zockt-Website
```

Danach:

```bash
npm install
npm run check:v32057
```

## Beta-Test vorbereiten

```bash
npm run beta:init -- --force
npm run beta:status
npm run beta:preflight
npm run beta:windows-kit
```

Auf dem Windows-Zielsystem zusätzlich:

```bash
npm run beta:preflight:windows
```

Evidence danach unter `evidence/beta-3.20.57/` ablegen:

```bash
npm run beta:evidence
npm run beta:go-no-go
```

## Erwarteter Zustand direkt nach Installation
Ohne echte Realtests:
- Code-Gates: PASS
- Acceptance: **0/56 · HOLD**
- GO/NO-GO: **HOLD**

Das ist korrekt.

## Konfliktschutz
Der Installer darf eine Datei nur ersetzen, wenn sie dem erwarteten 3.20.56-Hash entspricht oder bereits auf 3.20.57 steht. Abweichende eigene Änderungen müssen die Installation vor dem ersten Schreibvorgang stoppen.

## Keine Änderungen an
- Datenbankschema
- Launcher-Version
- Provider-Credentials
- Commerce / Bezahlung
