# Übergabe – v18 Final UI Regression & Consolidation

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält die Website-Arbeit v3 bis v18.

## Wichtigste Änderung in v18
Die bisherigen UI-Layer v5 bis v17 wurden in zwei deterministische Runtime-Bundles zusammengeführt:

- `public/assets/css/cfs-ui-v18.css`
- `public/assets/js/cfs-ui-v18.js`

`cfs-shell-v3.js` lädt damit nicht mehr 13 separate CSS- und 13 separate JS-Dateien nach.

## Warum konsolidiert?
Vor v18 wurden v5-v17 nacheinander als einzelne Runtime-Dateien geladen.
Das funktionierte, führte aber zu:
- vielen zusätzlichen Requests,
- schwerer nachvollziehbarer Ladereihenfolge,
- höherem Risiko für Timing-Konflikte zwischen UI-Layern.

v18 behält die bestehende Reihenfolge exakt bei, führt sie aber in einem CSS- und einem JS-Bundle aus.

## Weiter separat
Diese Dateien bleiben bewusst separat:
- `public/assets/css/cfs-theme-v3.css` – globales Grunddesign
- `public/assets/css/cfs-onboarding-v4.css` – nur Login/Verify/Dashboard
- `public/assets/js/cfs-onboarding-v4.js` – nur Login/Verify/Dashboard
- `public/assets/js/cfs-shell-v3.js` – globaler Einstiegspunkt / Branding / Sidebar / Bundle-Loader

## Aus dem aktuellen Arbeitsstand entfernt
Die einzelnen Runtime-Dateien v5-v17 wurden aus dem Arbeitsstand entfernt, weil sie nicht mehr benötigt werden.
Ihre Logik steckt vollständig im v18-Bundle.

## Zusätzliche Regression-Audits
v18 prüft zusätzlich:
- keine verbliebenen Referenzen auf die ausgemusterten v5-v17 Runtime-Dateien,
- keine doppelten HTML-IDs,
- keine fehlenden direkten `/assets/...`-Referenzen in HTML,
- JS-Syntax des konsolidierten Bundles,
- bestehende Website-/Security-/Account-Testreihen.

## Kein Live-Nachweis
v18 ist ein lokaler Konsolidierungs- und Regression-Schritt.
Es ist kein Render-, Browser-, Mail-, Stripe-, Passkey-Hardware- oder Produktionsdrill.

## Production-Readiness
R59-R61 Evidence vorhanden.
R62 weiterhin nur teilweise manuell durchgeführt.
R63-R66 offen.
R67 danach.

## Nächster Schritt
Nach v18 sollte kein neuer großer UI-Layer mehr ergänzt werden.

Empfohlen:
1. finales GitHub-Paket erstellen,
2. GitHub einspielen,
3. Render deployen,
4. reale Website auf Desktop + Mobile prüfen,
5. danach R62 fortsetzen.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`

## Regression-Fixes in v18
Die vollständige Regression hat zwei bestehende Erwartungslücken sichtbar gemacht und sie wurden im aktuellen Stand korrigiert:

- `public/pages/account.html`: kompakter `management-hub` wieder ergänzt, damit Account / Einstellungen / Setup / Integrationen auch im Account dieselbe Verwaltungsstruktur behalten.
- `public/pages/settings.html`: `DATENSCHUTZ-TOOLS` wieder explizit benannt, damit der vorhandene Privacy-Self-Service klar auffindbar bleibt.

Das sind UI-/Informationsarchitektur-Korrekturen; keine Backend- oder Sicherheitslogik wurde verändert.
