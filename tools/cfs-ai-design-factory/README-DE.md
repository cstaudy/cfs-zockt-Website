# CFS AI Design Factory · Lokaler Hintergrund-Worker (3.20.68)

Dies ist ein **eigenständiges Website-Add-on**, keine Modifikation der separat installierten CFS-AI-Windows-App. Du hast bisher nur deren Ordnerstruktur übermittelt; der Quellcode wurde nicht bereitgestellt. Die Factory nutzt den vorhandenen CFS-AI-Dienst über seine lokale `/api/chat`-Schnittstelle.

## Zweck

1. CFS AI erzeugt neue **Gestaltungs-Blaupausen** (Name, Beschreibung, Stil, drei Farben, Motiv und Seed).
2. Der mitgelieferte Renderer erstellt daraus **acht neue SVG-Grafiken**: Start, Pause, Ende, Gameplay, Kamera, Alert, Panel und Vorschau.
3. Alle Ergebnisse bleiben **privat unter `data/cfs-ai-design-factory/drafts`**. Ohne Admin-Freigabe kein Shop-Export.
4. Nach manueller Freigabe landet ein ZIP unter `public/assets/ai-generated/` und ein Katalogeintrag unter `public/assets/data/cfs-ai-designs-v32068.json`.
5. Damit das Design auf deiner **gehosteten Website** erscheint, musst du diese freigegebenen Dateien anschließend deployen. Eine automatische Übertragung zur öffentlichen Website ist noch **nicht** integriert.

Das ist **keine KI-Bilddiffusion** und keine semantische Motiv-Freistellung. Das lokale Sprachmodell entwickelt Gestaltungsvorgaben; der eigenständige Grafikrenderer macht daraus neue Vektor-Layouts. Die Ergebnisse sind **SVG**, keine PNG-Renderings. Keine echten Follower-Werte, Livestream-Daten, Logos, Filmfiguren oder Sounddateien.

## Voraussetzung

- Windows-PC mit Python 3.10 oder neuer (`py -3`).
- CFS AI samt Modell lokal gestartet und erreichbar, standardmäßig `http://127.0.0.1:8000/api/chat`.
- Modell muss JSON-Vorgaben beantworten können. Ein bloß installiertes `OllamaSetup.exe` reicht **nicht**.
- Keine neuen Python-Bibliotheken erforderlich.

## Starten

Im Website-Projektordner unter `tools/cfs-ai-design-factory/`:

- `CREATE_ONE_DESIGN_WINDOWS.cmd` – ein Entwurf als Verbindungstest.
- `START_DESIGN_WORKER_WINDOWS.cmd` – Hintergrund-Schleife, alle 12 Stunden bis zu 2 erfolgreiche Entwürfe pro Tag (nur solange das Fenster bzw. der Prozess läuft).
- `REVIEW_DESIGNS_WINDOWS.cmd` – eine private Vorschau-Galerie im Browser öffnen. Freigabe erfolgt danach im Terminal.

Alternativ in PowerShell:

```powershell
py -3 tools/cfs-ai-design-factory/design_factory.py once --root .
py -3 tools/cfs-ai-design-factory/design_factory.py review --root .
py -3 tools/cfs-ai-design-factory/design_factory.py list --root .
py -3 tools/cfs-ai-design-factory/design_factory.py approve HIER_DIE_ENTWURFS_ID --root .
py -3 tools/cfs-ai-design-factory/design_factory.py worker --root . --interval-hours 12 --per-day 2
```

Optional: Um den Prozess nach Windows-Anmeldung automatisch zu starten, eine Aufgabe in der Windows-Aufgabenplanung erstellen, die das `START_DESIGN_WORKER_WINDOWS.cmd` startet. Bis dies eingerichtet wurde, startet er **nicht automatisch**.

## Konfiguration

Über Umgebungsvariablen, niemals in den Shop-JavaScript-Dateien:

- `CFS_AI_BASE_URL` – standardmäßig `http://127.0.0.1:8000`; aus Sicherheitsgründen nur Loopback.
- `CFS_AI_BRIDGE_TOKEN` – optional, wenn dein lokaler CFS-AI-Dienst diesen Header erwartet.
- `CFS_DESIGN_INTERVAL_HOURS` – Standard `12` (1–168).
- `CFS_DESIGN_MAX_DAILY` – Standard `2` (1–12).

Wenn das Modell offline ist, bleibt die Erstellung fehlgeschlagen und wird erst beim nächsten Intervall erneut versucht. Es werden **keine erfundenen KI-Ergebnisse** eingetragen. Fehler stehen in `data/cfs-ai-design-factory/worker.log`.

## Kontrolle und Sicherheit

- Entwürfe sind bis zur Freigabe nicht öffentlich.
- ZIP-Inhalte enthalten ausschließlich die lokal erzeugten Grafiken und Hilfstexte.
- Der Worker ruft nur die lokale CFS-AI-API auf und sendet keine Quellbilder, Nutzer- oder Shopdaten an fremde Dienste.
- Maximal 120 freigegebene Designpakete im statischen Shop-Katalog.
- Alle Originaldesignpakete und deren Downloads bleiben unangetastet.
- SVG in OBS ggf. als lokale HTML-Browserquelle einbinden. Die Store-Assets sind **keine** dynamischen Widgets.
