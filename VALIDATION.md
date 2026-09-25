# Validation

Geprüft auf der hochgeladenen Projektversion mit eingespieltem UI-v3-Patch.

## Erfolgreich

- `node --check public/assets/js/cfs-shell-v3.js` → PASS
- `npm run website21:check`
  - Website Acceptance 21.3.14 → 34/34 PASS
  - Accessibility / Responsive 21.3.12 → 22/22 PASS
  - Visual Polish 21.3.13 → 19/19 PASS
- `npm run passkey:check` → 75/75 PASS
- `npm run security:check` → PASS
- `npm run seo:check` → PASS
- `npm run funnel:check` → PASS

## Nicht als Patch-Regression gewertet

In der hochgeladenen Ausgangsversion sind einzelne ältere Checks bereits unabhängig von diesem UI-Patch nicht grün bzw. referenzieren fehlende Testdateien. Diese wurden nicht als Erfolg ausgegeben und nicht durch UI-v3 "weggetestet".

Der Patch verändert keine Backend-Dateien und keine Runtime-/Overlay-Seiten.
