# Website Public Resilience & Security Telemetry – Pass 15

**Stand:** 15.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Die öffentliche Website soll auch bei Browser-Sicherheitsverletzungen, unbekannten URLs und internen Fehlern kontrolliert reagieren. Sicherheits-Telemetrie darf dabei nicht zu Besuchertracking werden.

## Umgesetzt

- CSP um `report-to cfs-csp` und `report-uri /api/public/security/csp-report` ergänzt.
- `Reporting-Endpoints` verweist auf den Same-Origin-Endpunkt der kanonischen Domain.
- Der Endpunkt akzeptiert modernes `application/reports+json` und das ältere `application/csp-report`.
- Body-Limit 32 KB und eigenes Rate Limit von 60 Reports pro Minute und Quell-IP im flüchtigen Prozessspeicher.
- Persistiert werden ausschließlich normalisierte, aggregierte Felder: Directive, Block-Klasse, externer Hostname falls vorhanden, bereinigte Route, Statuscode, Anzahl und Zeitstempel.
- Keine rohe IP, kein User-Agent, keine Query-Strings und keine vollständigen tokenartigen Pfadsegmente in der CSP-Tabelle.
- Externe Dokument-Origins werden verworfen; tokenartige Pfadsegmente werden zu `:token` normalisiert.
- Retention 30 Tage, maximal 5.000 aggregierte Muster.
- Admin Control Center zeigt CSP-Telemetrie innerhalb von Support & Sicherheit.
- Jede HTTP-Anfrage erhält eine neue serverseitige `X-Request-ID`; eingehende IDs werden nicht übernommen.
- Unbekannte API-Routen und 500-API-Fehler liefern generische Meldung plus Referenz.
- Öffentliche 404- und 500-Seiten sind eigene `noindex,nofollow,noarchive` Seiten und verweisen auf Startseite bzw. privaten Support.
- Sicherheitsseite und Startseite dokumentieren die Telemetrie transparent als datensparsame Schutzfunktion.

## Tests

- `npm run resilience15:check`: **28/28 PASS**
- `npm run project:check`: **24/24 PASS**
- `npm run check:v42`: **PASS**
- `npm run check:post-v42`: **PASS**
- `npm run check:acceptance-part2`: **PASS**

## Externe Gates

Unverändert offen:

1. Root- und Launcher-`package-lock.json` fehlen weiterhin.
2. `cfs-zockt.de` und `www.cfs-zockt.de` sind aus der Prüfumgebung nicht öffentlich per DNS auflösbar; TLS/Redirect/Live-Header bleiben dadurch unverifiziert.

Der Pass verändert Backend- oder Launcher-Version nicht.
