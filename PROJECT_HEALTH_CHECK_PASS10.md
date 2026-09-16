# cfs_zockt – Gesamtcheck nach Pass 10

Stand: 15.09.2026

## Ergebnis

Der aktuelle kumulative Stand ist für die **kleinen lokalen Regressionen konsistent**. Der neue Sammelrunner `npm run project:check` hat 21/21 Bereiche bestanden.

Zusätzlich bestanden:

- Config Doctor
- GitHub Bootstrap
- Secret-Pattern-Scan: 0 verdächtige Treffer
- keine `.env`-Datei im Paket
- kein `node_modules` im Paket
- Backend-Version 3.12.0 / Launcher 0.42.0 konsistent
- Node-Mindeststand >=22

## Neue Pass-10-Härtung

- Browser-Schreibzugriffe fail-closed bei fehlender Herkunftsevidenz
- cross-site/same-site Fetch-Metadata für geschützte Writes abgewiesen
- sensible API-/Auth-Antworten zentral `no-store, private`
- direkte Backend- und Launcher-Abhängigkeiten exakt gepinnt
- `.npmrc` mit `save-exact=true` und `engine-strict=true`

## Offene Warnungen / noch NICHT als fertig markieren

### 1. Dependency-Lockfiles fehlen

Weder Root noch Launcher besitzen aktuell ein `package-lock.json`. Die direkten Versionen sind zwar exakt gepinnt, aber transitive Abhängigkeiten sind damit noch nicht vollständig reproduzierbar. In dieser Arbeitsumgebung konnte `npm install --package-lock-only` wegen nicht erreichbarer Registry nicht abgeschlossen werden.

Vor Production/Release:

1. in vertrauenswürdiger npm-Registry-Umgebung Lockfiles erzeugen,
2. Änderungen prüfen,
3. Lockfiles committen,
4. Deploy/CI auf `npm ci` umstellen,
5. danach `npm audit --omit=dev` bzw. getrennten Launcher-Audit durchführen.

### 2. Echter Edge-/TLS-Check ist noch offen

`npm run edge:check` konnte `cfs-zockt.de` aus dieser Laufzeit nicht per DNS auflösen (`EAI_AGAIN`). Dadurch sind echter HTTP→HTTPS-Redirect, Zertifikat/TLS und produktive Security-Header **nicht live verifiziert**.

### 3. Mail-Relay ist noch nicht real produktiv verifiziert

Der Recovery-/Verification-Unterbau ist fail-closed vorbereitet. Zustellung, Bounce-/Fehlerfälle und Security-Warnmails müssen mit dem echten Relay getestet werden, bevor verpflichtende E-Mail-Verifizierung aktiviert wird.

### 4. WebAuthn/Passkeys brauchen echten Browser-/Authenticator-Test

Static-/Security-Checks sind sauber, aber reale Ceremony mit produktiver HTTPS-Origin, Plattform-Authenticator und mindestens einem externen Authenticator bleibt offen.

### 5. Große Endtests bleiben bewusst pausiert

Keine große Acceptance-, Last-, Stress-, Windows-Real-World- oder echte LIVE-Endtest-Suite wurde in diesem Pass gestartet.

## Fazit

**Code-/Konfigurationsstand: lokal sauber und konsistent.**

**Release-Ready: noch nicht vollständig**, bis Lockfiles, Live-Edge/TLS, Mail-Relay, reale Passkey-Ceremony und der geplante Technical-Finish-/Acceptance-Block abgeschlossen sind.
