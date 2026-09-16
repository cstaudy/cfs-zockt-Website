# cfs_zockt – aktueller Gesamtstand

**Stand: 16.09.2026**  
**Backend: 3.12.0**  
**Launcher: 0.42.0**

## Priorität

Aktuell haben **Website-Sicherheit, Transparenz und Überzeugungskraft** Vorrang vor zusätzlichen Feature-Blöcken. Bestehende Funktionen sollen stabilisiert und verständlich präsentiert werden, bevor neue große Baustellen geöffnet werden.

## Kumulativ abgeschlossen

1. Website Security Pass
   - CSP / Security Header
   - Host-/HTTPS-Härtung
   - CSRF / Origin / Fetch Metadata
   - Login-/Form-/Review-Missbrauchsschutz
   - sichere Sessions und konservatives HSTS-Vorgehen

2. SEO / Google Pass
   - Canonicals
   - robots.txt / sitemap.xml
   - eindeutige Meta-Daten
   - OpenGraph / Social Preview
   - strukturierte Daten
   - interne Tool-/Runtime-Seiten auf noindex

3. Monetarisierung / TikTok-Funnel
   - `/go/tiktok`, `/go/tiktok/tools`, `/go/tiktok/community`
   - Herkunft bleibt bis zur Registrierung erhalten
   - Affiliate-/Partner-Unterbau standardmäßig deaktiviert
   - keine Fake-Partner, Fake-Preise oder Tracking-Pixel

4. Review-Admin
   - Pending / Approved / Rejected
   - Suche, KPIs, interne Notizen
   - bestehende echte Review-Datenbank statt Demo-Daten

5. Widget Studio 30-Sekunden-UX
   - Goal / Counter / Timer / Chat / Kamera Schnellstarts
   - unnötigen doppelten Vorlagen-Schritt entfernt
   - Anfänger-/Profi-Trennung bleibt erhalten

6. Widget Core Flow
   - manuelle Widgets vom LIVE-Snapshot entkoppelt
   - LIVE-Timer hold-Verhalten korrigiert
   - Chat hold/zero konsistent
   - Publish-/Unpublished-Status korrigiert

7. Launcher Stabilisierung
   - atomare Settings + Backup
   - serialisiertes Action-Polling
   - kontrollierte Output-Crash-Recovery
   - LIVE-Schutz bei verbindungskritischen Einstellungen

8. Website Trust & Security
   - konkrete Schutzmaßnahmen auf der Startseite
   - Sicherheitsseite auf echten Code-Stand gebracht
   - keine 100-%-Sicherheitsversprechen

9. Private Support-/Security-Meldung
   - nicht-öffentliche Meldungen
   - Rate Limit, Honeypot, Deduplizierung, HMAC-Missbrauchsschutz
   - Admin-Inbox mit Priorität, Status und Notiz

10. Website Conviction / Product Proof
    - Startseiten-Text stärker auf realen Nutzen ausgerichtet
    - eigener Bereich „Heute im Produkt“
    - klare Trennung zwischen aktivem Funktionsstand und offenen Grenzen
    - keine erfundenen Nutzerzahlen, Bewertungen, Preise oder Reifeversprechen

11. Website Security & Conviction Pass 3
    - öffentlicher Systemstatus auf minimale Online-/Störungsinformation reduziert
    - operativer Health-Check von unnötigen Infrastrukturdetails bereinigt
    - RFC-9116 `/.well-known/security.txt` ergänzt
    - produktive Session auf `__Host-`-Cookie-Präfix gehärtet
    - TikTok-OAuth-State auf `__Secure-`-Cookie-Präfix gehärtet
    - Production startet ohne Token-, CSRF-, Review-HMAC-, Support-HMAC- oder MFA-Recovery-HMAC-Secret nicht mehr
    - Support-Secret-Erkennung server- und clientseitig erweitert
    - Support-Meldungen liefern eine kurze Referenz zurück


12. Account & Privacy Lifecycle
    - aktive Sessions einzeln verwaltbar
    - passwortgeschützter bereinigter JSON-Datenexport
    - TikTok Self-Service Disconnect
    - Account-Löschung inkl. best-effort Provider-Revoke

13. Account Credential Security
    - Passwortwechsel nach erneuter Prüfung des aktuellen Passworts
    - neue Passwörter mindestens 15 Zeichen, ohne künstliche Zeichenklassen-Pflicht
    - lokale Blockliste für besonders häufige/erwartbare Werte
    - versioniertes scrypt: neue Hashes mit stärkerer V2-Konfiguration
    - bestehende V1-Hashes werden nach erfolgreichem Login automatisch migriert
    - Passwortwechsel widerruft bestehende Sessions und rotiert die aktuelle Sitzung
    - Passwort-Reset per E-Mail bleibt transparent offen, solange kein vertrauenswürdiger Mailversand konfiguriert ist

14. Account E-Mail Verification & Recovery Unterbau
    - kryptografisch zufällige Einmal-Tokens; Datenbank speichert nur SHA-256-Hashes
    - E-Mail-Bestätigung 8 Stunden, Passwort-Recovery 30 Minuten
    - Token im URL-Fragment und nach Seitenstart aus der sichtbaren URL entfernt
    - Recovery widerruft alle bestehenden Login-Sitzungen
    - anti-enumeration Recovery-/Verification-Responses
    - provider-neutraler, HMAC-signierter HTTPS-Mail-Webhook; standardmäßig deaktiviert
    - optionale Pflicht-Verifizierung nur für neue Accounts und nur bei funktionsfähigem Mail-Relay

## Öffentliche Produktgrenzen

Weiterhin nicht als fertig behaupten:

- keine automatische OBS-Steuerung durch das Stream Board
- keine fertige Twitch-Anbindung
- Merch bleibt Planung/Konzept, kein Shop
- keine erfundenen Rezensionen oder Nutzerzahlen
- keine erfundenen Preise
- keine kopierten Game-IP-Assets
- automatisierte Acceptance-/Stress-/OBS-/Release-Simulationen sind bestanden; externe echte LIVE-/Hardware-/Production-Gates bleiben offen

## Aktuelle Teststrategie

Die kleine kumulative Regression bleibt aktiv. Zusätzlich wurden in Pass 11 die vorhandenen automatisierten V42-/Post-V42-/Acceptance-Part-2- und Launcher-Release-Gates vollständig ausgeführt. Diese internen Simulationen ersetzen **nicht** die noch offenen externen Production-/TLS-/Hardware-/echten LIVE-Prüfungen.


15. Account MFA / 2FA
    - optionaler TOTP-Schutz zusätzlich zum Passwort
    - 20-Byte TOTP-Secret, serverseitig mit AES-256-GCM verschlüsselt
    - 6-stellige Codes / 30-Sekunden-Zeitschritt mit ±1 Schritt Toleranz
    - bereits verwendete TOTP-Zeitschritte werden nicht erneut akzeptiert
    - Login erzeugt vor erfolgreichem MFA noch keine Creator-Session
    - kurzlebige HttpOnly-/SameSite=Strict-MFA-Challenge
    - 10 einmalige Recovery-Codes; nur HMAC-Hashes werden persistiert
    - MFA-Aktivierung/Deaktivierung und Code-Neuerzeugung erfordern Re-Authentifizierung
    - andere aktive Sessions werden bei Aktivierung/Deaktivierung beendet
    - TOTP wird transparent nicht als phishing-resistent bezeichnet
16. Account Passkeys / WebAuthn
    - optionale domain-/origin-gebundene WebAuthn-Anmeldung zusätzlich zu TOTP
    - User Verification bei Registrierung und Login erforderlich
    - private Schlüssel verlassen den Authenticator nicht; Server speichert Credential-ID, Public Key, Counter und minimale Metadaten
    - Challenges sind kurzlebig, purpose-gebunden, an Session/MFA-Challenge gebunden und werden pro Verify-Versuch atomar verbraucht
    - erfolgreicher Passkey-Login erzeugt erst nach WebAuthn-Verifikation eine Creator-Session
    - erster Passkey erzeugt Recovery-Codes, falls noch keine TOTP-/Recovery-Fallbacks vorhanden sind
    - Passkey hinzufügen/entfernen erfordert Re-Authentifizierung; andere Sessions werden dabei widerrufen
    - Security-Events für MFA-, Recovery-, Mail- und Passkey-Ereignisse sind serverseitig vollständig freigeschaltet
    - Backend-Runtime-Mindeststand Node.js 22+; Node 20 wird nicht mehr unterstützt


17. Website Public Resilience & Security Telemetry (Pass 15)
    - erzwungene CSP meldet Verstöße über `report-to` + `Reporting-Endpoints` und `report-uri`-Fallback
    - Reports werden datensparsam aggregiert: keine rohe IP, kein User-Agent, keine Query-Strings, tokenartige Pfadsegmente werden normalisiert
    - 30 Tage Retention und maximal 5.000 aggregierte Muster
    - Admin Control Center zeigt CSP-Muster und Häufigkeiten intern
    - jede Anfrage erhält eine serverseitig erzeugte `X-Request-ID`; API-404/500 liefern eine Referenz ohne Stacktrace
    - eigene noindex 404-/500-Seiten halten Besucher im cfs_zockt-Kontext und verweisen auf den privaten Support-Weg
    - kleine kumulative Regression 24/24 sowie V42, Post-V42 und Acceptance Part 2 grün

## Nächste sinnvolle Reihenfolge

1. DNS/Custom-Domain für `cfs-zockt.de` öffentlich auflösbar machen bzw. prüfen
2. danach `npm run edge:check` gegen die echte HTTPS-Domain ausführen und Redirect/TLS/HSTS/CSP/Header real verifizieren
3. Root- und Launcher-`package-lock.json` in einer vertrauenswürdigen npm-Umgebung erzeugen, prüfen und Deployments auf `npm ci` umstellen
4. alle erforderlichen Production-Secrets setzen und Staging/Production fail-closed starten
5. Mail-Relay real testen, falls Verification/Recovery produktiv aktiviert werden sollen
6. Passkey/WebAuthn mit echtem Browser + Plattform-/externem Authenticator auf der realen HTTPS-Domain testen, falls Passkeys produktiv freigeschaltet werden
7. reale Windows-/Installer-/Hardware-/LIVE-Prüfungen entsprechend Release-Scope durchführen
8. finaler Freeze und Production-Go/No-Go


## Account & Privacy Lifecycle Pass (15.09.2026)

- aktive Sessions einzeln verwaltbar
- passwortgeschützter bereinigter JSON-Datenexport
- TikTok Self-Service Disconnect
- Account-Löschung inkl. best-effort Provider-Revoke für accountgebundene TikTok-Autorisierung
- Datenschutz-/Settings-Kommunikation auf realen Funktionsstand gebracht
- zum Zeitpunkt dieses Einzelpasses waren große externe Acceptance-/LIVE-Tests noch pausiert; Pass 11 führt die automatisierten Release-/Acceptance-Gates später vollständig aus


## Account Credential Security Pass (15.09.2026)

- Passwortwechsel verlangt aktive Session + aktuelles Passwort
- nach Passwortwechsel werden alle alten Sessions widerrufen und die aktuelle Session neu ausgegeben
- neue Passwörter mindestens 15 Zeichen; Passphrasen/Leerzeichen erlaubt; keine künstlichen Großbuchstaben-/Zahl-/Sonderzeichen-Regeln
- besonders häufige bzw. accountbezogene Werte werden serverseitig blockiert
- scrypt KDF V2: N=2^15, r=8, p=3, 64 MiB maxmem
- bestehende V1-Hashes werden nach erfolgreichem Login automatisch auf V2 migriert
- Passwort-Reset per Mail bleibt offen und wird nicht durch unsichere manuelle Support-Resets ersetzt
- zum Zeitpunkt dieses Einzelpasses waren große externe Acceptance-/LIVE-Tests noch pausiert; Pass 11 führt die automatisierten Release-/Acceptance-Gates später vollständig aus


## Account E-Mail Verification & Recovery Pass (15.09.2026)

- provider-neutraler, HMAC-signierter HTTPS-Mail-Relay als optionaler Transport
- Verification-/Reset-Tokens werden nur gehasht persistiert und sind einmalig
- Verifizierung: 8 Stunden TTL; Passwort-Recovery: 30 Minuten TTL
- Token-Links verwenden URL-Fragmente; Browser entfernt das Fragment vor API-Aufruf
- Login verrät `pending_email` erst nach korrekter Passwortprüfung
- Passwort-Recovery gibt unabhängig von Account-Existenz dieselbe öffentliche Antwort
- erfolgreicher Reset widerruft alle Sessions und erzwingt normale Neuanmeldung
- neuer Mailtransport ist standardmäßig deaktiviert; keine erfundene Zustellfähigkeit


## Account MFA / 2FA Pass (15.09.2026)

- TOTP-Unterbau vollständig implementiert und optional im Creator-Account aktivierbar
- MFA-Login über separate 5-Minuten-Challenge; Session erst nach erfolgreichem zweiten Faktor
- Recovery-Codes sind einmalig und werden ausschließlich gehasht gespeichert
- Production benötigt zusätzlich `CFS_MFA_RECOVERY_HASH_SALT`
- keine Behauptung, TOTP sei phishing-resistent; Passkeys/WebAuthn sind ab Pass 8 zusätzlich implementiert


## Account Passkey / WebAuthn Security Pass (15.09.2026)

- optionale Passkeys zusätzlich zu TOTP/Recovery-Codes implementiert
- native Browser-WebAuthn-API; serverseitige Prüfung über `@simplewebauthn/server` 14.0.2
- Registration/Authentication verlangen User Verification und erwartete RP-ID/Origin
- Challenges werden an Creator + Session bzw. MFA-Challenge gebunden und bei jedem Verify-Versuch atomar verbraucht
- Credential Public Key, Counter und minimale Metadaten werden gespeichert; private Schlüssel bleiben ausschließlich beim Authenticator
- Signaturzähler wird nach erfolgreicher Authentisierung aktualisiert
- Security-Event-Allowlist korrigiert: ältere MFA-/Recovery-/Mail-Events und neue Passkey-Events werden jetzt tatsächlich persistiert
- Node.js 22+ ist ab diesem Stand Mindest-Runtime
- echter Browser-/Authenticator-E2E auf der produktiven HTTPS-Domain bleibt offen; keine Behauptung eines realen Hardwaretests

17. Account Login / Anomaly Security
    - persistenter kontoweiter Passwort-Fehlversuchs-Throttle zusätzlich zu IP-/Request-Limits
    - keine IP-, Geolocation-, User-Agent- oder Browser-Fingerprint-Daten in diesem persistenten Throttle
    - temporäre Drossel nach vielen verteilten Fehlversuchen; öffentliche Antwort bleibt generisch
    - erfolgreicher Login setzt den kontoweiten Fehlversuchszähler zurück
    - aktive Sessions zeigen Passwort / TOTP / Recovery-Code / Passkey als Authentisierungsmethode
    - korrektes Passwort + anschließend fehlgeschlagener TOTP-/Recovery-/Passkey-Schritt wird als starkes Sicherheitsereignis gespeichert
    - bei aktivem Account-Mail-Relay werden erfolgreiche Login- und Anomalie-Warnungen mit sechs Stunden Cooldown gebündelt
    - Account zeigt 30-Tage-Signal für fehlgeschlagene zweite Faktoren, ohne Standort- oder Geräteprofil aufzubauen

18. Browser Request Integrity / Supply-Chain Baseline
    - Browser-Schreibzugriffe fail-closed bei fehlender vertrauenswürdiger Origin/Referer bzw. fehlendem `Sec-Fetch-Site: same-origin`
    - cross-site und same-site Fetch-Metadata für schreibende Browser-Endpunkte werden abgewiesen
    - sensible Account-/Creator-/Admin-/Billing-/Launcher-/Bridge-/Auth-Antworten zentral `no-store, private`
    - Cache-Varianz zusätzlich über Cookie und Authorization
    - direkte Backend- und Launcher-Abhängigkeiten auf exakte Versionen gepinnt
    - `.npmrc` erzwingt `save-exact=true` und `engine-strict=true`
    - transitive `package-lock.json` weiterhin offen; vor Release in vertrauenswürdiger npm-Registry-Umgebung erzeugen und `npm ci` verwenden
    - neuer kumulativer kleiner Regression-Runner `npm run project:check`

## Gesamtcheck nach Pass 10

- `npm run project:check`: 21/21 kleine kumulative Bereiche PASS
- Config Doctor: PASS
- GitHub Bootstrap: PASS
- Secret-Pattern-Scan: 0 Treffer
- Paket enthält weder `.env` noch `node_modules`
- Backend 3.12.0 / Launcher 0.42.0 konsistent
- WARN: Root- und Launcher-`package-lock.json` fehlen noch
- WARN: echter Edge-/TLS-Check gegen `cfs-zockt.de` in dieser Laufzeit wegen DNS `EAI_AGAIN` nicht möglich
- damaliger Pass-10-Stand: realer Mail-Relay-/Passkey-/Production-Test offen; die automatisierten Acceptance-/Stress-/OBS-/Release-Gates werden in Pass 11 nachgezogen und bestanden

## Pass 11 – Release Candidate / automatisierter Gesamtstatus

- fehlenden `server-runtime-symbols-v42-test.mjs` wiederhergestellt
- fehlende Post-V42-Regressionstests wiederhergestellt
- fehlenden Post-V42-Bridge-Control-Test wiederhergestellt
- Fake-Bridge an aktuelle Stream-Bot-/Counter-/Timer-Endpunkte angeglichen
- veraltete QA-Annahmen zu Dependency-Pinning und CSP-ausgelagertem JavaScript auf die aktuelle Architektur gezogen
- `npm run release:preflight`: PASS
- V42: PASS
- Post-V42: PASS
- Acceptance Part 2: PASS
- Launcher-/Release-Gate: **98/98 PASS**
- Release-Gate schreibt jetzt fortlaufende Checkpoints

### Ergebnis

**Intern / automatisiert: GO als Release Candidate.**

**Öffentlicher Production-Launch: aktuell NO-GO**, weil externe Release-Gates noch nicht geschlossen sind:

1. `cfs-zockt.de` ließ sich aus der aktuellen Prüfumgebung nicht per DNS auflösen; echter TLS-/Redirect-/Header-Check ist deshalb nicht abgeschlossen.
2. Root und Launcher besitzen noch kein `package-lock.json`; die transitive Dependency-Kette ist daher trotz exakter direkter Pins noch nicht vollständig reproduzierbar.
3. Mail-Relay, reale Passkey-Ceremony und reale Windows-/Hardware-/LIVE-Prüfungen bleiben je nach aktivierter Release-Funktion praktische externe Gates.

Die zuvor fehlenden alten automatisierten Tests sind dagegen **nicht mehr** als offener Punkt zu führen.

## Production Finalization Pass 12

Neu vorbereitet:

- `npm run production:gate` als fail-closed finales GO/NO-GO
- `npm run lockfiles:generate` und `npm run lockfiles:check`
- GitHub Action `Generate Dependency Lockfiles` für vertrauenswürdige Registry-Umgebung
- Production-/Launcher-Deploy-Workflows verwenden nach Commit der Lockfiles `npm ci`
- erweiterter Edge-Check für Root + `www`, TLS, Security Header, security.txt, robots.txt und sitemap.xml
- `PRODUCTION_GO_LIVE_RUNBOOK.md` mit exakter Deploy-Reihenfolge

Aktueller externer Status: `cfs-zockt.de` ist aus der aktuellen Prüfumgebung weiterhin nicht öffentlich per DNS auflösbar. Root- und Launcher-Lockfiles konnten wegen fehlender Registry-Erreichbarkeit in dieser Umgebung nicht erzeugt werden. Damit bleibt `production:gate` absichtlich **NO-GO**, bis beide externen Gates geschlossen sind.
### Pass-12-Nachweis

- `npm run finalization12:check`: **17/17 PASS**
- `npm run release:preflight`: **PASS** nach den neuen Workflow-/Gate-Änderungen
- `npm run production:external-gate`: **NO-GO** wie beabsichtigt
  - Backend Lockfile fehlt
  - Launcher Lockfile fehlt
  - Canonical DNS nicht auflösbar
  - `www` DNS nicht auflösbar
  - dadurch TLS/Redirect/live Header noch nicht verifizierbar
- Production-Deploy akzeptiert nur noch `https://cfs-zockt.de` als `CFS_PRODUCTION_URL` und führt nach dem Canary den External Gate aus.


## Pass 12 – Production Finalization

- Production-/Launcher-Deployments verwenden nach vorhandenen Lockfiles `npm ci`
- `production:external-gate` trennt externe Lockfile-/DNS-/TLS-Gates vom internen Release-Preflight
- Production-Workflow akzeptiert ausschließlich `https://cfs-zockt.de`
- Dependency-Lockfile-Workflow erzeugt Root-/Launcher-Lockfiles in einer echten npm-Registry-Umgebung
- interner Release Candidate bleibt grün; externer Production-Launch bleibt bis Lockfiles + Domain/DNS/TLS NO-GO

## Pass 13 – Production Deployment Readiness

- sichere Render-Blueprint-Vorlage `render.blueprint.example.yaml` ergänzt
- Blueprint hält Auto-Deploy bewusst aus und verwendet `npm ci`
- `/api/health` als Render-HTTP-Healthcheck hinterlegt
- kanonische Domain / OAuth-Callback / WebAuthn-RP-ID in der Vorlage konsistent
- externe Zugangsdaten nicht im Repository; interne Security-Secrets können einmalig von Render generiert werden
- neuer redigierter `npm run deployment:doctor`
- neuer struktureller `npm run deployment13:check` mit 22/22 Checks
- kumulativer `project:check` enthält Pass 13
- Quality-/Production-Workflows prüfen die Deployment-Struktur vor weiteren Gates

### Aktueller Production-Status

- interner Code-/QA-/Deployment-Strukturstand: **GO – Release Candidate**
- öffentlicher Production-Launch: **NO-GO**
- offener Blocker 1: `package-lock.json` und `launcher/package-lock.json` fehlen weiterhin
- offener Blocker 2: `cfs-zockt.de` / `www.cfs-zockt.de` sind aus der Prüfumgebung weiterhin nicht öffentlich per DNS auflösbar; TLS/Redirect/live Header daher nicht real verifiziert

## Pass 14 – Website Conviction / Account Start

- Creator-Suite-Vorschau klar als **Beispielansicht** gekennzeichnet; Demo-Werte werden ausdrücklich nicht als Live-, Nutzer- oder Erfolgsstatistiken dargestellt
- veraltete öffentliche Aussage zu noch offenen automatisierten Acceptance-Tests entfernt; Startseite unterscheidet jetzt zwischen grünem internem Release-Stand und separaten externen Go-Live-Gates
- neuer öffentlicher Vertrauensblock vor der Registrierung: **FREE Plan**, keine Zahlungsdaten beim Anlegen des Accounts und keine automatische kostenpflichtige Buchung
- Account-Schutz vor der Registrierung verständlich erklärt: lange Passphrasen, optionales TOTP, Recovery-Codes und Passkeys
- Datenkontrolle sichtbar gemacht: Sessions, Datenexport und geschützte Kontolöschung
- Login-/Registrierungsseite wiederholt die wichtigsten Startbedingungen direkt am Formular
- keine erfundenen Nutzerzahlen, Erfolgsquoten, Live-Werte oder Sicherheitsgarantien ergänzt
- neuer Regressionstest `npm run conviction14:check`; kumulativer `project:check` enthält Pass 14

### Öffentliche Aussage zum Release-Stand

Die Website darf ab diesem Stand sagen, dass die **automatisierten internen Release-Prüfungen grün** sind. Sie darf weiterhin **nicht** behaupten, der öffentliche Production-Go-Live sei abgeschlossen: DNS/TLS, Lockfiles und die jeweiligen echten Browser-/Hardware-/LIVE-Gates bleiben davon getrennt.


18. Admin Privileged Action Security (Pass 16)
    - privilegierte `/api/admin/*`-Schreibaktionen benötigen zusätzlich zur Admin-Session eine frische Passwortbestätigung
    - Step-up-Ticket 10 Minuten gültig und an die aktuelle Session gebunden
    - `__Host-cfs_admin_elevation` in Production mit HttpOnly, Secure und SameSite=Strict
    - Admin-Step-up rate-limited; Fehlversuche und erfolgreiche Freigaben erscheinen in der Account-Sicherheitsaktivität
    - minimale Admin-Auditspur für privilegierte Schreibaktionen, 180 Tage Retention
    - Audit speichert keine Request-Bodies, rohe IP-Adressen oder User-Agents
    - Admin Control Center zeigt Sperrstatus und Audit intern an
    - eigenes Production-Secret `CFS_ADMIN_ELEVATION_SECRET`; fehlt es, startet Production fail-closed nicht
    - Pass-16-Test 40/40; kleine kumulative Regression 25/25

## Aktuelle nächste externe Gates

1. Root- und Launcher-`package-lock.json` in vertrauenswürdiger npm-Umgebung erzeugen und committen
2. DNS für `cfs-zockt.de` / `www.cfs-zockt.de` öffentlich aktivieren
3. `npm run production:external-gate` und `npm run edge:check` gegen die echte HTTPS-Domain erfolgreich ausführen
4. alle Production-Secrets inkl. `CFS_ADMIN_ELEVATION_SECRET` und `CFS_ADMIN_AUDIT_HMAC_SECRET` setzen
5. echten Datenbank-Recovery-Drill durchführen: Backup verifizieren, in separate leere DB restaurieren, Anwendung prüfen und `npm run recovery:doctor` grün bekommen
6. danach reale Mail-/Passkey-/Windows-/Hardware-/LIVE-Prüfungen je nach aktivem Release-Scope


## Pass 17 – Admin Audit Integrity / Forensik

- separate HMAC-Kette für neue privilegierte Admin-Audit-Einträge
- eigenes Production-Secret `CFS_ADMIN_AUDIT_HMAC_SECRET`; kein Secret-Reuse mit Admin-Step-up
- Audit-Kette bindet Vorgänger-Hash, Admin-ID, Methode, Route, Ergebnis, Statuscode, Request-ID und Zeit
- transaktionaler PostgreSQL-Advisory-Lock verhindert parallele Forks der Kette
- Retention-Checkpoint hält die Verkettung über die 180-Tage-Bereinigung hinweg nachvollziehbar
- bestehende Auditzeilen werden nicht rückwirkend signiert, sondern transparent als `LEGACY` geführt
- Admin-Control-Center zeigt Integritätsstatus und Hash-Kurzreferenzen
- step-up-geschützter JSON-Forensik-Export mit Integritäts-Snapshot
- keine Request-Bodies, rohen IPs oder User-Agents im Audit
- `admin_audit_exported` erscheint als Account-Sicherheitsereignis
- Pass-17-Test: **44/44 PASS**
- kleine kumulative Regression: **26/26 PASS**

### Aktuelle Production-Secrets

Zusätzlich zu den bisherigen Secrets muss `CFS_ADMIN_AUDIT_HMAC_SECRET` gesetzt und über Deployments hinweg stabil gehalten werden. Eine ungeplante Rotation macht die bis dahin erzeugte HMAC-Kette erwartungsgemäß nicht mehr verifizierbar.

### Externe Gates

Unverändert offen bleiben die externen Release-Klassen: Root-/Launcher-Lockfiles sowie öffentlich funktionierendes DNS/TLS für `cfs-zockt.de`.


## Pass 18 – Database Backup & Recovery Security

- Production-Recovery-Policy als `ops/database-recovery-policy.json`
- Provider-PITR ist der bevorzugte Recovery-Weg; logische Exporte ergänzen ihn für Migrationen/Langzeit-/Offsite-Sicherung
- neues verschlüsseltes PostgreSQL-Custom-Format-Backup mit AES-256-GCM
- scrypt + HKDF trennt Verschlüsselungs- und Manifest-HMAC-Schlüssel
- SHA-256 über Klartext und Ciphertext sowie HMAC-SHA-256 über das Manifest
- Datenbank-Credentials werden nicht im Backup-Manifest gespeichert
- temporäre Klartext-Dumps werden nach Abschluss/Fehler entfernt
- `dbbackup:verify` prüft Kryptografie und `pg_restore --list`
- Restore ist standardmäßig dry-run und verweigert Primär-/Quelldatenbank sowie nicht-leere Ziele
- echter Restore braucht `--execute` + `CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE`
- erfolgreicher Restore schreibt lokale Recovery-Evidence für den regelmäßigen Restore-Drill
- neuer `recovery:doctor` prüft Policy, PostgreSQL-Tools, Backup-Key und Alter der letzten Restore-Evidence
- Pass-18-Test: **52/52 PASS** (46 strukturell + 6 echte Crypto-Roundtrip-/Tamper-Checks)

### Zusätzliche Production-Readiness

Neben Lockfiles und DNS/TLS gehört vor dem öffentlichen Go-Live jetzt auch ein **realer Restore-Drill** zur Operations-Checkliste. In dieser Entwicklungsumgebung sind keine PostgreSQL-Clienttools bzw. keine echte Production-Datenbank verfügbar; daher wird kein echter Dump/Restore als bestanden behauptet.

## Pass 19 – Application Recovery / Rollback

- versionierte Application-Recovery-Policy unter `ops/application-recovery-policy.json`
- Datenbank-Recovery (Pass 18) und App-Rollback strikt getrennt
- Release-State-Snapshot mit Git-SHA, Versionsstand und Hashes kritischer Dateien; keine Secret-Werte im Snapshot
- manueller GitHub-Workflow `Production Application Recovery` mit expliziter Bestätigungsphrase und Ziel-Commit
- Recovery-Ziel wird mit committed Lockfiles, `npm ci` und vollständigem Release-Preflight validiert
- bekannter guter Commit kann kontrolliert per Render Deploy Hook `ref=<commit>` redeployed werden
- nach Recovery sind Canary und kompletter Edge-/DNS-/TLS-Check Pflicht
- Recovery-Evidence wird nur nach beiden erfolgreichen Gates erzeugt
- neuer `apprecovery:doctor` bewertet Lockfiles, Production-Ziel, Deploy-Hook und Alter der letzten Recovery-Evidence
- kein Application-Rollback darf automatisch einen Datenbank-Restore ausführen
- Pass-19-Test: **52/52 PASS** (46 strukturelle Recovery-Checks + 6 echte Evidence-Fail-closed-Checks)

### Zusätzlicher Operations-Gate vor Go-Live

Neben Lockfiles, DNS/TLS und realem Datenbank-Restore-Drill muss ein Application-Recovery-Drill mit bekanntem gutem Commit und frischer Evidence durchgeführt werden.


## Pass 20 – Incident Response / Website Write-Freeze (16.09.2026)

- vier Betriebsmodi: `normal`, `degraded`, `maintenance`, `security_lockdown`
- öffentliche Statusanzeige kann sachliche Incident-Meldung zeigen, ohne Infrastrukturdetails preiszugeben
- `maintenance` und `security_lockdown` pausieren zentrale Account-/Creator-/Review-/Billing-Schreibwege fail-closed mit HTTP 503 + `Retry-After`
- Admin, Health, privater Security-Support, CSP-Reporting und Stripe-Webhook bleiben erreichbar
- Security Lockdown kann optional alle anderen Login-Sitzungen widerrufen; die steuernde Admin-Session bleibt erhalten
- Statusänderungen benötigen Admin-Step-up und werden durch das bestehende HMAC-verkettete Admin-Audit erfasst
- keine Geolocation, rohe IP-Historie, User-Agent-Historie oder Browser-Fingerprints für den Incident-Unterbau
- `npm run incident20:check`: **41/41 PASS**
- `npm run project:check`: **29/29 PASS**
- V42, Post-V42 und Acceptance Part 2: **PASS**

### Zusätzliches reales Operations-Gate

Vor dem öffentlichen Go-Live den Incident-Modus einmal praktisch in einer sicheren Umgebung durchspielen (`degraded → maintenance → security_lockdown → normal`) und Write-Freeze, Support/Admin-Erreichbarkeit sowie optionalen Session-Widerruf nachweisen.

## Pass 21 – GitHub Repository Bootstrap

Aktives öffentliches Source-Repository ist `cstaudy/cfs-zockt-Website`.

Pass 21 bereitet den ersten sauberen Push des kumulativen Projekts vor:

- aktueller Repository-Slug und HTTPS-Remote dokumentiert
- `.github/SECURITY.md` für private Sicherheitsmeldungen
- PR-Template auf aktuelle Security-/Release-Gates aktualisiert
- historisches V40/V41-GitHub-Setup klar als Historie markiert
- Repository-Readiness-Check mit Large-File-/Artefakt-/Gitignore-/Workflow-Prüfung
- Initial-Push-Plan als lokaler Generator
- GitHub Actions bleiben auf Node.js 22
- Lockfile-Erzeugung bleibt bewusst ein separater manueller Workflow, bis die npm-Registry erreichbar ist

Nach dem ersten Push sind Quality Gate, Lockfile-Workflow, GitHub Environments und Ruleset die nächsten Repository-Schritte.
