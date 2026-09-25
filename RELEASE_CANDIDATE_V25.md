# cfs_zockt – Release Candidate v25

v25 ersetzt den alten v22 Release-Candidate-Seal für den aktuellen Designstand.

Basis:

```text
v24 Creator OS Redesign
```

Logo, Wortmarke und Schrift bleiben unverändert. Der Seal prüft zusätzlich, dass das Redesign direkt in den bestehenden konsolidierten Runtime-Dateien steckt und **kein weiterer v24 Runtime-Layer** angelegt wurde.

## Ausführen

```bash
npm run release25:verify
```

Ein sauberer lokaler Stand endet mit:

```text
RC25_READY
```

## Geprüft werden unter anderem

- v24 Creator-OS-Klasse in der globalen Shell
- v24 Designblöcke in `cfs-theme-v3.css` und `cfs-ui-v18.css`
- keine zusätzliche `cfs-v24.css/js` Runtime
- dunkle Creator-OS-Basis
- neue Sidebar-Sprache
- Public Editorial Hero
- Dashboard-Arbeitsfläche
- Creator-Suite-, Plans- und Support-Matrix
- Security-Center
- Mobile App Toolbar
- Website Acceptance
- Accessibility / Responsive
- Visual Polish
- Website Security
- MFA / Passkey Security
- lokales Post-Deploy-Gate
- GitHub / Deployment Readiness
- Pre-Deploy Doctor

## Grenzen

`RC25_READY` ist ein **lokaler Release-Seal**.

Nicht enthalten:

- echter GitHub-Push
- Render-Deploy
- reale Browser-/Geräteabnahme
- echter Passkey-/Windows-Hardwaretest
- Abschluss von R62-R67

Nach dem echten Deploy:

```bash
npm run postdeploy21:ui
```

Danach reale Desktop-/Mobile-Abnahme.
