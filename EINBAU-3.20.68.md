# Einbau 3.20.68

## Bestehende Website 3.20.67

Das Delta entpacken und im Delta-Ordner ausführen:

```bash
node install-update.cjs --check PFAD_ZUR_WEBSITE
node install-update.cjs --apply PFAD_ZUR_WEBSITE
```

Danach im Website-Ordner:

```bash
npm run check:v32068
```

Keine neuen npm-Pakete nötig. Die große Originaldesign-ZIP bleibt unverändert.

## Hintergrund-Worker unter Windows

1. Stelle sicher, dass CFS AI lokal gestartet und ein Modell bereit ist.
2. Öffne im **Website-Projektordner** `tools/cfs-ai-design-factory/README-DE.md`.
3. Teste `CREATE_ONE_DESIGN_WINDOWS.cmd`.
4. Starte `START_DESIGN_WORKER_WINDOWS.cmd` (oder Windows-Aufgabenplanung nach Anleitung).
5. Prüfe Entwürfe mit `REVIEW_DESIGNS_WINDOWS.cmd`; genehmige nur passende Designs.
6. Deploye die nach Genehmigung neu erzeugten Dateien in `public/assets/ai-generated/` und den Katalog in `public/assets/data/` mit deiner Website.

**Nicht** den Windows-CFS-AI-Programmordner mit dem Website-Projektordner verwechseln. Diese Version umfasst ein lokales Ergänzungsmodul, nicht die bestehende installierte AI-App.
