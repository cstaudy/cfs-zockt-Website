# CFS AI Design Factory – Integrationsupdate 3.20.69

**Für:** Lokale CFS AI v20 mit Quellcode in `app/`. Dies ist ein kleines **CFS-AI-Zusatzupdate**, kein vollständiger Website-/Launcher-Release.

## Installation unter Windows

1. CFS AI beenden, auch den laufenden Bridge-Worker stoppen. Website/OBS müssen nicht gestoppt werden.
2. Vollständiges Backup deines lokalen CFS-AI-Ordners erstellen.
3. Update-ZIP entpacken. PowerShell oder CMD im entpackten Update-Ordner öffnen.
4. Vorprüfung: `py -3 install_update.py --check "C:\Pfad\zu\CFS_AI_LOCAL_SERVICE_v20"`
5. Installieren: `py -3 install_update.py --apply "C:\Pfad\zu\CFS_AI_LOCAL_SERVICE_v20"`
6. CFS AI wie gewohnt starten (`start_windows.bat` oder `start_headless_windows.bat`).
7. Lokal `http://127.0.0.1:8000/api/design-factory/status` prüfen.

Bei `CONFLICT` bricht der Installer vollständig ab. Bereits geänderte Kundendateien werden nicht überschrieben. Originale vor der Installation werden unter `data/update-backups/design-factory-v32069/` gesichert.

## Nutzung (per lokaler API)

Die Designproduktion startet **deaktiviert**. Optionen anpassen und bewusst aktivieren (bei gesetztem Bridge-Token den gleichen `x-cfs-ai-bridge-token`-Header benutzen):

- `GET /api/design-factory/status` – Status und Einstellungen
- `POST /api/design-factory/settings` – JSON mit `enabled`, `interval_hours` (1–168), `max_per_day` (1–12), `max_pending` (1–40), `hint`
- `POST /api/design-factory/run-now` – Einmaliger Entwurfsversuch auch ohne aktiven Scheduler
- `GET /api/design-factory/drafts` – Entwürfe auflisten
- `GET /api/design-factory/drafts/{id}/preview` – Vorschau-SVG ansehen
- `POST /api/design-factory/drafts/{id}/approve` – Entwurf zur Shop-Übernahme **lokal freigeben**
- `POST /api/design-factory/drafts/{id}/reject` – Entwurf ablehnen
- `GET /api/design-factory/approved-export` – ZIP mit freigegebenen Grafiken und Shop-Katalog

Der bestehende autonome Hintergrund-Worker prüft alle 15 Sekunden, ob ein neuer Entwurf fällig ist. Tatsächliche Erstellung nutzt `ollama_client.chat_json` und `template_factory` für Gestaltungskontext. Standard: alle 12 Stunden, höchstens 2 Entwürfe pro Tag. Fehlender Ollama-Dienst führt zu einem Fehlerstatus, **nicht** zu erfundenen Designs.

## Daten und Freigabe

Privat unter `data/cfs-ai-design-factory/drafts/<id>/`: Manifest + 8 SVGs (Start, Pause, Ende, Gameplay, Kamera, Alert, Panel, Vorschau).

Freigabe legt **nur** Exportdaten unter `data/cfs-ai-design-factory/export/public/...` an. Die 31 Originaldesigns und der Website-Hauptordner bleiben unangetastet. Das Export-ZIP enthält die Pfade `public/assets/data/cfs-ai-designs-v32068.json` und `public/assets/ai-generated/...`, passend zur bestehenden Website 3.20.68.

**Kein Git-Push, kein Render-Upload, keine OBS-Steuerung und keine automatische Produktveröffentlichung.** Vor einem manuellen Deployment den Shop-Katalog mit vorhandenen KI-Designs abgleichen; bei parallelen Erzeugern darf die Datei nicht blind überschrieben werden.

## Test

Im **Zielverzeichnis** nach Installation: `py -3 -m unittest discover -s tests -p 'test_design_factory_v32069.py'`. Alle Tests verwenden eine simulierte Modellantwort; ein echter Ollama-Lauf und Windows-Abnahme stehen aus.

**Hinweis:** Nur CFS AI v20 mit den angegebenen Originaldateien wurde als Update-Basis berücksichtigt. Bei abweichenden Versionen erst die Änderungen vergleichen. Weiterhin gilt Beta/Live-Acceptance **HOLD**.

## Lokales Dashboard

Nach dem Neustart `http://127.0.0.1:8000/design-factory` im Browser öffnen. Dort kannst du den Hintergrundlauf aktivieren, Entwürfe erzeugen und anschauen, freigeben, ablehnen und das Shop-Export-ZIP abrufen. Die Oberfläche ist ausschließlich lokal zugänglich. Wenn dein CFS-AI-Dienst einen globalen Bridge-Token für alle API-Routen verlangt, nutze die geschützten API-Aufrufe mit Token oder richte die lokale Authentisierung gesondert ein; das Token wird **nicht** in das Dashboard eingebettet.
