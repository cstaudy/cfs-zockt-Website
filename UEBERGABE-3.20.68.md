# CFS Zockt · Übergabe 3.20.68

## Status
**CODE READY – lokale Tests bestanden; CFS AI Windows/Modell-Live-Abnahme offen; öffentliche Beta weiterhin HOLD.**

## Ziel
Der CFS AI Dienst soll im Hintergrund **neue Stream-Designsets** entwickeln, ohne die 31 Originalwelten umzubauen oder ungeprüfte KI-Vorschläge sofort in den Shop zu geben.

## Umsetzung
- Eigenständiger lokaler Python-Worker: `tools/cfs-ai-design-factory/design_factory.py`.
- CFS AI wird unter lokaler Loopback-URL mit dem bestehenden `/api/chat`-Vertrag angesprochen.
- Modellantwort wird als beschränktes JSON validiert; der mitgelieferte SVG-Renderer baut acht *neue Vektorgrafiken* pro Design (Start, Pause, Ende, Gameplay, Kamera, Alert, Panel, Vorschau).
- Worker läuft nach Start in Intervallen (Standard: 12h, bis zu 2 erfolgreiche Entwürfe täglich), mit Prozesslock und Fehlerlog.
- Lokale private Entwurfsgalerie, CLI-Freigabe/Ablehnung.
- **Erst Freigabe** schreibt ZIP und Katalog in `public/`; nach Deployment können Shop-Besucher diese Produkte finden.
- Neue Shop-Sektion für freigegebene CFS-AI-Designs; nur allowlistgeprüfte statische Assets.
- Keine DB-Migration, keine Änderungen an Originalen, keine Änderungen am Launcher.

## Grenzen
- Das ist eine **Anbindung und ein eigenständiges Add-on**, keine direkte Änderung der vorhandenen CFS-AI-Windows-Installation: Der Nutzer lieferte nur die Ordnerstruktur, nicht den Quellcode.
- CFS AI erstellt kreative Parameter, der Renderer erzeugt **SVG-Grafiken**, keine Bild-Diffusions-PNGs und keine semantische Freistellung.
- Nicht automatisch startend: Nutzer muss die `.cmd` ausführen oder Windows-Aufgabenplanung einrichten.
- Kein direkter PC→Render-Upload: Freigegebene Dateien müssen deployed werden.
- Kein Live-Modellaufruf möglich in dieser Umgebung; Tests verwenden absichtlich Mock-Antworten.

## Tests
- `npm run check:v32068` testet Website-Catalog, private Draft-/Approve-Policy, Sicherheit, ZIPs und 3.20.67-Regressionspaket.
- Reale Acceptance für Windows-Autostart, Netzwerkverbindung und Modellqualität offen.

## Nächste sinnvolle Arbeit
1. Der komplette **CFS AI Windows-Projektordner als ZIP ohne `.venv`, `OllamaSetup.exe`, Logs und Zugangsdaten** ermöglicht Einbau direkt in den existierenden Agenten und die lokale autonome Zeitplanung.
2. Optionale sichere Vorschau-/Entwurfs-Synchronisation PC→Render, nur über Admin-Freigabe.
3. Optionaler hochwertiger PNG-Renderer über Bildmodell oder lokal installierten SVG-Renderer, nach ausdrücklicher Wahl des Backends.
