# Update 3.20.59 · Masterbild zu echten dynamischen Widget-Layern

**Basis:** 3.20.58. **Ziel:** 3.20.59. **Status:** CODE READY für den geänderten Konverter, Live-Acceptance OFFEN.

## Jetzt integriert
- Vorhandene Bilder lassen sich direkt aus der **eigenen Medienbibliothek auswählen**, ohne erneut hochzuladen.
- Der Widget-Umwandler hat **zwei klar getrennte Modi**: vollständiges Motiv als Stil (Standard) oder kleines Logo (klassisch).
- Aus einem bereits in der eigenen Creator-Medienbibliothek vorhandenen Bild entsteht lokal ein transparentes PNG-Dekor mit drei Formen: Prisma, Ribbon, Glass.
- Farben des Originalmotivs werden übernommen und auf vorhandene Darstellungselemente angewendet.
- Der dekorative Layer liegt **hinter** den eigentlichen Live-Daten. Follower-/Goal-/Chat-Datenquellen werden nicht überschrieben und es werden keine Werte vorgetäuscht.
- Erst durch das explizite Erstellen wird die abgeleitete PNG über den bestehenden authentifizierten Asset-Endpunkt gespeichert. Kein direkter Import einer fremden URL.
- Der vorhandene Stream-Maker→Widget-Studio-Asset-Handoff bleibt gültig, ebenso der bisherige Logo-Modus und gespeicherte Legacy-Projekte.

## Wichtige Grenzen
- Das ist **motivbasierte Ableitung**, noch **keine semantische KI-Objekterkennung** oder vollautomatische Freistellung von Personen/Gegenständen.
- Keine realen Twitch-/TikTok-/OBS-/Windows-Tests in dieser Umgebung. Die Provider-/Live-Acceptance bleibt HOLD.
- Wenn Widget-Anlage nach erfolgreichem Bild-Upload fehlschlägt, kann das bereits hochgeladene dekorative Bild als eigene Datei in der Medienbibliothek zurückbleiben. Es wird kein fremdes Asset erzeugt.

## Test- und Installerstand
- Motif-Generator: **27/27 PASS** (Pure-Logic, Canvas-Mock, UI-/Rechte-Verträge).
- `npm run check:v32059`: **PASS** (komplette bestehende Regression einschließlich Launcher-Static-Check) – zusätzlich nach Installation auf sauberem 3.20.58-Stand.
- Installer: **15 Dateien**, Wiederholung **0**, Konfliktfall eigene JS-Datei → **Exit 1 ohne Überschreibung**.

## Prüfbefehle
- `node tools/widget-motif-generator-v32059-test.mjs .`
- `npm run check:v32059`
- Nach dem Einbau im Browser: eigenes Bild hochladen; Prisma/Ribbon/Glass durchlaufen; Widget erstellen; im Editor Zähler/Chat testen; Browser Source öffnen; Logo-Modus gegenprüfen.

## Weitere Bereiche
Die Reihenfolge und Abnahmekriterien stehen in `FUNKTIONSLUECKEN-STATUS-3.20.59.md`. Der Release enthält bewusst keine künstliche Aktivierung von Checkout oder CFS AI und keine Windows-EXE.
