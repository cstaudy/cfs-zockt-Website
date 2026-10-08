# CFS Zockt · Update 3.20.64

## 06 · Download-Designs

**Basis:** 3.20.63. **Ziel:** 3.20.64. **CODE READY, Browser-/Render-/Windows-/OBS-Live-Abnahme HOLD.**

### Umsetzung
- Im Creator Shop erscheint eine eigene Download-Sektion für **8 integrierte Basisdesigns** (Aurora, Circuit, Essential, Arcade, Orbit, Studio, Ember und Midnight). Zu jeder Auswahl gibt es 16 bestehende Akzentfarben.
- Der vorhandene Canvas-Renderer erzeugt lokal 7 PNG-Elemente (camera, lower, social, starting, brb, ending, about) pro ZIP. Es sind **statische Grafiken**, keine Live-Daten oder Audio-Signale.
- Jedes ZIP enthält `stream-maker.json` mit bewusst engem Versions-/Formatvertrag, `manifest.json`, `README.txt` und `png/*.png`. Das ZIP wird lokal im Browser erstellt; kein Drittanbieter, kein Upload und keine neue Datenbanktabelle nötig.
- Der Stream Maker kann die Datei `stream-maker.json` als **neues lokales Design** importieren; Dateigröße <= 256 KiB, nur das unterstützte Format. Fremde Bildreferenzen und zusätzliche Paketinhalte werden nicht importiert. Vorhandene Änderungen werden vor dem Ersetzen bestätigt.
- Deep-Link vom Shop in den Stream Maker mit gewähltem Design und Akzentfarbe.
- Wenn der ältere Original-Designkatalog fehlt, werden acht integrierte Starter angezeigt. Fehlende Originalressourcen werden ausdrücklich benannt.
- CRC32/ZIP-Dateinamen/Größenbegrenzungen für die browserseitige ZIP-Erzeugung geprüft.

### Bekannte Grenzen / Freigabe
- Im gelieferten Archiv fehlen `design-pack-catalog-v211.json`, die ursprünglichen 31 Designwelten und ihre Bildressourcen. Diese werden **nicht** als vorhanden behauptet. Die acht neuen Pakete sind vorhandene **integrierte Renderer-Stile**, keine Rekonstruktion fremder Originalgrafiken.
- PNGs sind statisch. Für Goals, Followerzahlen, Chat usw. das Widget Studio benutzen; für Audio das Tonstudio.
- Shop benötigt weiterhin Creator-Suite-Zugang. ZIP-Browserfunktion muss auf Zielbrowsern, mobilen Geräten und Render live geprüft werden; keine realen Windows-/OBS-Evidenzen.
- Andere bekannte Holds der Vorgängerversion (Provider, Live, Launcher, Windows, 60-Minuten-Soak, historischer Testbestand) bleiben bestehen.
- Keine Änderung an Schema 80, Launcher 0.47.31, Providerlogik, Kaufberechtigungen oder Checkout (bleibt deaktiviert).

### Tests
- `node tools/design-downloads-v32064-test.mjs .` — **27/27 PASS** (8×16 Kombinationen, Importvalidierung, ZIP-CRC/Integrität, PNG, UI-Contracts, Version).
- `npm run check:v32064` — **PASS** einschließlich v32063 / v32062 / v32061 / v32060 und weiterer vorhandener fokussierter Regressionstests.
- Ein ZIP mit synthetischem PNG wurde von `unzip` erfolgreich geprüft. Der endgültige Render der sieben Motive benötigt Zielbrowser-Canvas und ist dort noch offen.

### Installation
Das Delta **ausschließlich** auf einer unveränderten Version 3.20.63 verwenden:
```
node install-update.cjs --check <PFAD_ZUM_PROJEKT>
node install-update.cjs --apply <PFAD_ZUM_PROJEKT>
cd <PFAD_ZUM_PROJEKT>
npm run check:v32064
```
Vor Dateiersatz wird der Sollzustand per SHA-256 geprüft und bei Abweichungen ohne Änderungen abgebrochen. Alte Dateien werden in `.cfs-backups/3.20.64` gesichert. Der Installer kann wiederholt ausgeführt werden. Für vollständige Neuinstallation das Gesamtarchiv nutzen.
