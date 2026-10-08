# CFS Zockt · Update 3.20.67

## Shop-Erlebnis
- Neuer Entdecken-Bereich mit echten ausgewählten Designwelten aus dem 31er-Katalog.
- Besseres Download-Center: Design, Farbe und eine der sieben Produktgruppen wählen; vor dem ZIP-Download werden Inhalte und Originalvorschau angezeigt.
- Interaktive, ausdrücklich simulierte OBS-Szene auf der Originaldesign-Detailseite: echter Kamerarahmen und echte Follower-Alert-Grafik lassen sich ein-/ausblenden.
- Mobile/responsive Shop-Gestaltung und ressourcenschonendes Lazy Loading der Vorschauen.

## CFS AI im Shop
- Designberater zeigt katalogbasierte Vorschläge, selbst wenn der AI-Dienst offline oder deaktiviert ist.
- Für Root/Admin zusätzlich optionaler Aufruf des **vorhandenen, geschützten** CFS-AI-Status- und Chat-Gateways. Kein zweiter ungeschützter API-Endpunkt.
- Ein AI-Ergebnis kann ausschließlich IDs der 31 realen Designwelten empfehlen; es kann keine Entitlements oder Downloads verändern.
- Kein automatisches Speichern, Veröffentlichen, Checkout oder Einspielen von Events.

## Nicht verändert
- Originaldesign-ZIP und die 496 Farbvarianten.
- Datenbankschema, Launcher und bestehende AI-Admin-Endpunkte.
- Provider-Live-Status, vorhandene Bundles und Commerce-Schutz.

## Teststatus
- `npm run check:v32067`
- `node --check server.js`
- Manuelle Browser-, OBS-, Mobilgeräte- und echte AI-Modell-Abnahme weiterhin offen.
