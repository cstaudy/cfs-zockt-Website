# Einbauhinweise 3.20.65

## Vollpaket
Das Vollpaket kann wie gewohnt über das neue Projektarchiv ersetzt werden.

## Delta-Update
1. Backup des bestehenden Projektordners erstellen.
2. Delta entpacken.
3. Prüfen:
   `node install-update.cjs --check <Projektpfad>`
4. Anwenden:
   `node install-update.cjs --apply <Projektpfad>`

## Nachkontrolle
- `npm install` ist normalerweise nicht nötig, da keine neuen npm-Abhängigkeiten eingeführt wurden.
- Prüfen:
  - `node --check server.js`
  - `node tools/original-design-shop-v32065-test.mjs .`
- Danach im Browser öffnen:
  - `/pages/shop.html`
  - `/pages/stream-maker.html?view=templates`
