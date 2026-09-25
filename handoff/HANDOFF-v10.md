# Übergabe – v10 Form & Action Consistency

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält v3 bis v10.

## In v10 umgesetzt

### Einheitliche Formulare
Formulare werden websiteweit automatisch vereinheitlicht:
- konsistente Feldhöhen und Abstände,
- klarere Labels,
- sichtbare Pflichtfeld-Markierung,
- einheitlicher Fokuszustand,
- einheitliche Fehlerdarstellung,
- bessere mobile Anordnung.

### Passwortfelder
Passwortfelder erhalten lokal einen `ANZEIGEN / AUSBLENDEN`-Button.
Es werden keine Passwortwerte gespeichert oder an andere Komponenten gesendet.

### Feld-Hinweise
Ausgewählte sensible oder erklärungsbedürftige Felder erhalten kurze Hinweise:
- Login / Registrierung,
- E-Mail-Bestätigung,
- Passkey,
- MFA / Recovery-Codes,
- Passwortwechsel,
- Datenexport,
- Kontolöschung,
- Grundsetup,
- Device-Link.

### Zeichen-Zähler
Textfelder mit `maxlength` erhalten einen lokalen Zeichen-Zähler.
Passwortfelder sind davon ausgenommen.

### Inline-Validierung
Native Browser-Validierung bleibt die Grundlage.
v10 ergänzt verständliche Inline-Hinweise für:
- Pflichtfelder,
- E-Mail-Format,
- Mindest-/Maximallänge,
- Zahlenbereiche,
- Pattern-/Code-Format.

### Aktionen
Primär-, Sekundär- und Gefahrenaktionen sind klarer getrennt.
Bestehende `danger-button`-Elemente werden konsistent hervorgehoben.

### Statusmeldungen
Bestehende Notices werden visuell nach Erfolg, Warnung oder Fehler unterschieden.
Die Backend-/Frontend-Meldung selbst wird nicht verändert.

## Neue Dateien
- public/assets/css/cfs-forms-v10.css
- public/assets/js/cfs-forms-v10.js

## Geänderte Datei
- public/assets/js/cfs-shell-v3.js

## Sicherheitsgrenzen
v10:
- speichert keine Formulardaten,
- speichert keine Passwörter,
- verändert keine Request-Payloads,
- verhindert keine bestehende CSRF-/Origin-Logik,
- verändert keine Backend-Validierung,
- führt keine kritischen Aktionen automatisch aus.

## Production-Readiness
R59-R61 Evidence vorhanden.
R62 weiterhin nicht vollständig abgeschlossen.
R63-R66 offen.
R67 danach.

## Nächster empfohlener Produktstand
v11: Mobile UX & Touch Polish
- mobile Navigation/Drawer finalisieren,
- Touch-Flächen und Sticky-Aktionen verbessern,
- große Creator-Arbeitsflächen auf kleinen Displays besser führen,
- Formulare und Guide auf Mobile noch kompakter machen.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`
