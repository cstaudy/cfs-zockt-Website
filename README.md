# cfs_zockt — Creator Suite v152

Aktiver Schwerpunkt: **konsolidierte Private-Beta Legal-/Privacy-Härtung auf dem v151-Code-Stand**. Das Paket enthält den kompletten kumulativen v151-Updatebestand plus die neuesten Legal-/Privacy-Dateien jeweils nur einmal.

- Backend: **3.18.3**
- Schema Generation: **72**
- Launcher: **0.47.24**
- Admin-Zuordnung: **nur `CFS_ADMIN_EMAILS`**
- Geschlossene Provider-Beta: **TikTok + Twitch**
- Kommerzieller Modus: **standardmäßig aus (`CFS_COMMERCIAL_MODE=false`)**
- Legal/Privacy Gate: `npm run legalbeta:check`
- Release Gate: `npm run release:v152`

Registrierung dokumentiert Nutzungsbedingungen, Datenschutzhinweis, Beta-Hinweis und 18+-Bestätigung. Bezahlte Checkouts bleiben in der privaten Beta serverseitig deaktiviert.

Siehe `TECHNIK-v152.md`, `CREATOR-SUITE-COMPLETION-v152.md`, `SECURITY-BASELINE-v152.md` und `LEGAL-PRIVACY-PRIVATE-BETA.md`.

---

# cfs_zockt — Creator Suite v151

Aktiver Schwerpunkt: **geschlossene TikTok-/Twitch-Provider-Beta mit E-Mail-only Admin Control**. Der eigene cfs_zockt Admin-Account darf Provider und Widgets direkt testen; andere registrierte Creator warten zunächst auf eine explizite Beta-Freigabe.

- Backend: **3.18.2**
- Schema Generation: **72**
- Launcher: **0.47.24**
- Admin-Zuordnung: **nur `CFS_ADMIN_EMAILS`**
- Geschlossene Provider-Beta: **TikTok + Twitch**
- Provider Beta Gate: `npm run provider-beta151:check` → **20/20 PASS**
- Release Gate: `npm run release:v151` → **PASS**

Neue Creator werden automatisch als Beta `pending` geführt. Nach frischer Admin-Passwortbestätigung kann im Admin Control **TIKTOK + TWITCH BETA FREIGEBEN** gewählt werden. Bis dahin blockiert das Backend OAuth, Sync, Launcher-Handoff und providergebundene Widget-Runtime; reine UI-Manipulation kann die Sperre nicht umgehen.

YouTube bleibt in diesem Block unverändert und gehört nicht zur geschlossenen v151-Provider-Beta. Reale Provider-/Windows-/OBS-/Soak-Tests folgen weiterhin gesammelt nach Abschluss der Feature-Blöcke.

Siehe `TECHNIK-v151.md`, `CREATOR-SUITE-COMPLETION-v151.md` und `SECURITY-BASELINE-v151.md`.

---

# cfs_zockt — Creator Suite v150

Historischer Schwerpunkt: Website Hardening und belastbare aktive Testkette.

- Backend: **3.18.1**
- Schema Generation: **72**
- Launcher: **0.47.23**
- Website Hardening Gate: `npm run website150:check`
- Aktiver Projekt-Regressionstest: `npm run project:check`
- Release Gate: `npm run release:v150`

Siehe `TECHNIK-v150.md`, `CREATOR-SUITE-COMPLETION-v150.md` und `SECURITY-BASELINE-v150.md`.

# cfs_zockt — Creator Suite v149

Aktiver Integrationsstand: TikTok, Twitch, YouTube und OBS sind code-seitig als getrennte Creator-Provider/Integrationen vorhanden. **YouTube v149** ergänzt OAuth mit Offline-Refresh, verschlüsselte Tokens, Kanalzuordnung, LIVE-/Live-Chat-Runtime, Mitgliedschafts-/Super-Chat-Events und einen strikt YouTube-spezifischen Widget-Katalog.

Der YouTube-Block fordert nur `youtube.readonly`. Stream-/Broadcast-Management und echte Multistream-Ziele folgen als eigener nächster Feature-Block. Reale Provider-, Windows-, OBS-, Reconnect- und Soak-Abnahmen werden erst nach dem Feature-Freeze gebündelt durchgeführt; `production_ready` bleibt bis dahin bewusst `false`.

- Backend: **3.18.0**
- Schema Generation: **72**
- Launcher: **0.47.23**
- YouTube Integration Gate: `npm run youtube149:check`
- Creator Suite Aggregate: `npm run creator-suite149:check`
- Release Gate: `npm run release:v149`

Siehe `TECHNIK-v149.md` und `CREATOR-SUITE-COMPLETION-v149.md`.

---

# cfs_zockt — Creator Suite v148

## Aktueller Integrationsstand

Twitch ist code-seitig bis zur realen Provider-Acceptance vorbereitet: creator-spezifischer OAuth-/Token-Lifecycle, EventSub für LIVE/Offline, Follow, Subs/Gift-Subs, Cheer/Bits und Chat, providerreine Widgets, Remote-Reconciliation, Revocation-Handling, initialer LIVE-State-Sync und periodischer Self-Heal.

`production_ready` bleibt bewusst false, bis reale Twitch-Accounts, echte LIVE-Events, OBS/Windows und Soak-Tests bestanden sind. YouTube wird in v148 noch nicht funktional erweitert.

Siehe `TECHNIK-v148.md` und `CREATOR-SUITE-COMPLETION-v148.md`.

---

# cfs_zockt Creator Suite

Aktueller kumulativer Projektstand der cfs_zockt Website, Creator Suite und des Windows Launchers.

## Aktuelle Versionen

- Backend: **3.17.0**
- Schema: **71**
- Launcher: **0.47.22**
- Automatisierte lokale Release-/Regression-/Security-Gates: **bestanden**
- Externe Production-/Windows-/OBS-/echte LIVE-/Multi-Creator-Gates: **noch offen**

## Provider Widgets + Twitch Chat v146

- TikTok verbunden → TikTok-Widget-Katalog.
- Twitch verbunden → Twitch-Widget-Katalog.
- Beide verbunden → beide Provider-Bereiche.
- Kein Provider verbunden → nur providerunabhängige OBS-/allgemeine Widgets.
- Launcher öffnet `TIKTOK WIDGETS` bzw. `TWITCH WIDGETS` direkt im passenden gefilterten Studio-Bereich.
- Server erzwingt dieselbe Provider-Zuordnung auch bei direkten API-Requests.
- Twitch EventSub speist LIVE-/Follow-/Sub-/Cheer- und Chat-Widgets; echte Provider-Abnahme bleibt erforderlich.
- Multi-Chat führt aktuelle TikTok- und Twitch-Session-Events providergekennzeichnet zusammen.

## Stream-Ready Creator Flow v142

Launcher **0.47.19** schließt zwei konkrete UX-Lücken im Erstnutzer-Flow: Das Dashboard prüft jetzt Account, TikTok, Launcher, OBS WebSocket und ein veröffentlichtes Widget als gemeinsamen **STREAM STARTCHECK**. Im Widget Studio kann ein veröffentlichtes Widget anschließend per **IN AKTUELLE OBS-SZENE EINFÜGEN** direkt als OBS Browser Source angelegt bzw. aktualisiert werden.

Die private Widget-Source-URL wird dabei nicht in der Cloud-Action-Queue gespeichert. Der authentifizierte Launcher löst sie aus der Creator-Bibliothek auf und übergibt sie lokal an OBS. OBS-Credentials bleiben weiterhin ausschließlich lokal. Reale Windows-/OBS-/TikTok-Acceptance bleibt offen. Details: `TECHNIK-v142.md` und `CREATOR-SUITE-COMPLETION-v142.md`.


## Creator Suite Integration Pass v141

Launcher **0.47.18** ergänzt den geplanten OBS-WebSocket-Integrationspunkt: lokale verschlüsselte OBS-Credentials, kontrollierter Reconnect, Szenen lesen/wechseln und Browser-Source-URLs aktualisieren. Der Launcher begrenzt OBS-Kommandos auf eine feste Allowlist; reale Windows-/OBS-Abnahme bleibt offen.

TikTok LIVE besitzt zusätzliche Health-/Reconnect-Sichtbarkeit. Twitch und YouTube sind in v141 ausschließlich als OAuth-/Token-**Foundation** vorbereitet und werden nicht als fertig verbunden dargestellt. Details: `TECHNIK-v141.md` und `CREATOR-SUITE-COMPLETION-v141.md`.


## CUT Reference Learning Foundation v47

CUT Studio besitzt jetzt eine provider-neutrale, spielunabhängige Reference-Learning-Basis. DBD ist nur noch ein Profil neben FPS/Shooter, Battle Royale, Sports/Racing, Sandbox/Survival und Generic. Bis zu acht öffentliche YouTube-Referenzen können pro Projekt gespeichert werden; `pending`-Referenzen bleiben neutral. Nur sanitierte Analyseergebnisse dürfen kleine Editing-Boosts liefern, und semantische Events müssen immer aus dem eigenen Clip stammen. Siehe `CUT_REFERENCE_LEARNING_V47.md`.

## CFS Stream Studio Completion v46

Stream Studio ist code-seitig **FEATURE FROZEN / READY_FOR_WINDOWS_OBS_ACCEPTANCE**. Preview/Program, Dual Canvas, Quellen-Routing, Multi-Track Recording, Multistream, Multi-Chat, Live Health/Guard und Recording→Cut bleiben bestehen. v46 ergänzt den sichtbaren Save-State, Navigation-Warnung bei ungespeicherten Änderungen und die klare Regel, dass TAKE nur veröffentlichte Scenes ins Program schaltet.

Reale Windows-Capture-/Audio-, TikTok-LIVE-, OBS-/Browser-Source- und 2h-Soak-Abnahme bleibt extern offen. Siehe `STREAM_STUDIO_COMPLETION_V46.md`.

## Admin Control Center Completion v45

Der Admin-Bereich ist code-seitig eingefroren und klar von den Creator-Werkzeugen getrennt. Production zeigt Launch Gate, Monitoring, Mail-Outbox und Incident-Modus getrennt; manuelle Evidence kann nur serverseitig freigegebene manuelle Typen verwenden. Security Lockdown benötigt neben dem bestehenden Admin-Step-up eine ausdrückliche `SECURITY LOCKDOWN`-Bestätigung und kann optional andere Sessions sowie Launcher-Bridges/Device-Links widerrufen. Siehe `ADMIN_CONTROL_CENTER_V45.md`.

Status: **FEATURE FROZEN / READY_FOR_PRODUCTION_OPERATIONS_ACCEPTANCE**. Reale Incident-/Monitoring-Abnahme bleibt Bestandteil der späteren Production-Gates.

## Launcher Completion v44

Der Launcher ist code-seitig eingefroren und als zentrale lokale Schaltstelle geschärft: Widget Studio, Stream Studio, Cut Studio und Dashboard öffnen aus einer kompakten Startzentrale; Update-Status und nächste Update-Aktion sind dort ebenfalls sichtbar. Externe Creator-Ziele laufen jetzt über eine Main-Process-Allowlist statt frei zusammengesetzter Renderer-URLs. Remote HTTP, fremde Origins und nicht freigegebene Seiten werden blockiert. Siehe `LAUNCHER_COMPLETION_V44.md`.

Status: **FEATURE FROZEN / READY_FOR_WINDOWS_ACCEPTANCE**. Die reale Hardware-Abnahme bleibt R63 und muss das per v42 Release Lock exakt freigegebene Windows-Artefakt verwenden.

## Widget Studio Completion v43

Der vereinbarte Widget-Studio-Funktionsumfang ist code-seitig eingefroren: Overlay-Projekte/Scenes, Ebenen, Snap/Safe Area, 16:9/9:16, Test Center, Restore auf die letzte veröffentlichte Version und rotierbare Output-URLs. TikTok Profil, TikTok LIVE und Launcher Bridge werden getrennt dargestellt; eine Online-Bridge wird nicht als LIVE-Session ausgegeben. Siehe `WIDGET_STUDIO_COMPLETION_V43.md`.

Der Status ist **FEATURE FROZEN / READY_FOR_REAL_WORLD_ACCEPTANCE**. Reale TikTok-LIVE-, OBS- und Windows-/Hardware-Evidence wird erst in der späteren Abnahme erzeugt.

## Acceptance Release Lock v42

Vor der echten R59–R67-Abnahme wird der Release jetzt auf einen explizit verifizierten Git-Branch/Remote/Commit gelockt. Zusätzlich wird genau ein signiertes Windows-Artefakt anhand der CI-Build-Evidence freigegeben. R59–R66 müssen denselben Release-Lock tragen; R63/R64 zusätzlich dasselbe Windows Artifact Approval. Erst R67 darf daraus `LIVE_LAUNCH_PASS` bilden. Siehe `ACCEPTANCE_RELEASE_LOCK_V42.md`.

## Aktueller Schwerpunkt

Der aktuelle Creator-Suite-Ausbau arbeitet die noch offenen Integrationen nacheinander bis zum Feature-Freeze ab: OBS WebSocket ist code-seitig integriert, TikTok LIVE wird real abgenommen, danach folgen Twitch OAuth, YouTube OAuth und die echten Multistream-Ziele. Widget Studio und Launcher Core bleiben feature-frozen; Sicherheit, klare Zustände und bestehende Backend-/Runtime-Verträge haben Vorrang vor zusätzlichem Feature-Ausbau.

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
- eigenes Production-Secret `CFS_ACCOUNT_ELEVATION_SECRET` für sensible Creator-Step-ups

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

### v147 Provider-Sortierung
Widget Studio trennt TikTok-, Twitch- und allgemeine OBS-Widgets jetzt auch in sichtbaren Kategorien/Suchhilfen strikt. Ein serverseitiger Taxonomie-Guard blockiert falsche Provider-Metriken/Eventtypen.
