# CFS Zockt · funktionale Restarbeiten 3.20.59

**Verbindlicher Plan ab 3.20.58.** Nicht mehr nur Code-Ready-Zeichen zählen. Zu jedem Bereich gibt es „Ist“, „offen“, „fertig wenn“ und eine eigene reale Acceptance.

| Priorität | Bereich | Ist-Stand und neue Arbeit | Weiter offen / Beta-Gate |
|---|---|---|---|
| P1 | 01 · Live-Daten / Events | Widget Studio besitzt eine Live-Runtime, Providerdefinitionen und Event-Simulation. Maker ist seit 3.20.58 bewusst statisch. | **Echte** Twitch-/TikTok-Events für Goals/Counter/Alerts verbinden und mit Provider-Testkonten messen; Datenquelle, Reset und Offlinezustand pro Typ prüfen. Keine simulierten Werte als Live-PASS verbuchen. |
| P1 | 02 · Bild → fertige Widgets | **3.20.59:** Motivausschnitt als transparenter PNG-Layer, drei Formen, Farbübernahme und echter Editier-/Speicherpfad im Widget Studio; Logo-Rückfallweg bleibt. | Semantische Erkennung von Bildobjekten, automatisch korrekt platzierte Text-Safe-Zones, Rahmen-Zerlegung, viele Quellformate, visuelle Browser-Tests mit realen Motiven. Code-Teil 1 erledigt, Produkt-Acceptance offen. |
| P1 | 03 · Einfacher Studio-Ablauf | Maker↔Widget-Handoff vorhanden, seit 3.20.58 klare Rollen. 3.20.59 verbessert die Konvertierung. | Shop→Masterbild→Widget→OBS einmal vollständig aus Nutzersicht abnehmen; Universal Builder und Maker-Einstieg zusammenführen, ohne Legacy-Projekte zu verlieren. |
| P1 | 04 · Tonstudio | Lokale CFS-Alert-Engine, Soundpacks, WAV-Export und Synth-Layer vorhanden. | Sample-Editor (Trim, Fade, Layer, Loop-Guard), Voice-Chain/Soundboard/Mixer sofern Beta-Scope, Twitch-/TikTok-Eventbindung und echte Hörtests. |
| P1 | 05 · Cut Studio | Schnitt/Export/Recording→Cut und FFmpeg-Regressionen vorhanden. | Browser-Vorschau des **gesamten** Endergebnisses (Audio, Captions, Effekte), Prüfexport gegen finale Render-Pipeline, echte Windows-Hardware-/Codec-Tests. |
| P1 | 06 · Download-Designs | Shop-Produkt-ZIPs/Manifeste und 45 Designwelten vorbereitet. | Jede Datei: echter Alpha-Kanal, Layout, editierbare Konfig, OBS-Installation, 16 Farbvarianten und saubere ZIP-Prüfung; Stichproben auf Windows/OBS. |
| P2 | 07 · CFS AI | Website hat AI-Anbindung. | Externen AI-Dienst, API-Zugang, Degradation und Privatsphäre auf Render real prüfen; ohne Konfiguration **HOLD** statt vorgetäuschtes „fertig“. |
| P2 / Beta optional | 08 · Bezahlen | Kostenlose Beta-Downloads, geschützte Creator-Endpunkte/Produktmanifest und einige Billing-Bausteine existieren. | Checkout mit Payment Provider, Kaufberechtigung, Lizenz, Steuer/Rechnung, Refunds und Idempotenz nur nach gesondertem Commerce-Gate aktivieren. Für kostenlose Beta explizit AUS. |
| Release-Blocker | 09 · Windows Launcher | Launcher-Quellstand 0.47.31 und Contract-Gates vorhanden. | **Realer** Windows-Build/Installer, SmartScreen/Signaturstrategie, OBS-WebSocket, Application Audio, Game Capture, Recording→Cut, Reconnect, 60-Minuten-Soak; EXE-Hashes/Evidence. |

## Entscheidungsregel
- **CODE READY** heißt: statische Checks und automatisierte Regressionen grün.
- **BETA ABGENOMMEN** heißt: Nutzerweg mit echten Zielsystemen, reproduzierbare Evidence, keine P0/P1-Blocker.
- **HOLD** ist der einzige ehrliche Zustand ohne reale Abnahme.

## Release-Etappen
1. **3.20.59 – Widget-Motiv-Layer (diese Runde)**: echte Bildableitung, Eigentumsgrenze, einfacher Konverter; Tests und Übergabe.
2. **Nächster Bereich**: Live-Daten / Eventbindungen systematisch als Provider-Matrix prüfen, Lücken schließen und eigene Tests. Keine Fake-Events als Produktionsdaten.
3. Danach: einfacher Gesamt-Flow; Tonstudio; Cut-Vorschau; Design-Downloadqualität; CFS AI; Commerce nur mit geklärtem Beta-Scope; Windows-Launcher.
4. **Finale Beta-Acceptance**: alle Pflichtgates der 3.20.57-Matrix mit Evidence und manuellem GO/NO-GO.
