# Installation: CFS Zockt 3.20.62

**Nur Delta 3.20.61 → 3.20.62.** Vollständiges ZIP ist alternativ direkt nutzbar.

1. Delta ZIP entpacken.
2. `node install-update.cjs --check /pfad/zum/cfs-zockt-Website-main`
3. Falls `CONFLICT`: nicht anwenden, Änderungen manuell zusammenführen.
4. `node install-update.cjs --apply /pfad/zum/cfs-zockt-Website-main`
5. `npm run check:v32062` ausführen.
6. Auf Windows/Mobilgerät im Audio Studio unter `#alertToneStudio` echte Dateien importieren, vorhören, als WAV exportieren; Details in `UPDATE-3.20.62.md`.

Der Installer prüft SHA256 für Vorher-/Nachher-Stand, erstellt Backup unter `.cfs-backups/3.20.62/` und erkennt wiederholte Installationen. Keine DB-Migration. Unvollständige Legacy-Tests und reale Browser-/OBS-Abnahme weiterhin HOLD.
