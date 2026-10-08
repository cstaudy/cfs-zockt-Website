# Einbau CFS Zockt 3.20.61

**Voraussetzung:** exakt Version 3.20.60. Bei eigener Entwicklung an geänderten Dateien nicht blind überschreiben.

1. Delta-ZIP entpacken.
2. `node install-update.cjs --check /pfad/zum/cfs-zockt-Website`
3. Bei `CONFLICT` manuell zusammenführen und vorerst nicht `--apply` ausführen.
4. `node install-update.cjs --apply /pfad/zum/cfs-zockt-Website`
5. `npm run check:v32061`
6. Render/Browser/Windows-/OBS-Acceptance nach `UPDATE-3.20.61.md` ausführen.

Installer prüft vor Schreibzugriff Quell-/Ziel-SHA256 und alle Dateien auf Konflikte, erstellt Backups unter `.cfs-backups/3.20.61/` und überspringt bereits installierte Dateien. Kein Datenbank-/Launcher-Build.

**Nicht vergessen:** Der bereitgestellte Quellstand enthält keinen Designpaket-Katalog (`public/assets/data/design-pack-catalog-v211.json`). Echte Shop/Paketvorlagen benötigen die originale Quelldatei. Ein fokussierter Code-Test ist keine Live-Freigabe.
