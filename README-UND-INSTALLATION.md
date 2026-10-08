# CFS Zockt – Gesamt-Updatepaket 3.20.69 (kompakte Ausgabe)

**Ein Download für die neuesten kumulativen Code-Updates, aber zwei getrennte Installationen.**

## Inhalt

- `01-Website/CFS-Zockt-Website-Code-v3.20.68.zip` – vollständiger **Website-Code** mit allen Erweiterungen aus den bisherigen Website-Updates 3.20.60–3.20.68: Shop mit 31 Designwelten und Kategorien, Stream Maker, Audio/Cut Studio, Shop-Berater, KI-Design-Katalog, Launcher-Quellcode. **Die große Originaldesign-Mediendatei fehlt bewusst in dieser kompakten Ausgabe.**
- `02-CFS-AI/CFS-AI-Design-Factory-Update-v3.20.69.zip` – separates, SHA-256-geschütztes Delta für eine **bereits installierte lokale CFS AI v20**. Keine vollständige KI-Grundinstallation.
- `VOLLPROJEKT_ERSTELLEN.py` – baut aus Code-ZIP plus deinem Originaldesign-ZIP einen **kompletten lokalen Website-Quellprojektordner** auf, ohne bestehende Ordner zu überschreiben.
- `PRUEFEN-WINDOWS.ps1`, `RELEASE-MANIFEST.json` – Dateiprüfung mit SHA-256.

**Warum kompakt?** Das vollständige Website-Archiv mitsamt dem 344-MB-Originaldesignpaket war in dieser Sitzung nicht zuverlässig als Download bereitstellbar. Es fehlt nur **diese eine Originaldesign-Archivdatei**; kein neues Website-Code-Update wurde ausgelassen. Das separate Originaldesignpaket muss vorliegen.

## Installation auf Windows

1. Dieses Gesamtpaket in einen lokalen Ordner entpacken. Optional `PRUEFEN-WINDOWS.ps1` in PowerShell ausführen.
2. Dein Originaldesign-ZIP bereitlegen. Der erwartete Name lautet `Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip`. Der Helfer prüft die SHA-256 gegen die zuvor hochgeladene Datei.
3. Website-Quellordner **neu in Staging** erstellen:

   ```powershell
   py -3 VOLLPROJEKT_ERSTELLEN.py --design-archiv "C:\Pfad\zum\Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip" --ziel "C:\CFS-Zockt-Staging"
   ```

   Ergebnis: `C:\CFS-Zockt-Staging\cfs-zockt-Website-main\`. Bereits vorhandene Zielordner werden **nicht** überschrieben.
4. Website in Staging prüfen: `npm run check:v32068` im Projektordner. Deployment zur Live-Website erfolgt **nur** über deinen eigenen, bereits konfigurierten Hosting-/Git-Prozess. Vorhandene `.env`-Konfigurationen, Datenbank und User-Uploads nicht überschreiben.
5. **CFS AI separat installieren:** lokalen CFS-AI-v20-Dienst + Bridge stoppen und vollständiges Backup anlegen. Das ZIP aus `02-CFS-AI/` separat entpacken und dann im Ordner `cfs-ai-design-factory-update-3.20.69`:

   ```powershell
   py -3 install_update.py --check "C:\Pfad\zu\CFS_AI_LOCAL_SERVICE_v20"
   py -3 install_update.py --apply "C:\Pfad\zu\CFS_AI_LOCAL_SERVICE_v20"
   ```

   **Nur anwenden, wenn `--check` erfolgreich ist.** Der Installer prüft Hashwerte und schützt deine Änderungen.
6. CFS AI neu starten. Auf dem lokalen PC die Design Factory unter `http://127.0.0.1:8000/design-factory` öffnen. Autostart/Hintergrund-Erstellung **bewusst aktivieren**. Ollama muss laufen.

## Sicherheitsgrenzen und Status

- **Noch nicht** online in dein Website-Admin-Control-Center integriert: Die neue Factory-Oberfläche ist lokal.
- Nach manueller Freigabe stellt die AI nur **ein Export-ZIP** bereit, kein automatisches Veröffentlichungsrecht.
- Website 3.20.68 hat einen eigenen optionalen älteren Design-Worker. **Nicht beide Worker gleichzeitig starten.**
- 31 Originaldesignwelten bleiben unverändert.
- Die reale Installation auf deinem Rechner sowie Windows-, Browser-, OBS-, Bridge- und Modell-Live-Abnahme stehen weiterhin aus (**HOLD**).

## Prüfergebnisse

- `npm run check:v32068`: erfolgreich in der originalen Website-Arbeitskopie.
- `python3 -m unittest discover -s tests -p test_design_factory_v32069.py`: 11/11 bestanden in einer isolierten CFS-AI-Testkopie mit Modell-Mock.
- CFS-AI-Installer: separate Installationsprüfung erforderlich, wenn die lokale Basis von den Uploads abweicht.
