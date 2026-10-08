# Übergabe 3.20.66

## Ziel
Creator Shop strukturieren: feinere Produktkategorien, aussagekräftigere Karten und eine Detailansicht je Originaldesignwelt.

## Status
**CODE READY**, gezielte Unit-/Integrationsprüfungen PASS; echte Browser-, OBS- und Provider-Live-Abnahme **OFFEN / HOLD**.

## Umsetzung
- 31 Designwelten, jeweils 16 Farben, aus dem vorhandenen Original-ZIP unverändert beibehalten.
- Sieben neue Produktkategorien einschließlich eigenständiger ZIP-Pakete.
- Produktkarten mit Kategorien, Originalvorschau, Tags, Umfang, Download, Maker und Detailseite.
- Produktdetail pro Designwelt (Farbe und Kategorie per URL/Dropdown) mit tatsächlichen PNG-Bildern.
- Bekannte fehlende Szene-Abhängigkeiten in den ZIP-Ausgaben ergänzt.
- Bekannte Originaldesign-Bilder dürfen serverseitig in Maker-Bundles gespeichert werden, ohne private Asset-Quoten zu umgehen.

## Tests
- `npm run check:v32066`
- `node --check server.js`
- Geprüfte ZIP-Pakete der sieben Produktgruppen, jeweils mit Szenenressourcen.

## Offene Prüfungen
- Browser-Abnahme Shop/Detailseite auf Mobilgerät
- Aufnahme in OBS mit echter HTML-Szenen-Vorschau und Animation
- Twitch/TikTok/YouTube Live-Acceptance
- Checkout/Entitlements unverändert, weiterhin kein Live-Commerce
