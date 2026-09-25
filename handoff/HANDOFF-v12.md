# Übergabe – v12 Accessibility & Keyboard Polish

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält v3 bis v12.

## In v12 umgesetzt

### Skip-Link
Alle Seiten erhalten einen Tastatur-Sprunglink:
`Zum Hauptinhalt springen`.

Der Hauptbereich wird dafür fokussierbar gemacht, ohne den normalen Tab-Verlauf zu verändern.

### Sichtbarer Tastaturfokus
`:focus-visible` wird websiteweit konsistent dargestellt.
Mausklicks bekommen nicht unnötig denselben Fokusrahmen.

### Navigation per Tastatur
Dropdown-Gruppen der v8-Navigation unterstützen:
- Pfeil runter
- Pfeil hoch
- Home
- End
- Escape

`aria-expanded` wird synchron mit dem tatsächlichen Öffnungszustand gehalten.

### Dialog-Fokus
CFS Guide und Hilfe-Center erhalten:
- Fokusführung beim Öffnen,
- Fokus-Falle innerhalb des offenen Dialogs,
- Rückgabe des Fokus an das vorher aktive Element beim Schließen,
- `aria-modal`.

### Statusansagen
Erfolgs- und Fehlermeldungen werden zusätzlich über eine zentrale `aria-live`-Region angesagt.
Fehler werden assertiv, Erfolgsmeldungen höflich angesagt.

### Reduced Motion
Bei `prefers-reduced-motion: reduce` werden Animationen und weiche Scrollbewegungen nahezu vollständig deaktiviert.

### Higher Contrast
Bei `prefers-contrast: more` werden wichtige Borders und sekundäre Texte kontrastreicher dargestellt.

### Button-Namen
Icon-only Buttons erhalten, soweit aus vorhandenem `title`/`alt` sicher ableitbar, automatisch einen zugänglichen Namen.

## Neue Dateien
- public/assets/css/cfs-accessibility-v12.css
- public/assets/js/cfs-accessibility-v12.js

## Geänderte Datei
- public/assets/js/cfs-shell-v3.js

## Sicherheitsgrenzen
v12:
- verändert keine Backendlogik,
- verändert keine Formulardaten,
- verändert keine Auth-/Passkey-/MFA-Abläufe,
- führt keine Aktion automatisch aus.

## Production-Readiness
R59-R61 Evidence vorhanden.
R62 weiterhin nicht vollständig abgeschlossen.
R63-R66 offen.
R67 danach.

## Nächster empfohlener Produktstand
v13: Public Landing & Conversion Polish
- Startseite stärker auf erste 10 Sekunden optimieren,
- klarere Produktbotschaft,
- Feature-Beweise statt langer Texte,
- CTA-Hierarchie und Vertrauenselemente schärfen,
- Public-Website visuell noch stärker an Creator Suite angleichen.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`
