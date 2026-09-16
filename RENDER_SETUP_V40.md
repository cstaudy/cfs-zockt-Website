# CFS Creator Suite V40 — Render Runtime Setup

## Prinzip

GitHub speichert Source, Workflows und Release-Artefakte.

Render betreibt das laufende Backend.

Darum gehören Backend-Runtime-Credentials nach Render.

## Render Environment — vertraulich

Diese Werte nicht committen:

- `DATABASE_URL`
- `TIKTOK_CLIENT_SECRET`
- `CFS_TOKEN_ENCRYPTION_KEY`
- `CFS_CSRF_SIGNING_SECRET`
- `CFS_PUBLIC_REVIEW_HASH_SALT`
- `CFS_PUBLIC_SUPPORT_HASH_SALT`
- `CFS_MFA_RECOVERY_HASH_SALT`
- `CFS_ADMIN_ELEVATION_SECRET`
- `CFS_ADMIN_AUDIT_HMAC_SECRET` – eigener stabiler HMAC-Schlüssel (mind. 32 Zeichen) für die manipulationssichtbare Admin-Audit-Kette
- bei aktiviertem Account-Mail-Relay: `CFS_ACCOUNT_MAIL_WEBHOOK_SECRET`
- `CFS_STRIPE_SECRET_KEY`
- `CFS_STRIPE_WEBHOOK_SECRET`
- optional `CFS_GITHUB_RELEASE_TOKEN`
- optional `CFS_TIKTOK_CONNECT_CODE`

Je nach TikTok-Konfiguration kann auch `TIKTOK_CLIENT_KEY` dort
gespeichert werden, obwohl es nicht dieselbe Geheimhaltungsstufe wie ein
Client Secret hat.

## Render Environment — Konfiguration

Empfohlen:

- Runtime: **Node.js 22 oder neuer** (Node 20 ist EOL und wird vom aktuellen WebAuthn-Unterbau nicht mehr unterstützt)
- `NODE_ENV=production`
- `APP_BASE_URL=https://...`
- optional `CFS_WEBAUTHN_RP_ID=cfs-zockt.de` (ohne Protokoll; standardmäßig Host aus `APP_BASE_URL`)
- `TIKTOK_REDIRECT_URI=https://.../auth/tiktok/callback`
- `CFS_STRIPE_PRICE_CREATOR_MONTHLY=price_...`
- `CFS_STRIPE_PRICE_PRO_MONTHLY=price_...`
- `CFS_BILLING_GRACE_DAYS=3`
- `CFS_ADMIN_CREATOR_IDS=...`
- `CFS_ADMIN_EMAILS=...`
- `CFS_ACCOUNT_MAIL_MODE=disabled` oder `webhook`
- bei `webhook`: `CFS_ACCOUNT_MAIL_WEBHOOK_URL=https://...`
- `CFS_EMAIL_VERIFICATION_REQUIRED=false` bis der Mail-Relay real geprüft ist
- `CFS_LAUNCHER_BUILD_TARGET_VERSION=0.42.0`
- `CFS_RELEASE_EVIDENCE_VERSION=0.42.0`
- `CFS_LAUNCHER_RELEASE_REPO=cstaudy/CFS-TikTok-Backend`

## Legacy Verification Flags

V40 deaktiviert die alten `CFS_*_VERIFIED` Environment-Overrides
standardmäßig.

Nicht mehr als normalen Release-Prozess verwenden:

- `CFS_WINDOWS_BUILD_VERIFIED`
- `CFS_CODE_SIGNING_VERIFIED`
- `CFS_WINDOWS_CLEAN_INSTALL_VERIFIED`
- `CFS_UPDATER_E2E_VERIFIED`
- `CFS_OBS_FIELD_VERIFIED`
- `CFS_TIKTOK_LIVE_FIELD_VERIFIED`
- `CFS_BILLING_LIVE_VERIFIED`
- `CFS_TWO_CREATORS_VERIFIED`
- `CFS_CANARY_VERIFIED`
- `CFS_ROLLBACK_VERIFIED`

V38/V39 hat dafür persistente Evidence und Acceptance.

Nur ein bewusster Migrations-/Notfallpfad kann die Legacy Flags wieder
aktivieren:

`CFS_ALLOW_LEGACY_VERIFICATION_FLAGS=true`

Für normalen Production-Betrieb:

`CFS_ALLOW_LEGACY_VERIFICATION_FLAGS=false`


## Security Fail-Closed ab aktuellem Stand

Im Produktivbetrieb müssen Token-Verschlüsselung, CSRF-Signierung und die getrennten HMAC-Schlüssel für öffentliche Reviews, Support, MFA-Recovery-Codes und Admin-Step-up als eigene Secrets gesetzt sein. Das Backend startet bewusst nicht, wenn einer dieser Werte fehlt. Damit gibt es in Production keinen Plaintext-Token-Fallback und keine Wiederverwendung des Launcher-API-Keys als Hash-/CSRF-Schlüssel.

## GitHub ↔ Render Verbindung

GitHub Environment `production`:

Secret:
- `RENDER_DEPLOY_HOOK_URL`

Variable:
- `CFS_PRODUCTION_URL`

Der Deploy Hook startet den Render Deploy.

Die Website-Secrets selbst bleiben dabei auf Render.

## Production Ablauf V40

1. Source nach GitHub.
2. Quality Gate PASS.
3. V39 Go/No-Go / Real-World-Abnahmen prüfen.
4. Production Deployment Workflow manuell starten.
5. Render Deploy Hook wird ausgelöst.
6. Canary prüft `/api/health`.
7. Evidence im Admin Center hinterlegen.

## Account-Mail / Recovery ab Pass 6

Der Backend-Unterbau für E-Mail-Verifizierung und Passwort-Recovery ist provider-neutral. Das Backend sendet keine SMTP-Credentials selbst, sondern kann einen HTTPS-Mail-Relay ansprechen. Der Request ist über `X-CFS-Mail-Timestamp` und `X-CFS-Mail-Signature` (HMAC-SHA256) signiert.

Für Aktivierung:

- `CFS_ACCOUNT_MAIL_MODE=webhook`
- `CFS_ACCOUNT_MAIL_WEBHOOK_URL=https://...`
- `CFS_ACCOUNT_MAIL_WEBHOOK_SECRET=<eigener Schlüssel mit mindestens 32 Zeichen>`

Erst wenn dieser Transport real geprüft ist, darf optional `CFS_EMAIL_VERIFICATION_REQUIRED=true` gesetzt werden. Die Pflicht gilt für neu registrierte Accounts; bestehende aktive Accounts werden nicht rückwirkend gesperrt.


## MFA / TOTP ab Pass 7

Der optionale Zwei-Faktor-Schutz verwendet TOTP (30 Sekunden, 6 Stellen) plus einmalige Recovery-Codes. Das TOTP-Shared-Secret wird mit `CFS_TOKEN_ENCRYPTION_KEY` verschlüsselt gespeichert. Für Recovery-Codes ist zusätzlich ein eigener HMAC-Schlüssel erforderlich:

- `CFS_MFA_RECOVERY_HASH_SALT=<eigener Schlüssel mit mindestens 32 Zeichen>`
- `CFS_ADMIN_ELEVATION_SECRET=<eigenes Signing-Secret mit mindestens 32 Zeichen>`

Recovery-Codes werden niemals im Klartext persistiert. Der Klartext wird nur einmal unmittelbar nach Aktivierung bzw. Neugenerierung an den angemeldeten Creator zurückgegeben.


## Passkeys / WebAuthn ab Pass 8

Passkeys verwenden `@simplewebauthn/server` und benötigen Node.js 22+. Die RP-ID ist in Production an die kanonische Website-Domain gebunden. Registrierung und Login erzwingen WebAuthn User Verification. Private Schlüssel werden nie im Backend gespeichert; persistiert werden nur Credential-ID, Public Key, Signatur-Counter und minimale Authenticator-Metadaten.

## Pass 13 · Render Blueprint Beispiel

Das Repository enthält jetzt `render.blueprint.example.yaml` als absichtlich **nicht automatisch aktiviertes** Blueprint-Beispiel.

Wichtig vor einer Übernahme in Render:

1. Den `name` im Blueprint auf den tatsächlich bestehenden Render-Service abstimmen. Render sollte denselben Service nicht aus mehreren Blueprints verwalten.
2. Das Beispiel verwendet `autoDeployTrigger: off`, damit Deployments weiter über die bestehenden geprüften GitHub-/Deploy-Hook-Gates laufen.
3. Der Build verwendet `npm ci --omit=dev`; deshalb müssen `package-lock.json` und `launcher/package-lock.json` zuerst erzeugt und committed sein.
4. `DATABASE_URL`, TikTok-Zugang und Launcher-Key bleiben `sync: false`. Unabhängige interne Security-Secrets können von Render einmalig per `generateValue: true` erzeugt werden.
5. Die Custom Domain ist `cfs-zockt.de`; `www` wird auf die kanonische Root-Domain umgeleitet.
6. Der HTTP-Healthcheck bleibt `/api/health` und prüft die PostgreSQL-Verbindung.

Render unterstützt Blueprints über eine YAML-Datei, HTTP-Healthchecks und `sync: false` bzw. `generateValue: true` für Environment-Werte. Das Beispiel ist deshalb als sichere Übernahmevorlage gedacht, nicht als blinder Ein-Klick-Import.

Zusätzlich:

```bash
npm run deployment13:check
npm run deployment:doctor
```

`deployment13:check` prüft die Repository-/Blueprint-Struktur. `deployment:doctor` bewertet Lockfiles und – wenn echte Production-Environment-Variablen vorhanden sind – die Laufzeitkonfiguration, ohne Secret-Werte in Reports auszugeben.
