# cfs_zockt – Website Security & Conviction Pass 3

**Stand: 15.09.2026**  
**Backend: 3.12.0**  
**Launcher: 0.42.0**

## Ziel

Die öffentliche Website soll nicht nur Sicherheit behaupten, sondern technisch weniger preisgeben, einen standardisierten Security-Kontakt anbieten und bei fehlenden Produktions-Secrets bewusst **fail-closed** reagieren. Gleichzeitig sollen Besucher nachvollziehbare, überprüfbare Vertrauenssignale sehen.

## Umgesetzt

### 1. Öffentlicher Systemstatus minimiert

Die Startseite verwendet jetzt `/api/public/status` und erhält nur einen knappen Zustand (`online` / `degraded`). Backend-Version, Datenbankstatus, OAuth-Redirect und Modulübersicht werden dort nicht mehr für Besucher ausgeliefert.

Der operative `/api/health`-Endpunkt bleibt für Launcher/Canary erhalten, wurde aber auf die dort benötigten Felder reduziert:

- `ok`
- `service`
- `version`
- `status`
- `database`

### 2. RFC-9116 `security.txt`

Neu vorhanden:

`/.well-known/security.txt`

Enthalten sind:

- HTTPS-Kontakt zum privaten Security-/Support-Formular
- Ablaufdatum
- bevorzugte Sprachen
- Canonical URL
- Link zur öffentlichen Security-Policy

`/security.txt` leitet permanent auf den Well-Known-Pfad um.

### 3. Stärkere Production-Cookies

Produktive Creator-Sessions verwenden jetzt:

`__Host-cfs_creator_session`

mit:

- `Secure`
- `HttpOnly`
- `Path=/`
- kein `Domain`-Attribut

Der TikTok-OAuth-State verwendet in Produktion:

`__Secure-cfs_tiktok_state`

Der frühere Session-Cookie-Name wird bei neuer Anmeldung/Logout bereinigt, aber nicht mehr als gültige Session akzeptiert. Dadurch werden bestehende Browser-Sessions beim Deployment dieses Passes einmalig neu angemeldet werden müssen.

### 4. Production fail-closed

Im Produktivbetrieb sind nun zwingend eigene Secrets erforderlich:

- `CFS_TOKEN_ENCRYPTION_KEY`
- `CFS_CSRF_SIGNING_SECRET`
- `CFS_PUBLIC_REVIEW_HASH_SALT`
- `CFS_PUBLIC_SUPPORT_HASH_SALT`

Fehlt einer dieser Werte, startet das Backend nicht.

Damit gibt es in Production keinen bewusst zugelassenen Plaintext-Token-Fallback und keine Wiederverwendung des Launcher-API-Keys als CSRF-/Review-/Support-HMAC-Schlüssel.

### 5. Support-Secret-Filter erweitert

Vor dem Speichern einer privaten Support-/Security-Meldung werden typische Secret-Muster sowohl im Browser als auch serverseitig erkannt, unter anderem:

- Private-Key-Blöcke
- Bearer Tokens
- Access-/Refresh-Tokens
- API Keys / Client Secrets
- JWT-ähnliche Tokens
- Stripe Secret Keys
- GitHub Tokens
- Discord Webhook URLs

Die Serverprüfung bleibt maßgeblich; die Browserprüfung dient nur als frühe Warnung.

### 6. Referenz nach Support-Meldung

Nach erfolgreicher Speicherung zeigt das Formular eine kurze Referenz aus der Meldungs-ID an. Dadurch kann eine spätere Rückfrage leichter zugeordnet werden, ohne öffentliche Tickets oder erfundene Reaktionszeiten einzuführen.

### 7. Vertrauenskommunikation aktualisiert

Startseite, Sicherheitsseite und Support-Seite erklären jetzt zusätzlich:

- Host-gebundene Session-Cookies
- minimale öffentliche Statusdaten
- standardisierten `security.txt`-Pfad
- Fail-closed Production-Secrets
- Secret-Filter im Support-Weg

## Deployment-Hinweis

Vor einem Production-Deploy dieses Passes müssen die vier oben genannten Security-Secrets gesetzt sein. Besonders `CFS_CSRF_SIGNING_SECRET`, `CFS_PUBLIC_REVIEW_HASH_SALT` und `CFS_PUBLIC_SUPPORT_HASH_SALT` dürfen nicht leer bleiben.

Bestehende eingeloggte Browser werden wegen des neuen `__Host-`-Session-Cookie-Namens einmalig neu anmelden müssen.

## Tests

Gezielt ausgeführt:

- `npm run check`
- `npm run security:check`
- `npm run seo:check`
- `npm run funnel:check`
- `npm run reviews:check` – 13/13
- `npm run ux30:check` – 40/40
- `npm run coreflows:check` – 22/22
- `npm run trust:check` – 20/20
- `npm run trust2:check` – 28/28
- `npm run conviction:check` – 23/23
- `npm run security3:check` – 33/33
- Config Doctor V41 Test
- GitHub Bootstrap V41 Test
- Launcher Stability Test

Große Acceptance-, Last- und echte LIVE-Endtests wurden weiterhin nicht gestartet.

## Weiter offen

- echte Domain/TLS/Redirect-Verifikation mit `npm run edge:check`
- HSTS `includeSubDomains` / Preload erst nach realer Subdomain-Prüfung
- große Technical-Finish-/Acceptance-/LIVE-Tests weiterhin pausiert
