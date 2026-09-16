# WEBSITE AUTH ENTRY PASS 21.3.6

**Stand:** 16.09.2026

## Ziel

Login, Registrierung, E-Mail-Bestätigung und Passwort-Recovery werden als zusammenhängender Übergang von der öffentlichen Website in die Creator Suite gestaltet. Bestehende Auth-/Security-Logik bleibt unverändert.

## Änderungen

- Login und Registrierung verwenden den öffentlichen Website-Header und Footer
- klarer FREE-Start ohne automatische Zahlung oder Zahlungsdaten beim normalen Accountstart
- sichtbarer Weg Account → Dashboard → Tools verbinden
- Login, MFA und Passkey-IDs/Flows bleiben erhalten
- Registrierungs-Anchor `#regForm` wird sichtbar fokussiert und gescrollt
- nach Passwort-Reset zeigt der Login einen verständlichen Erfolgsstatus
- Recovery- und E-Mail-Verifizierungsseiten verwenden denselben öffentlichen Shell und klare nächste Schritte
- alle Auth-/Recovery-Seiten bleiben `noindex`

## Nicht Teil dieses Passes

- keine Änderung an Login-, MFA-, Passkey-, Recovery- oder Datenbanklogik
- keine Änderung an Produktions-Secrets
- keine vollständige Security-Abnahme; diese folgt nach Abschluss des Website-Aufbaus

## Nächster Schritt

Pass 21.3.7: Creator-Dashboard und interne Produktnavigation als einheitlichen Einstieg nach dem Login aufbauen.
