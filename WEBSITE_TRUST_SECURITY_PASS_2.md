# cfs_zockt – Website Trust & Security Pass 2

Stand: 15.09.2026
Backend-Version: 3.12.0 (unverändert)

## Ziel

Die öffentliche Website soll Sicherheit nicht nur behaupten, sondern einen überprüfbaren Vertrauenspfad anbieten: Schutzmaßnahmen nachlesen, Produkt vor Registrierung ansehen und Sicherheits-/Supportprobleme privat melden können.

## Neu umgesetzt

### Privater Support-/Security-Meldeweg

- Neuer POST-Endpunkt: `/api/public/support/report`
- Kategorien: Sicherheit, Account, Datenschutz, Technik, Sonstiges
- Priorität: normal, hoch, kritisch
- Kontakt-E-Mail optional
- Thema max. 140 Zeichen
- Beschreibung max. 4000 Zeichen
- Honeypot gegen einfache Bots
- Same-Origin/Fetch-Metadata-Schutz über `requireTrustedPublicWrite`
- enger In-Memory-Rate-Limiter: max. 5 Meldungen pro Stunde und Verbindung
- zusätzliche DB-basierte Rate-Prüfung für Neustarts/Multi-Instance
- idempotente `submission_hash`-Deduplizierung gegen Doppel-Submits
- keine rohe IP-Adresse im Meldungsdatensatz
- Submitter-Missbrauchsschutz über HMAC-Hash
- separater Salt über `CFS_PUBLIC_SUPPORT_HASH_SALT`

### Admin-Inbox

Im bestehenden Admin Control Center gibt es jetzt `Support & Sicherheit` mit:

- Neu / In Prüfung / Erledigt / Abgewiesen
- Filter nach Kategorie
- Suche in Thema, Beschreibung, Kontakt und Admin-Notiz
- Security-Neu-KPI
- Kritisch-Offen-KPI
- interne Admin-Notiz
- Priorisierung kritischer Meldungen

Es werden keine Support-Texte öffentlich ausgegeben.

### Öffentliche Website

Support-Seite vollständig auf einen echten privaten Meldeweg umgestellt:

- klare Trennung zu öffentlichen Rezensionen
- Warnung, niemals Passwörter, Tokens oder Recovery-Codes zu senden
- keine erfundene Reaktionszeit / kein falsches SLA
- optionaler Kontakt statt Pflicht-E-Mail
- Datenschutzhinweis vor dem Absenden

Die Sicherheitsseite verlinkt direkt auf den privaten Meldeweg.

Die Startseite enthält nun zusätzlich einen überprüfbaren Trust-Pfad:

1. Produkt vor Account ansehen
2. technische Schutzmaßnahmen öffentlich nachlesen
3. Problem privat melden

### Live Edge Checker

Neu: `npm run edge:check`

Der Checker prüft gegen die echte `APP_BASE_URL` bzw. standardmäßig `https://cfs-zockt.de`:

- DNS-Auflösung
- HTTP -> HTTPS Redirect
- permanente Redirect-Codes 301/308
- Redirect auf kanonischen Host
- HTTPS-Erreichbarkeit
- HSTS
- CSP
- `X-Content-Type-Options: nosniff`
- Referrer-Policy
- Permissions-Policy
- TLS-Zertifikatsvertrauen
- Zertifikatsablauf

Aktueller Lauf in dieser Arbeitsumgebung: DNS für `cfs-zockt.de` liefert `EAI_AGAIN`. Deshalb sind Domain, Redirect und Zertifikat weiterhin **nicht als live verifiziert** markiert. Das ist kein Beweis, dass die Domain selbst defekt ist; die aktuelle Laufzeit kann sie nicht auflösen.

## Produktionskonfiguration

Zusätzlich empfohlen:

```env
CFS_PUBLIC_SUPPORT_HASH_SALT=<separates zufälliges Secret>
```

Nicht denselben Wert wie öffentliche API-Schlüssel verwenden und nicht ins Repository committen.

Nach Deployment auf einer Umgebung mit funktionierendem DNS ausführen:

```bash
npm run edge:check
```

oder gegen einen expliziten Host:

```bash
node tools/production-edge-check.mjs https://cfs-zockt.de
```

HSTS `includeSubDomains` und `preload` weiterhin erst aktivieren, wenn alle betroffenen Hosts real geprüft wurden.

## Gezielte Tests

- `npm run check` -> OK
- `npm run trust:check` -> 20/20
- `npm run trust2:check` -> 28/28
- `npm run security:check` -> OK
- `npm run seo:check` -> OK
- `npm run funnel:check` -> OK
- `npm run reviews:check` -> 13/13
- `npm run ux30:check` -> 40/40
- `npm run coreflows:check` -> 22/22

Keine große Acceptance-, Last- oder echte LIVE-Suite gestartet.

## Noch offen

- `npm run edge:check` aus einer echten Produktions-/Admin-Umgebung mit DNS ausführen
- danach HSTS-Subdomain/Preload-Entscheidung treffen
- optional später definierte Security-Response-Prozesse (z. B. interne Eskalationsregel) ergänzen; keine Reaktionszeiten versprechen, bevor sie organisatorisch wirklich eingehalten werden können
