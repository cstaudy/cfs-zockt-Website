# Einbau CFS Zockt 3.20.64 (ab 3.20.63)

1. Sicherung der bestehenden Installation erstellen und Node.js 22 oder höher verwenden.
2. Delta-ZIP entpacken; im Ordner `cfs-zockt-UPDATE-3.20.64` folgenden Check durchführen:
   `node install-update.cjs --check <PFAD_ZUM_PROJEKT>`
3. Wenn **CHECK OK**: `node install-update.cjs --apply <PFAD_ZUM_PROJEKT>`
4. Danach im Projekt `npm run check:v32064` ausführen und im Browser Shop → Download-Designs / Maker → Basisdesign importieren manuell abnehmen.
5. SHA-Konflikte nicht übergehen; benutzerdefinierte Dateien zuerst manuell mergen. Die Backups liegen unter `.cfs-backups/3.20.64`.

Gesamtarchiv: Kann als neue Installation statt Delta verwendet werden. Kein Migrationsschritt für die Datenbank; Launcher 0.47.31 unverändert.
