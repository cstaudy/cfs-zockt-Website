# CFS Update 3.20.43 einbauen

Nur neue/geänderte Dateien, keine vollständige Website. Kumulativ für die hier bereitgestellten Stände 3.20.39 bis 3.20.42; bisherige Maker- und Guide-Updates sind enthalten. Details: files/UPDATE-3.20.43.md.

1. ZIP separat entpacken. Ziel ist dein bestehender Website-Ordner mit server.js und package.json.
2. Aus dem entpackten Update-Ordner prüfen:

   `node install-update.cjs --check "/pfad/zur/website"`

3. Vor dem Einbau Website-Prozess stoppen und Datenbank sichern.
4. Anwenden:

   `node install-update.cjs --apply "/pfad/zur/website"`

5. Im Website-Ordner `npm run check:cut-workflow` ausführen. Mit installiertem FFmpeg und FFprobe zusätzlich `npm run check:cut-real`.
6. Website mit deiner bisherigen Methode starten.
7. Für die neuen Launcher-Funktionen auf Windows den Launcher aus den aktualisierten Quellen über den vorhandenen Build-Prozess neu bauen (BUILD-LAUNCHER-WINDOWS.cmd), installieren und verbinden. Das ZIP liefert Launcher 0.47.31 als Quellcode, keine fertige EXE.
8. Im Cut Studio einen kurzen echten Clip vom Import bis zur exportierten Datei prüfen. Danach Abbruch und erneuten Export prüfen.

Der Installer kontrolliert Prüfsummen und erkennt eigene Änderungen. Bei einem Konflikt bricht er vor dem Schreiben ab: Änderungen dieser Dateien manuell zusammenführen. Ersetzte Dateien werden unter update-backups/ gesichert; das ersetzt kein Datenbank-Backup. Unveränderte Dateien und .env bleiben bestehen. Wiederholtes Anwenden ist möglich.

Website-Version 3.20.43, Launcher-Version 0.47.31, Schema 80. Beim Upgrade vom ursprünglichen Schema 79 ergänzt der vorhandene Server-Bootstrap die Maker-Tabelle. Keine neuen Laufzeit-Abhängigkeiten.

Die lokale Vorschau lädt kein Video hoch. Im Launcher muss dieselbe Datei separat zugeordnet werden. Vorschau zeigt das Quellvideo; Effekte und Zusatzton werden beim Export gerendert.

Linux-FFmpeg- und Workflow-Tests bestanden. Windows-/Browser-/Backend-Gesamttest steht aus. Nichts wurde auf deinen produktiven Server übertragen.
