# Update 3.20.65

## Ziel
Die vom Nutzer bereitgestellten Original-Streamingdesigns wurden direkt in den Creator Shop integriert und thematisch kategorisiert.

## Enthalten
- 31 Originaldesignwelten mit 496 Farbvarianten als Shop-Katalog
- neue Shop-Sektion mit Stilfiltern, Farbauswahl und Suche
- direkte Aktionen pro Design:
  - ZIP herunterladen
  - im Stream Maker öffnen
- Stream-Maker-Anbindung an die Originaldesign-Kataloge
- sichere Server-Routen für:
  - Katalog
  - Vorschaubilder
  - paketierten ZIP-Download pro Design/Farbe
- Einbindung des gelieferten Original-Design-Archivs ins Projekt

## Wichtige technische Hinweise
- Das Originalarchiv liegt jetzt im Projekt unter:
  `resources/original-designs/Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip`
- Die Shop-Ansicht nutzt dieses Archiv als Quelle für Vorschaubilder und Variant-ZIPs.
- Die bisherigen acht Browser-Basisdesigns bleiben zusätzlich erhalten.

## Tests
Erfolgreich geprüft:
- `node --check server.js`
- `node tools/original-design-shop-v32065-test.mjs .`
- `node tools/design-downloads-v32064-test.mjs .`

## Version
- vorher: 3.20.64
- jetzt: 3.20.65
