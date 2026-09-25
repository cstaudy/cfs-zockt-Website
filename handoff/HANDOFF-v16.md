# Übergabe – v16 Support & Error Recovery Polish

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält v3 bis v16.

## In v16 umgesetzt

### Support Problem-Lotse
Die Supportseite startet jetzt mit vier klaren Problemgruppen:
- Account / Login
- Widget / Stream
- TikTok / Launcher
- Sicherheit / Datenschutz

Jeder Bereich bietet zuerst direkte Selbsthilfe-Links.
`MELDUNG VORBEREITEN` füllt lediglich Kategorie, Priorität und – nur wenn leer – ein neutrales Thema vor.
Es wird nicht automatisch gesendet.

### Öffentlicher Systemstatus
Die Support- und Fehleransicht lädt ausschließlich `/api/public/status`.
Angezeigt werden nur dessen öffentlicher Status und öffentliche Meldung.

### Sichere Diagnose
Nutzer können freiwillig eine kleine Diagnose in die Beschreibung einfügen.

Enthalten sind ausschließlich:
- sicherer Pfad ohne Query/Hash,
- öffentlicher Systemstatus,
- Browser online/offline,
- grobe Ansichtsgröße mobile/tablet/desktop.

Nicht enthalten:
- Cookies
- LocalStorage-Inhalte
- Query-Parameter
- Tokens
- Passwörter
- Recovery-Codes
- API-Keys
- User-Agent
- IP-Adresse

### Fehler- und 404-Seiten
`error.html` und `not-found.html` erhalten einen klareren Recovery-Block:
1. Status/Ziel prüfen
2. Hauptnavigation verwenden bzw. erneut versuchen
3. nur bei Bedarf privat melden

Beim Wechsel von einer Fehlerseite zum Support wird in `sessionStorage` nur gespeichert:
- Fehlerart
- Pfad
- lokaler Zeitstempel

Dieser Kontext verfällt nach zwei Stunden.

### Bestehendes Support-Sicherheitsmodell
`public/assets/js/support.js` und der bestehende POST-Endpunkt bleiben unverändert.
Secret-Erkennung, Honeypot, private Speicherung und Referenzlogik bleiben damit erhalten.

## Neue Dateien
- public/assets/css/cfs-support-v16.css
- public/assets/js/cfs-support-v16.js

## Geänderte Datei
- public/assets/js/cfs-shell-v3.js

## Production-Readiness
R59-R61 Evidence vorhanden.
R62 weiterhin nicht vollständig abgeschlossen.
R63-R66 offen.
R67 danach.

## Nächster empfohlener Produktstand
v17: Account Recovery & Security UX Polish
- Account-Sicherheitsbereich weiter vereinfachen,
- Passkey/TOTP/Recovery-Code verständlicher staffeln,
- sensible Aktionen mit klaren Vorbedingungen,
- R62-Bedienweg visuell besser unterstützen, ohne Test-Evidence vorzutäuschen.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`
