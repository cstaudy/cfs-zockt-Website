# Übergabe – v15 Plans & Pricing Clarity

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält v3 bis v15.

## In v15 umgesetzt

### Live-Konfiguration statt statischer Kaufbehauptung
Die Planseite lädt `/api/plans/catalog`.

Dadurch zeigt sie pro Plan:
- aktuellen Preis aus dem Server-Katalog,
- ob Checkout für diesen Plan wirklich konfiguriert ist,
- FREE als verfügbaren Einstieg,
- CREATOR/PRO als nicht buchbar, solange der Server keinen Checkout freigibt.

### Checkout nur bei echter Serverfreigabe
CREATOR/PRO erhalten nur dann einen aktiven Buchungsbutton, wenn:
- der Server `checkout_available=true` meldet,
- und der Nutzer angemeldet ist.

Ohne Konfiguration bleibt der Button deaktiviert und zeigt `NOCH NICHT BUCHBAR`.

### Accountstatus für eingeloggte Nutzer
Wenn angemeldet, zeigt die Planseite:
- Basisplan,
- effektiven Zugriff,
- Zugriffsquelle,
- Abo-Status.

Beta-Zugriff und bezahlter Plan bleiben getrennt dargestellt.

### Billing-Portal
Ein Billing-Portal-Button erscheint nur bei einer konfigurierten Subscription.
Er bleibt deaktiviert, wenn der Server kein Portal freigibt.

### Checkout-Rückkehr
Bei `billing=success` wird ausdrücklich nur bestätigt, dass der Checkout abgeschlossen wurde.
Der endgültige Abo-Zugriff wird danach erneut vom Server abgefragt.
Es wird nicht vorzeitig behauptet, dass Premium aktiv ist.

Bei `billing=cancel` wird kein Planwechsel behauptet.

## Neue Dateien
- public/assets/css/cfs-plans-v15.css
- public/assets/js/cfs-plans-v15.js

## Geänderte Datei
- public/assets/js/cfs-shell-v3.js

## Sicherheits-/Billinggrenzen
v15:
- erfindet keine Checkout-Verfügbarkeit,
- liest Checkout-Verfügbarkeit nur vom Server,
- speichert keine Zahlungsdaten,
- integriert keine Stripe-Secrets im Frontend,
- verwendet die vorhandenen serverseitigen Checkout-/Portal-Endpunkte,
- ändert keine Billing-Konfiguration,
- ändert keine Preise im Backend.

## Production-Readiness
R59-R61 Evidence vorhanden.
R62 weiterhin nicht vollständig abgeschlossen.
R63-R66 offen.
R67 danach.

Billing-Live-Nachweise bleiben separat zu behandeln.
Das UI-Update ersetzt keinen Stripe-/Webhook-Live-Test.

## Nächster empfohlener Produktstand
v16: Support & Error Recovery Polish
- Supportseite vereinfachen,
- technische Fehler in konkrete nächste Schritte übersetzen,
- Account-/Billing-/Launcher-/TikTok-Hilfe zusammenführen,
- sichere Diagnoseinformationen für Support vorbereiten, ohne Secrets zu sammeln.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`
