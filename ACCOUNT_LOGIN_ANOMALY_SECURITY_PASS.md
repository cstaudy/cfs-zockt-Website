# Account Login / Anomaly Security Pass

Stand: 15.09.2026

## Ziel

Der Login-Schutz wird um persistente, accountbezogene Drosselung und datensparsame Sicherheitswarnungen erweitert, ohne Standorttracking, Browser-Fingerprinting oder dauerhafte Geräteprofile einzuführen.

## Umgesetzt

- bestehende In-Memory/IP-Rate-Limits bleiben als erste Schutzschicht erhalten
- zusätzlicher PostgreSQL-basierter Account-Throttle für verteilte Passwortversuche
- Beobachtungsfenster: 15 Minuten
- Schwelle: 20 fehlgeschlagene Passwortversuche
- temporäre Drossel: 15 Minuten
- der persistente Throttle speichert nur Creator-ID, Fehlversuchszähler, Zeitfenster und Blockzeit
- kein IP-, User-Agent-, Standort- oder Fingerprint-Feld
- blockierte bekannte Accounts durchlaufen einen Dummy-scrypt-Pfad und erhalten dieselbe generische Login-Antwort wie andere ungültige Anmeldungen
- erfolgreicher Passwortnachweis setzt den accountweiten Fehlversuchszähler zurück
- aktive Sessions speichern und zeigen die Authentisierungsmethode
- korrektes Passwort + fehlerhafter TOTP-/Recovery-/Passkey-Schritt wird als `mfa_after_password_failed` protokolliert
- accountweiter Throttle erzeugt `login_throttled`
- Sicherheitsmails für erfolgreiche Logins und starke Anomalie-Signale sind bei aktivem Mail-Relay möglich
- identische Warnung wird höchstens einmal pro sechs Stunden per Mail versendet
- Account-Oberfläche zeigt die letzte erfolgreiche Anmeldung und die Zahl starker MFA-Anomalie-Signale der letzten 30 Tage

## Datenschutz

Dieser Pass führt ausdrücklich keine dauerhafte IP-Historie, Geolocation, User-Agent-Historie, Browser-Fingerprints oder "Trusted Device"-Profile ein. Dadurch ist die Risikobewertung absichtlich konservativer als bei großen Identity-Plattformen, aber transparenter und datensparsamer.

## Testgrenzen

Der Pass enthält statische/gezielte Regressionstests. Keine große Acceptance-, Last-, Credential-Stuffing- oder echte LIVE-Endtest-Suite wurde gestartet.
