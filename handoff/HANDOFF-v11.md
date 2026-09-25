# Übergabe – v11 Mobile UX & Touch Polish

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält v3 bis v11.

## In v11 umgesetzt

### Mobile Creator Dock
Auf Creator-Seiten erscheint auf kleinen Displays eine feste Bottom-Navigation:
- Dashboard
- Widgets
- Stream
- Account
- Guide

Die Desktop-Navigation bleibt unverändert.

### Touch-Flächen
Interaktive Buttons und Hauptaktionen erhalten auf Mobile größere Touch-Ziele.

### Mobile Formulare
- Formularfelder verwenden mindestens 16px Schriftgröße, um unerwünschtes iOS-Zoomen zu vermeiden.
- lange Formulare erhalten eine mobile Sticky-Aktion für den vorhandenen Submit-Button.
- die Original-Submit-Logik bleibt die einzige Aktion; v11 klickt nur den bestehenden Button an.

### Arbeitsflächen
Große Creator-Arbeitsbereiche erhalten einen kurzen Hinweis, dass Werkzeugleisten und breite Arbeitsflächen horizontal verschoben werden können.

Betroffen:
- Widget Studio
- Stream Studio
- Scene Studio
- Creator Editor
- Cut Studio
- Audio Studio

### Horizontale Controls
Tabs, Chip-Reihen, Filter und Toolbars können auf kleinen Displays horizontal gescrollt werden, statt zu stark zusammengedrückt zu werden.

### Guide / Hilfe
CFS Guide und Hilfe-Center berücksichtigen mobile Safe Areas und die neue Bottom-Navigation.

### Fokus / Tastatur
Beim Fokussieren von Eingabefeldern wird versucht, das aktive Feld oberhalb der mobilen Tastatur sichtbar zu halten.

### Safe Areas
`env(safe-area-inset-*)` wird für Geräte mit Display-Aussparungen bzw. Home-Indicator berücksichtigt.

## Neue Dateien
- public/assets/css/cfs-mobile-v11.css
- public/assets/js/cfs-mobile-v11.js

## Geänderte Datei
- public/assets/js/cfs-shell-v3.js

## Sicherheitsgrenzen
v11:
- speichert keine Formulardaten,
- verändert keine Request-Payloads,
- ersetzt keine Submit-Handler,
- verändert keine Auth-/MFA-/Passkey-Logik,
- führt keine kritischen Aktionen automatisch aus.

## Production-Readiness
R59-R61 Evidence vorhanden.
R62 weiterhin nicht vollständig abgeschlossen.
R63-R66 offen.
R67 danach.

## Nächster empfohlener Produktstand
v12: Accessibility & Keyboard Polish
- Skip-Link / Landmark-Navigation,
- bessere sichtbare Tastaturfokusse,
- Dialog-Fokusführung,
- reduzierte Animationen bei `prefers-reduced-motion`,
- bessere Statusansagen für Screenreader.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`
