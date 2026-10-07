# Update 3.20.41 – Übersicht und CFS Guide

- Creator-Navigation auf Übersicht, Maker, Vorlagen & Shop, Stream und Mein Konto reduziert. Bestehende Werkzeuge werden im zusätzlichen Menü erhalten. Admin-Seiten werden nicht umgebaut; vorhandene ausgeblendete Admin-Links behalten ihren Zugriffszustand.
- Dashboard: vier Aufgaben statt sechs teils überlappender Einstiege; Modul-/Berechtigungsübersicht einklappbar.
- Guide und Hilfe-Center auf den Creator-Seiten und im Maker eingebunden.
- Vier Schrittfolgen: Bild zu Widget, Shop-Vorlage, Aufnahme zu Clip, fehlende OBS-Anzeige. Links öffnen den Bereich oder markieren das passende Bedienelement.
- Fortschritt wird ausschließlich vom Nutzer bestätigt und pro Browser-Tab gespeichert. Keine erfundene automatische Prüfung von Upload, Speicherung oder OBS.
- Hilfethemen für Maker, Drag-and-drop, OBS, Shop, Cut, Audio, Games und CFS AI. Fehlermeldungen haben Vorrang vor allgemeinen Widget-Antworten.
- Der nächste Schritt berücksichtigt Maker/Shop/Cut. Fehlgeschlagene Sicherheitsabfragen werden nicht mehr als fehlende Passkeys/2FA interpretiert.

## Umfang

Dies baut die vorhandene Suite übersichtlicher auf. Es ergänzt keine fertige Game-Mechanik, keine automatische AI-Verarbeitung und keine neue Audio-Engine. Cut und Games behalten ihren bestehenden Funktionsumfang. Die bestehende eigenständige Maker-HTML-Vorschau zeigt weiterhin den Maker; Navigation und Guide dieses Updates sind auf der gestarteten Website zu prüfen.

## Prüfung

`npm run check:workspace` prüft Schrittziele, Speicherung bei blockiertem Browser-Speicher, Fortschrittsgrenzen, Hilfethemen und die Priorität von Problemanfragen. `npm run check:stream-maker` prüft die vorhandenen Maker-/Drop-Funktionen. JavaScript-Syntax wurde geprüft. Die Update-Installation wurde auf den bekannten Ausgangsständen 3.20.39 und 3.20.40 getestet. Eine visuelle Browserprüfung und PostgreSQL-/OBS-Livetests sind weiterhin nicht durchgeführt.

Keine zusätzliche Datenbankmigration gegenüber 3.20.40; Schema bleibt 80. Bei direkter Installation auf 3.20.39 ist die Maker-Migration aus 3.20.40 enthalten.
