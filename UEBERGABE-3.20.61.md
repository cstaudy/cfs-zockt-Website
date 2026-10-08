# CFS Zockt · Übergabe 3.20.61

## Basis / Ziel
3.20.60 → 3.20.61 · Arbeitsblock 03: durchgehender einfacher Ablauf Maker → Widget Studio → OBS.

## Ergebnis
**CODE-FOKUSTESTS PASS · BETA-ACCEPTANCE HOLD.** Übernahme eigener und zulässiger lokaler Masterbilder, sichere Ablaufabbrüche, sichtbar geführte OBS-Fertigstellung. Kein Live-Test oder Deployment durchgeführt.

## Nicht verändert
- Schema 80, keine Datenbankmigration; Launcher 0.47.31 unverändert.
- Keine Twitch/TikTok/YouTube-Provider-Logins; keine reale Windows-/OBS-Aktion abgenommen.
- Kein Checkout-/Entitlement-Wechsel, keine neue automatische Bildsegmentierung.

## Tests / Blocker
- `npm run check:v32061` fokussierter Testlauf; neuer Flow-Test 12/12.
- Fehlende alte Testtargets aus den zugelieferten Quellen verhindern die volle historische Regression.
- **Designpaket-Katalog `public/assets/data/design-pack-catalog-v211.json` fehlt** im Ausgangsarchiv. Der neue Startdesign-Fallback bietet keine Ersatz-Paketdaten.
- Browser/OBS/Windows/Provider LIVE 60-Minuten-Soak: **OFFEN / HOLD**.

## Installation
Delta-Archiv (Basis muss exakt 3.20.60 sein): `node install-update.cjs --check <Projektpfad>` gefolgt von `--apply`. SHA-Check aller Dateien und Backup bei Änderungen. Alternativ 3.20.61 Vollarchiv. Bei Konflikten manuell mergen.

## Folgende Arbeiten
1. Katalog-/Bildpaketdateien und alte Regressionstests aus autoritativer Quelle wiederherstellen; gesamtes CI erneut prüfen.
2. Echte Render/Browser-E2E-Annahme Maker/Widget/OBS + Live-Provider-Matrix mit Testaccounts und Windows Evidence durchführen.
3. Arbeitsblock 04 · Tonstudio (Sample-Editor und echte Audiovorschau) implementieren und testen; danach Cut Studio, Download-Designs, CFS AI, optional Checkout und Launcher.

## Kerndateien
- `public/assets/js/creator-handoff-v32061.js`
- `public/assets/js/stream-maker.js`, `public/pages/stream-maker.html`
- `public/assets/js/widget-studio.js`, `public/pages/widget-studio.html`, `public/assets/css/widget-studio.css`
- `tools/maker-widget-obs-flow-v32061-test.mjs`
- `UPDATE-3.20.61.md`
