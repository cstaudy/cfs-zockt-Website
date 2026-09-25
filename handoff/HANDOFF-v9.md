# Übergabe – v9 Dashboard Priority & Tool Discovery

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält:
- v3 Full Website UI
- v4 Beginner Onboarding
- v5 CFS Guide
- v6 Guided Actions / Hilfe-Center
- v7 Empty States & First-Use Content
- v8 Navigation & Information Architecture
- v9 Dashboard Priority & Tool Discovery

## In v9 umgesetzt

### 1. Dashboard priorisiert jetzt eine Hauptaktion
Oben im Dashboard steht jetzt `JETZT WICHTIG`.

Dieser Bereich übernimmt dynamisch den bereits vorhandenen nächsten sinnvollen Schritt aus der bestehenden Dashboard-Logik.
Dadurch bleiben Setup-, Widget- und Verbindungsstatus weiterhin die Quelle der Entscheidung.

### 2. Weiterarbeiten / zuletzt genutzt
Creator-Tool-Aufrufe werden lokal im Browser gespeichert.

Gespeichert werden ausschließlich:
- Tool-Pfad
- Zeitpunkt

Nicht gespeichert werden:
- Passwörter
- Tokens
- Formulardaten
- Account-Inhalte

Im Dashboard erscheinen die drei zuletzt verwendeten Tools direkt unter `WEITERARBEITEN`.

### 3. Drei klare Schnellzugriffe
Direkt sichtbar:
- Widget bauen
- Stream vorbereiten
- Account prüfen

Dadurch müssen neue Nutzer nicht erst die gesamte Modulliste verstehen.

### 4. Tool-Finder
Neue Suche auf dem Dashboard:
- Suche nach Titel, Beschreibung oder Aufgabe
- Filter für BAUEN / STREAM / VERBINDEN / ERWEITERN / SYSTEM
- gesperrte Module bleiben sichtbar und werden als `PLAN PRÜFEN` gekennzeichnet

Die Suchdaten werden aus der bereits vorhandenen Modulübersicht abgeleitet.
Falls sie noch nicht geladen ist, gibt es einen sicheren lokalen Fallback-Katalog.

### 5. Technische Informationen weiter nach hinten
Diese bisherigen Dashboard-Bereiche sind jetzt unter einem aufklappbaren Block zusammengefasst:
- Verbindungsstatus
- Systemstatus
- Setup-Warnung
- Creator Journey
- alte Schritt-Aktionskarten
- Workspace Map

Die zugrundeliegenden DOM-Elemente und IDs bleiben erhalten, damit `page-dashboard.js` weiter funktioniert.

### 6. Alte Tool-Übersicht bleibt technisch erhalten
`simpleToolGrid` und `moduleGrid` werden weiterhin durch die bestehende Dashboard-Logik befüllt.
Der alte sichtbare Abschnitt wird jedoch ausgeblendet, weil der neue Tool-Finder dieselben Daten nutzerfreundlicher darstellt.

## Neue Dateien
- public/assets/css/cfs-dashboard-v9.css
- public/assets/js/cfs-dashboard-v9.js

## Geänderte Datei
- public/assets/js/cfs-shell-v3.js

## Sicherheitsgrenzen
v9:
- verändert keine Backend-API,
- verändert keine Berechtigungsentscheidung,
- speichert nur lokale Tool-Pfade in localStorage,
- speichert keine Secrets oder Formulardaten,
- führt keine kritischen Aktionen automatisch aus,
- verändert keine Zahlungen oder Pläne.

## Production-Readiness
Separater Stand bleibt:
- R59 LIVE_PASS Evidence vorhanden
- R60 LIVE_RESTORE_PASS Evidence vorhanden
- R61 LIVE_MAIL_PASS Evidence vorhanden
- R62 PREPARED / teilweise manuell durchgeführt, noch nicht abgeschlossen
- R63-R66 OPEN
- R67 danach

## Nächster empfohlener Produktstand
v10: Form & Action Consistency
- Formulare stärker vereinheitlichen,
- Primär-/Sekundär-/Gefahrenaktionen konsistent machen,
- Feldbeschriftungen, Hinweise und Fehlerzustände vereinheitlichen,
- mobile Formularbedienung verbessern.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`
