# TECHNIK v154 — Beta-Test-Handbuch & Feature Freeze

**Status:** CODE COMPLETE / FEATURE FREEZE PREPARED / REAL ACCEPTANCE NEXT  
**Backend:** 3.20.0  
**Schema Generation:** 73  
**Launcher:** 0.47.26

## Ziel

v154 schließt den letzten vor der realen Testphase geplanten Produktblock: ein integriertes, creator-spezifisches Beta-Test-Handbuch im Launcher mit zentraler Admin-Auswertung. Gleichzeitig wird der CFS-Studio-Feature-Freeze als eigener statischer Vertrag festgehalten.

## Beta-Test-Handbuch

Das Handbuch enthält 12 feste Prüfpunkte:

1. Registrierung
2. Login
3. Launcher verbinden
4. TikTok
5. Twitch
6. OBS verbinden
7. Widget erstellen & Runtime
8. Widget in OBS
9. CFS Studio Scene Composer
10. Capture & Audio
11. ein Streaming-Ziel
12. Multistream & Recovery

Pro Schritt kann der Tester speichern:

- `passed` → Hat geklappt
- `failed` → Funktioniert nicht
- `skipped` → Übersprungen
- optionaler Kommentar bis 2000 Zeichen
- optionaler technischer Diagnose-Snapshot

## Datenmodell

Neue Tabelle: `creator_beta_handbook_results`.

Eigenschaften:

- strikt creator-spezifisch
- genau ein aktuelles Ergebnis pro Creator + Schritt
- optionale Zuordnung zur Beta-Session
- Ergebnis per DB-Constraint auf `passed|failed|skipped` begrenzt
- Diagnoseinformationen werden nur gespeichert, wenn der Tester sie explizit aktiviert
- Kommentare und Diagnosefelder werden serverseitig begrenzt/sanitized

## Bridge / Launcher

Neuer mutierender Bridge-Pfad:

- `PUT /api/bridge/beta/handbook/:stepKey`

Der Pfad verwendet den vorhandenen Launcher-Bridge-Vertrag. Mutierende Requests werden vom Bridge Client weiter HMAC-signiert und mit Timestamp/Nonce gegen Replay geschützt. Antworten sind `no-store`.

Der Launcher hängt bei aktivierter Diagnose nur den bereits vorhandenen begrenzten `betaDiagnosticSnapshot()` an. Stream-Keys, Provider-Tokens, Bridge-Schlüssel, Passwörter und komplette Logs gehören nicht zu diesem Snapshot.

## Admin Control

`/api/admin/creator-suite/beta-center` liefert zusätzlich:

- Handbook-Katalog
- Resultate je Creator/Schritt
- Status
- Kommentar
- optionale sichere technische Eckdaten
- zusammengefasste Passed/Failed/Skipped-Zähler

Das Admin Control zeigt diese Informationen im bestehenden Beta-Bereich an.

## Feature Freeze

`FEATURE-FREEZE-v154.md` definiert die aktuell eingefrorenen großen Funktionsblöcke und trennt offene reale Acceptance-Punkte von neuen Feature-Lücken.

Neue große Produktblöcke sollen bis zum Abschluss der gebündelten Acceptance nicht eröffnet werden. Erlaubt bleiben Fehler-, Sicherheits-, Test-/Diagnose- und kleine UX-Korrekturen.

## Lokale Verifikation

- `npm run beta-handbook154:check` → **57/57 PASS**
- `npm run feature-freeze154:check` → **33/33 PASS**
- `npm run project:check` → **30/30 PASS**
- kompletter `npm run release:v154` → **PASS** auf dem vollständigen Repository

## Nicht als real getestet behaupten

v154 führt keine reale Windows-, OBS- oder Provider-LIVE-Acceptance durch. Diese folgt als nächster Arbeitsblock gesammelt.
