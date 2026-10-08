# CFS Zockt Update 3.20.66 · Creator Shop Produktkategorien

**Basis 3.20.65 → Ziel 3.20.66**, ohne Datenbankmigration, Checkout- oder Launcher-Änderung.

## Neu

- Sieben echte Produkt-Unterkategorien für jede der 31 Originaldesignwelten: Komplettsets, Start-/Pause-Screens, Gameplay & Kamera, Alerts & Hinweise, Panels & Branding, Goals/Ticker/Status, Hochformat & Mobile.
- Shop-Produktkarten mit Originaldesign-Vorschaubild, Stilrichtung, Produktkategorie, Farbvariante, originalgetreuem PNG-/Szenen-Dateiumfang, Maker- und ZIP-Aktionen und direktem Produktdetail-Link.
- Individuelle Produktdetailansicht pro Designwelt über `/pages/original-design.html?design=<id>` mit Galerie originaler PNG-Dateien, Farb- und Produktgruppenauswahl, Download und Maker-Link.
- Neues API-Endpoint zur Ausgabe von Original-PNG-Assets (nur auf im ZIP existierende, validierte PNG-Namen).
- Neue API-Route für Kategorie-ZIPs. Die vorherige Vollpaket-URL funktioniert weiterhin.
- Original-Szenen-ZIPs beinhalten jetzt die gemeinsamen Laufzeitdateien `Kern/engine.js`, `Kern/engine.css`, die zur Designwelt gehörende Bilddatei in `Hintergruende/` sowie `Kern/Bilddaten/`.
- Gespeicherte Stream-Maker-Bundles akzeptieren jetzt **nur bekannte** Originaldesign-Vorschau-URLs, ohne dafür private Nutzerbilder freizugeben.

## Technischer Nachweis

`npm run check:v32066` verifiziert die Original-Kataloge, alle sieben Kategorien, die ZIP-Pfade, mehrere echte Archiv-Downloads und die bisherige 3.20.64-Basisdesign-Funktion.

## Hinweise

- Kategorie-Pakete nutzen die im Originalarchiv vorhandenen Dateien; es gibt keine semantische Nachbearbeitung der Originaldesigns.
- Originalszene-HTML erfordert bei lokaler Nutzung die relativen Ressourcenpfade, die in den neuen Paketen vorhanden sind.
- Kategorisierung ist eine zusätzliche Sicht auf vorhandene Assets; sie erzeugt keine neuen Live-Providerdaten.
- Browser/Windows/OBS/Live-Provider Acceptance und Checkout bleiben offen / HOLD.
