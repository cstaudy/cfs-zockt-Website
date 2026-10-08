# CFS Zockt · Übergabe 3.20.64

## Basis / Ziel
3.20.63 → 3.20.64 · Arbeitsblock 06: Download-Designs (funktionierender generierter Basiskatalog, lokale Downloadpakete, Wiedereinlesen ins Stream Maker).

## Release-Status
**CODE READY / TARGET ACCEPTANCE HOLD.** 27/27 neue Tests und fokussierte Regression bestanden. Keine Browser-Zielgeräte-/Render-/Windows-/OBS-Freigabe, keine echte 31-Pakete-Abnahme.

## Erreicht
- Acht nachweisbar vorhandene integrierte Stile × 16 Farben; Karte mit Canvas-Vorschau im Shop.
- Auf Knopfdruck erzeugtes ZIP (sieben PNG-Basisbilder, Manifest, README, Maker-JSON), ZIP-Limits, sicherer Pfad, CRC32.
- Wiederverwendbare `stream-maker.json` im Maker nur nach Versions-/Strukturprüfung, keine fremden Bildquellen, mit Nachfrage bei ungespeicherten Änderungen.
- Von Shop aus Design/Farbe in Maker öffnen; Shop und Maker zeigen ausdrücklich an, dass 31 Originaldesigns fehlen.
- Keine DB-/Entitlement-/Checkout-/Launcher-Änderung; Originaldateien und bestehende Bundles bleiben erhalten.

## Noch offen
- Original-Designwelten samt Nachweis der Nutzungsrechte/Bilddateien beschaffen und separat integrieren.
- Reale Bildqualität und PNG-/ZIP-Downloads in unterstützten Browsern und mobilen Layouts prüfen; ZIP aus echtem Browser importieren.
- Bei Live-Widget-Verwendung Provider-/OBS-/Windows-/Soak-Evidenz; funktionsübergreifende Holds bestehen weiter.

## Testbefehle
`node tools/design-downloads-v32064-test.mjs .` und `npm run check:v32064`. Vollständige historische Tests können weiterhin an fehlenden Dateien des Ausgangsarchivs scheitern; die fokussierte Regression ist grün.

## Nächster Arbeitsblock
**07 · CFS AI**: vorhandene Implementierung und Datenschutz-/Fallback-/Render-Verträge prüfen; keine Fake-Live-Inferenz oder produktive Freigabe ohne Nachweis. Optional Checkout **AUS**, es sei denn ausdrücklich freigegeben.
