# cfs_zockt – Website Security Pass

Stand: 15.09.2026

## Umgesetzt

- Content-Security-Policy mit `script-src 'self'` und `script-src-attr 'none'`.
- Inline-JavaScript der betroffenen öffentlichen Seiten in eigene Dateien ausgelagert.
- `frame-ancestors 'self'` und `X-Frame-Options: SAMEORIGIN`, damit eigene Scene-/Widget-Iframes weiter funktionieren.
- Host-Allowlist auf Basis von `APP_BASE_URL`, Render-Hostname und optional `CFS_ALLOWED_HOSTS`.
- Produktions-Fallback für HTTPS: sichere Methoden werden auf HTTPS/canonical umgeleitet; unsichere Methoden werden über Klartext abgewiesen.
- www/non-www-Fallback auf die in `APP_BASE_URL` konfigurierte kanonische Domain.
- Render-Servicedomain bleibt für Operations erreichbar und erhält `X-Robots-Tag: noindex, nofollow, noarchive`.
- HSTS standardmäßig ohne `includeSubDomains`/`preload`. Beide Optionen müssen bewusst über Environment-Variablen aktiviert werden.
- Cookie-authentifizierte Browser-Schreibzugriffe sind zusätzlich über Origin/Referer, Fetch Metadata und einen signierten, sessiongebundenen CSRF-Token geschützt.
- CSRF-Token wird als Secure/SameSite-Strict Host-Cookie ausgegeben und vom gemeinsamen Frontend-API-Helper als `X-CSRF-Token` zurückgesendet.
- TikTok-State-Cookie auf `/auth/tiktok` eingegrenzt.
- Öffentliche Rezensionen: bestehendes In-Memory-Rate-Limit durch DB-gestützten Mehrinstanz-/Restart-Schutz ergänzt; weiterhin keine Klartext-IP in der Datenbank.
- Statischer Security-Test unter `npm run security:check`.

## Produktions-Environment

Empfohlene Werte:

```text
APP_BASE_URL=https://cfs-zockt.de
CFS_ALLOWED_HOSTS=
CFS_HSTS_INCLUDE_SUBDOMAINS=false
CFS_HSTS_PRELOAD=false
CFS_CSRF_SIGNING_SECRET=<separates starkes Secret>
CFS_PUBLIC_REVIEW_HASH_SALT=<separates starkes Secret>
```

Secrets nicht committen. Geeignete Werte können z. B. mit `openssl rand -base64 48` erzeugt werden.

## HSTS Subdomains / Preload

`CFS_HSTS_INCLUDE_SUBDOMAINS=true` erst setzen, wenn wirklich jede verwendete Subdomain dauerhaft HTTPS unterstützt.

`CFS_HSTS_PRELOAD=true` erst danach aktivieren. Der Server verweigert eine Konfiguration, bei der Preload ohne `includeSubDomains` aktiviert wird.

## Render / Domain

Für die Produktion im Render-Dashboard kontrollieren:

1. `cfs-zockt.de` als verifizierte Custom Domain.
2. `www.cfs-zockt.de` bzw. der von Render erzeugte Gegenpart korrekt vorhanden.
3. TLS-Zertifikat für die Custom Domain aktiv und gültig.
4. `APP_BASE_URL=https://cfs-zockt.de` gesetzt.
5. Optional nach erfolgreicher Domain-Stabilisierung die öffentliche `onrender.com`-Servicedomain deaktivieren. Bis dahin wird sie von der Anwendung auf `noindex` gesetzt.

## Live-Verifikation nach Deployment

```bash
curl -I http://cfs-zockt.de/
curl -I https://cfs-zockt.de/
curl -I https://www.cfs-zockt.de/
openssl s_client -servername cfs-zockt.de -connect cfs-zockt.de:443 </dev/null 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```

Erwartung:

- HTTP wird auf HTTPS umgeleitet.
- www landet auf der kanonischen Domain.
- HTTPS liefert CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `SAMEORIGIN` und die übrigen Security Header.
- Zertifikat ist für die Domain gültig und nicht abgelaufen.

## Tests

Während dieses Passes nur gezielte Checks ausführen:

```bash
npm run check
npm run security:check
```

Keine große Acceptance-, Last- oder LIVE-Suite starten, solange der aktuelle Ausbau noch läuft.

## Dependency-Härtung vor Release

Im übergebenen Paket liegt kein `package-lock.json`. Dadurch ist die exakte Dependency-Auflösung bei einem frischen Install nicht vollständig reproduzierbar. Das ist kein Grund, den aktuellen Website-Security-Pass zu blockieren, sollte aber vor dem Release-Freeze separat erledigt werden:

```bash
npm install
npm audit --omit=dev
```

Den dabei erzeugten Lockfile anschließend mit versionieren und Dependency-Updates kontrolliert mit den kleinen Regressionstests prüfen. Während dieses Security-Passes wurden bewusst keine Framework-/SDK-Versionen blind angehoben.
