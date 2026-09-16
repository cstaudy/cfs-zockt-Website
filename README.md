# cfs_zockt Creator Suite

Aktueller kumulativer Projektstand der cfs_zockt Website, Creator Suite und des Windows Launchers.

## Aktuelle Versionen

- Backend: **3.12.0**
- Launcher: **0.42.0**
- Automatisierte Release-/Acceptance-/Stress-/OBS-Simulationen: **bestanden**
- Externe Production-/TLS-/Hardware-/echte LIVE-Gates: **noch offen**

## Aktueller Schwerpunkt

Der aktuelle Ausbau priorisiert die **öffentliche Website, Sicherheit, Transparenz und Überzeugungskraft** vor neuen Feature-Baustellen. Die Website soll Besuchern zuerst verständlich zeigen, was cfs_zockt ist, welche Creator-Werkzeuge bereits vorhanden sind, welche Schutzmaßnahmen aktiv sind und welche Bereiche noch Beta bzw. nicht fertig sind.

Bereits kumulativ enthalten:

- Website Security Pass mit CSP, Host-/HTTPS-Härtung, CSRF-/Origin-/Fetch-Metadata-Schutz und Rate Limits
- SEO-/Google-Pass mit Canonicals, robots.txt, sitemap.xml, OpenGraph, Social Preview und strukturierten Daten
- TikTok→Website-Funnel und deaktivierter, transparenter Monetarisierungs-/Affiliate-Unterbau
- öffentliche Review-Moderation im Admin-Bereich
- Widget-Studio 30-Sekunden-UX-Pass
- Core-Flow-Fixes für Goal, Counter, Timer, Chat und Kamera/Overlays
- Launcher-Stabilisierung ohne Versionssprung
- öffentliche Sicherheits-/Trust-Kommunikation
- privater Support-/Security-Meldeweg mit Admin-Inbox
- Produktbeweis-/Überzeugungspass auf der öffentlichen Startseite
- Pass 14: klar gekennzeichnete Produktvorschau sowie FREE-Account-/Registrierungs-Vertrauensblock ohne Zahlungsdaten oder automatische Buchung
- Pass 15: datensparsame CSP-Verstoß-Telemetrie, Request-IDs und eigene noindex 404-/500-Fehlerseiten
- Security & Conviction Pass 3 mit minimalem Public Status, `security.txt`, Host-/Secure-Cookie-Präfixen und fail-closed Production-Secrets
- Pass 20: zentraler Incident-/Wartungsmodus mit transparentem Public Status, kontrolliertem Write-Freeze und optionalem Session-Widerruf
- Pass 21: GitHub-Repository-Readiness für `cstaudy/cfs-zockt-Website` mit Security Policy, aktuellem PR-Gate, Repository-Scan und lokal validiertem Erst-Push-Baum

## Öffentliche Website

Die Startseite stellt cfs_zockt zuerst als Gaming-/Community-Marke vor und führt danach in die Creator Suite. Besucher können die Kernfunktionen vor der Registrierung verstehen. Ein eigener Produktbeweis-Bereich trennt klar zwischen bereits nutzbaren Funktionen und Bereichen, die noch nicht als fertig behauptet werden.

Wichtige öffentliche Seiten:

- `/` – Marke, Community, Creator Suite, Produktbeweis, Sicherheit
- `/pages/security.html` – aktive Schutzmaßnahmen und bewusst offene Punkte
- `/pages/support.html` – privater Meldeweg für Security, Datenschutz, Account und Technik
- `/pages/login.html` – Anmeldung und Registrierung
- `/pages/forgot-password.html` – Recovery-Link anfordern, wenn Mail-Relay aktiv ist
- `/pages/reset-password.html` – neues Passwort über Einmal-Token setzen
- `/pages/verify-email.html` – E-Mail-Bestätigung / neuen Bestätigungslink anfordern

## Sicherheit

Unter anderem vorhanden:

- versioniertes scrypt-Passwort-Hashing mit individuellem Salt; neue Hashes nutzen stärkere Parameter, Legacy-Hashes werden beim erfolgreichen Login migriert
- HttpOnly-/Secure-Session-Cookies in Produktion mit `__Host-`-Präfix
- signierte, sessiongebundene CSRF-Tokens
- Origin-/Referer- und Fetch-Metadata-Prüfung
- Content-Security-Policy und weitere Security Header
- CSP-Verstoßberichte über Same-Origin-Endpoint; nur aggregierte Muster ohne rohe IP/User-Agent/Query-Strings, intern im Admin sichtbar
- serverseitig erzeugte Request-IDs sowie eigene noindex 404-/500-Fehlerseiten ohne Stacktrace-Leaks
- Host-/HTTPS-Härtung
- Login-/Registrierungs-/Review-/Support-Rate-Limits
- persistenter kontoweiter Passwort-Fehlversuchs-Throttle in PostgreSQL, ohne IP-/Browser-Fingerprint-Speicherung
- gebündelte Login-/MFA-Anomalie-Warnungen bei aktivem Account-Mail-Relay
- HMAC-basierter Missbrauchsschutz ohne rohe IP im Review-/Support-Datensatz
- private Support-/Security-Inbox im Admin-Bereich
- sicherer Passwortwechsel nach Re-Authentifizierung; bestehende Sessions werden dabei widerrufen
- neue Passwörter: mindestens 15 Zeichen, keine künstlichen Komplexitätsregeln, serverseitige Blockliste für besonders vorhersehbare Werte
- standardisierter `/.well-known/security.txt` Meldeweg
- öffentlicher Status ohne Backend-/OAuth-/Moduldetails
- Production startet ohne getrennte Token-/CSRF-/Review-/Support-/MFA-Recovery-/Admin-Step-up-Secrets nicht
- E-Mail-Verifizierung/Recovery mit zufälligen, gehasht gespeicherten Einmal-Tokens und HMAC-signiertem HTTPS-Mail-Relay-Unterbau
- optionale Passkeys/WebAuthn mit domain-/origin-gebundener Public-Key-Anmeldung, User Verification, Signaturzähler und Einmal-Challenges
- optionaler TOTP-Zwei-Faktor-Schutz mit verschlüsseltem Shared Secret, Replay-Schutz und gehashten Einmal-Recovery-Codes

Ein echter TLS-/Zertifikats-/Edge-Check gegen die produktive Domain bleibt separat real auszuführen:

```bash
npm run edge:check
```

## Kleine kumulative Prüfungen

```bash
npm run check
npm run security:check
npm run seo:check
npm run funnel:check
npm run reviews:check
npm run ux30:check
npm run coreflows:check
npm run trust:check
npm run trust2:check
npm run conviction:check
npm run security3:check
npm run lifecycle:check
npm run credential:check
npm run mailrecovery:check
npm run mfa:check
npm run passkey:check
npm run anomaly:check
npm run conviction14:check
npm run resilience15:check
npm run incident20:check
```

Die historischen Milestone-/Release-Dokumente bleiben im Repository erhalten. Für den **aktuellen** Arbeitsstand ist `PROJECT_CURRENT_STATE.md` maßgeblich.


### Aktuelle Account-/Security-Pässe

Siehe `ACCOUNT_PRIVACY_LIFECYCLE_PASS.md` für Session-Verwaltung, Datenexport, TikTok-Trennung und Account-Löschung.

Siehe `ACCOUNT_CREDENTIAL_SECURITY_PASS.md` für Passwortwechsel, 15-Zeichen-Policy, versioniertes scrypt und automatische Legacy-Hash-Migration.

Siehe `ACCOUNT_MFA_SECURITY_PASS.md` für optionales TOTP und Recovery-Codes sowie `ACCOUNT_PASSKEY_SECURITY_PASS.md` für die zusätzliche Passkey/WebAuthn-Stufe.


## Account E-Mail Verification & Recovery (aktueller Stand)

Der sichere Token-/Recovery-Unterbau ist integriert. Ein produktiver Mailversand wird bewusst erst aktiv, wenn `CFS_ACCOUNT_MAIL_MODE=webhook` mit HTTPS-Relay und separatem HMAC-Secret konfiguriert ist. Optional kann danach die E-Mail-Verifizierung für neue Registrierungen mit `CFS_EMAIL_VERIFICATION_REQUIRED=true` erzwungen werden.


## Account MFA / 2FA (Pass 7)

Creator können optional TOTP über eine Authenticator-App aktivieren. Die Anmeldung erzeugt bei aktivem MFA nach erfolgreicher Passwortprüfung zunächst nur eine kurzlebige HttpOnly-MFA-Challenge; eine normale Creator-Session wird erst nach erfolgreichem zweiten Faktor erstellt. Recovery-Codes werden nur einmal angezeigt und nur gehasht gespeichert. TOTP wird ausdrücklich nicht als phishing-resistent dargestellt.


## Account Passkeys / WebAuthn (Pass 8)

Creator können zusätzlich Passkeys registrieren. Die serverseitige WebAuthn-Verifikation nutzt `@simplewebauthn/server` 14.0.2, bindet Challenges an Creator und Session bzw. MFA-Challenge und verlangt User Verification. Der private Schlüssel verbleibt immer beim Authenticator; gespeichert werden nur Credential-ID, öffentlicher Schlüssel, Signaturzähler und minimale Metadaten. TOTP und Recovery-Codes bleiben als optionale Fallback-Schicht erhalten. Für diesen Stand gilt Node.js 22+ als Mindest-Runtime. Ein echter End-to-End-Durchlauf mit realer HTTPS-Domain und Hardware-/Plattform-Authenticator bleibt vor dem Release noch auszuführen.

## Account Login / Anomaly Security (Pass 9)

Der Login kombiniert weiterhin IP-/Request-Limits mit einem zusätzlichen persistenten, kontoweiten Fehlversuchs-Throttle in PostgreSQL. Dieser zweite Zähler speichert bewusst keine IP-Adresse, keinen User-Agent und kein Geräteprofil. Aktive Sitzungen zeigen ihre Authentisierungsmethode. Ein korrektes Passwort mit anschließend fehlgeschlagenem TOTP-, Recovery- oder Passkey-Schritt wird als stärkeres Anomalie-Signal protokolliert; bei aktivem Mail-Relay werden Warnungen zeitlich gebündelt. Erfolgreiche Login-Warnungen werden ebenfalls gebündelt, damit Sicherheitsmails nicht bei jeder kurzen Neuanmeldung gespammt werden.

## Browser Request Integrity & Supply-Chain Baseline (Pass 10)

Browserbasierte Schreibzugriffe arbeiten jetzt fail-closed: Wenn weder eine vertrauenswürdige Origin/Referer noch ein positives `Sec-Fetch-Site: same-origin`-Signal vorhanden ist, wird der Request abgewiesen. Sensible Account-, Creator-, Admin-, Billing-, Launcher-, Bridge- und Auth-Antworten werden zentral mit `Cache-Control: no-store, private` sowie Legacy-No-Cache-Headern versehen.

Direkte Node-Abhängigkeiten in Backend und Launcher sind auf exakte Versionen gepinnt; `.npmrc` erzwingt `save-exact=true` und Node-Engine-Prüfung. Root und Launcher besitzen in diesem Stand **noch kein `package-lock.json`**. Die direkten Versionen sind exakt gepinnt, die transitive Dependency-Kette ist damit aber noch nicht vollständig reproduzierbar. Beide Lockfiles müssen in einer vertrauenswürdigen npm-Registry-Umgebung erzeugt und Deployments danach auf `npm ci` umgestellt werden.

Zusätzliche kleine Checks:

```bash
npm run requestintegrity:check
npm run supply:check
npm run project:check
```

## Release Candidate / automatisierte Release-Gates (Pass 11)

Der interne automatisierte Release-Stand wurde über die bisherigen kleinen Regressionen hinaus geprüft. Fehlende bzw. veraltete historische QA-Gates wurden wiederhergestellt und an die aktuelle CSP-/Dependency-/Bridge-Architektur angepasst, ohne die Produktlogik für einen Test künstlich zu vereinfachen.

Aktueller interner Nachweis:

```bash
npm run release:preflight
npm run release:gate
```

- `release:preflight`: PASS
- `project:check`: 21/21 Bereiche PASS
- `check:v42`: PASS
- `check:post-v42`: PASS
- `check:acceptance-part2`: PASS
- Launcher-/Release-Gate: **98/98 PASS**

Der 98er Gate-Lauf wurde wegen des äußeren Tool-Zeitlimits in reproduzierbaren Segmenten ausgeführt; alle einzelnen Gates wurden tatsächlich ausgeführt und bestanden. Der Gate-Runner schreibt ab diesem Stand außerdem nach jedem Gate Checkpoints, sodass ein äußerer Abbruch den Testfortschritt nicht mehr verwirft.

**Interner Code-/Automationsstatus: GO als Release Candidate.** Ein öffentlicher Production-Launch bleibt vorerst **NO-GO**, bis mindestens die externe Domain/DNS/TLS-Prüfung erfolgreich ist und Root + Launcher reproduzierbare `package-lock.json`-Dateien besitzen. Mail-Relay, reale Passkey-Ceremony und reale Windows-/LIVE-Tests sind je nach aktivierter Release-Funktion zusätzlich praktisch zu prüfen. Siehe `RELEASE_CANDIDATE_PASS11.md`.
## Production Finalization Pass 12

Der interne Release Candidate bleibt grün. Für den öffentlichen Launch gibt es jetzt zwei getrennte Gates:

- `npm run release:preflight` – kompletter interner Code-/QA-Preflight
- `npm run production:external-gate` – Lockfiles + echte DNS/TLS/Edge-Prüfung
- `npm run production:gate` – beide zusammen, fail-closed

Production- und Launcher-Deployments verwenden nach Commit der Lockfiles `npm ci`. Solange Root-/Launcher-Lockfiles fehlen oder die kanonische Domain nicht öffentlich auflösbar ist, bleibt der Production-Status bewusst `NO-GO`. Siehe `PRODUCTION_GO_LIVE_RUNBOOK.md`.



## Website Conviction / Account Start (Pass 14)

Die öffentliche Website trennt Beispielansichten jetzt ausdrücklich von echten Live-/Nutzerstatistiken. Vor der Registrierung wird konkret erklärt, dass neue Creator-Konten im FREE Plan starten, beim Anlegen keine Zahlungsdaten abgefragt werden und die Registrierung keine automatische kostenpflichtige Buchung auslöst. Gleichzeitig werden optionale starke Account-Faktoren sowie Session-, Export- und Löschkontrollen sichtbar gemacht. Die Release-Kommunikation wurde auf den tatsächlichen Stand gezogen: intern automatisiert grün, externe Production-Gates weiterhin separat offen.


## Admin Privileged Action Security · Pass 16

- privilegierte Admin-Schreibaktionen benötigen eine frische Passwortbestätigung
- Step-up-Freigabe gilt 10 Minuten und ist kryptografisch an die aktuelle Creator-Session gebunden
- produktiver Step-up-Cookie ist `__Host-`, `HttpOnly`, `Secure` und `SameSite=Strict`
- fehlende Freigabe liefert fail-closed `428 admin_reauth_required`
- Moderation, Beta-, Creator-, Production- und Release-Schreibaktionen werden zentral geschützt
- minimale Admin-Auditspur speichert nur Admin-ID, HTTP-Methode, Route, Ergebnis, Statuscode, Request-ID und Zeit
- keine Request-Bodies, rohe IPs oder User-Agents im Admin-Audit
- Audit-Retention: 180 Tage
- eigenes Production-Secret `CFS_ADMIN_ELEVATION_SECRET`

Prüfung:

```bash
npm run admin16:check
npm run project:check
```


## Admin Audit Integrity · Pass 17

Neue privilegierte Admin-Schreibaktionen werden zusätzlich zur minimierten Auditspur mit einer separaten HMAC-Kette verknüpft. Die Kette bindet Vorgänger-Hash, Admin-ID, Methode, Route, Ergebnis, Statuscode, Request-ID und Zeitpunkt. Ein Retention-Checkpoint erhält die Verkettung auch über die 180-Tage-Bereinigung hinweg. Bestehende ältere Auditzeilen bleiben bewusst als `LEGACY` unverkettet und werden nicht rückwirkend kryptografisch beglaubigt.

Im Admin Control Center wird die Integrität der aufbewahrten Kette angezeigt. Ein Step-up-geschützter Forensik-Export liefert die minimierten Auditdaten inklusive Hash-Metadaten und Integritäts-Snapshot. Auditdaten enthalten weiterhin keine Request-Bodies, rohe IP-Adressen oder User-Agents.

Production benötigt zusätzlich ein stabiles, eigenständiges Secret:

```env
CFS_ADMIN_AUDIT_HMAC_SECRET=<mindestens 32 zufällige Zeichen>
```

Prüfung:

```bash
npm run admin17:check
npm run project:check
```

## Database Backup & Recovery Security (Pass 18)

Der Production-Stand besitzt jetzt einen eigenen Recovery-Pfad. Provider-PITR bleibt die bevorzugte Wiederherstellung bei Datenverlust; zusätzlich können PostgreSQL-Custom-Format-Dumps mit einem separaten `CFS_BACKUP_ENCRYPTION_KEY` AES-256-GCM-verschlüsselt werden. Manifest-HMAC, Klartext-/Ciphertext-SHA-256 und `pg_restore --list` dienen zur Integritäts- und Formatprüfung.

Ein Restore ist standardmäßig **dry-run** und darf nicht in die laufende `DATABASE_URL` oder die im Backup gespeicherte Quelldatenbank erfolgen. Der echte Restore verlangt eine separate leere Ziel-Datenbank, `--execute` und `CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE`.

```bash
npm run recovery18:check
npm run recovery:doctor
npm run dbbackup:create
npm run dbbackup:verify -- backups/<datei>.cfsbackup
npm run dbrestore:run -- backups/<datei>.cfsbackup --target-url=postgresql://.../cfs_recovery
```

Siehe `DATABASE_BACKUP_RECOVERY_PASS18.md` und `ops/database-recovery-policy.json`.

## Current Recovery Baseline (Pass 19)

Der aktuelle Release Candidate trennt Datenbank-Recovery und Application-Rollback. Vor Production-Deploys kann ein Release-State-Snapshot erzeugt werden; ein manueller Recovery-Workflow validiert einen bekannten guten Commit und verlangt nach dem Redeploy erneut Canary + Edge/TLS-Gates. Ein App-Rollback führt niemals automatisch einen DB-Restore aus.

## GitHub Repository (Pass 21)

Aktives Source-Repository:

`cstaudy/cfs-zockt-Website`

Remote:

`https://github.com/cstaudy/cfs-zockt-Website.git`

Vor dem ersten Push bzw. nach Änderungen an Repository-Metadaten:

```bash
npm run github21:check
npm run github:push-plan
```

Der aktuelle Bootstrap steht in `GITHUB_REPOSITORY_BOOTSTRAP_PASS21.md`. Die älteren V40/V41-GitHub-Dokumente bleiben als historische Milestone-Dokumente erhalten.

Sicherheitsprobleme sollen nicht als öffentliche Issues gepostet werden; siehe `.github/SECURITY.md`.
