# cfs_zockt · Website Trust & Security Conviction Pass

Stand: 15.09.2026

## Ziel

Die öffentliche Website soll nicht nur technisch geschützt sein, sondern diesen Schutz auch glaubwürdig und ohne übertriebene Versprechen vermitteln. Sicherheit und Überzeugungskraft haben Vorrang vor weiterem Feature-Ausbau.

## Umgesetzt

### Startseite

- Sicherheit wurde in der Hauptnavigation vor Merch priorisiert.
- Neuer Bereich `#vertrauen` mit konkreten, bereits im Backend vorhandenen Schutzmaßnahmen.
- Direkte Trust-Signale im Hero:
  - öffentliche Vorschau ohne Account
  - dokumentierte Sicherheitsmaßnahmen
  - keine erfundenen Bewertungen, Preise oder Verfügbarkeiten
- Eigener Hinweis, dass kein seriöser Onlinedienst 100-prozentige Unangreifbarkeit versprechen kann.
- Direkte Links zu Sicherheit, Datenschutz und Support.

### Login / Registrierung

- Veraltete Formulierung „sollte Passwörter niemals im Klartext speichern“ entfernt.
- Tatsächlichen Backend-Stand sichtbar gemacht:
  - scrypt + individuelles Salt
  - Login-/Registrierungs-Rate-Limits
  - Origin-/Fetch-Metadata-/CSRF-Schutz für angemeldete Schreibzugriffe
- Direkte Links zu Sicherheit, Datenschutz und Nutzungsbedingungen.

### Sicherheitsseite

Die Seite wurde vom früheren Plan-/Ausbau-Text auf den tatsächlichen Stand gebracht.

Als aktiv dokumentiert:

- Passwort-Hashing mit scrypt + Salt
- Login-/Registrierungsbegrenzung
- Session-Sicherheit
- CSRF-/Origin-/Fetch-Metadata-Schutz
- CSP und Security Header
- serverseitige Geheimnisse/Tokens
- Review-Missbrauchsschutz

Bewusst nur als teilweise/im Ausbau dokumentiert:

- vollständige Self-Service-Datenkontrolle / Account-Löschung

Damit wird nichts als fertig behauptet, was im Backend noch nicht vollständig vorhanden ist.

## Neuer Regressionstest

`npm run trust:check`

Der Test prüft sowohl die öffentlichen Aussagen als auch konkrete Implementierungsmarker im Backend. Damit sollen Website-Texte nicht erneut vom tatsächlichen Sicherheitsstand wegdriften.

Aktueller Stand:

- Trust/Security: 20/20
- Website Security Pass: OK
- SEO Pass: OK
- Monetarisierung/Funnel Pass: OK
- Review Admin: 13/13
- Widget Studio 30s UX: 40/40
- Widget Core Flows: 22/22
- Backend-Version: 3.12.0

## Bewusst nicht gemacht

- keine neuen Fake-Trust-Badges oder erfundenen Zertifizierungen
- keine Behauptung „100 % sicher"
- kein externer Tracking-Code
- keine erfundenen Nutzer-/Umsatz-/Review-Zahlen
- keine großen Acceptance-, Last- oder LIVE-Tests
- kein Versionssprung

## Nächste sinnvolle Website-Prioritäten

1. echten TLS-/Zertifikats-/Redirect-Check gegen die produktive Domain durchführen
2. Support-/Meldeweg für private Sicherheitsprobleme definieren
3. danach Conversion-/Copy-Pass mit echten Screenshots bzw. realen Produktbelegen statt zusätzlichen Marketingversprechen
4. erst anschließend wieder Stream Board / weitere Produktpolitur priorisieren
