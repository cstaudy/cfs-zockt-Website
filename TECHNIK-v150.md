# TECHNIK v150 — Website Hardening / Test-Infrastruktur-Festigung

## Versionsstand
- cfs_zockt Backend: **3.18.1**
- Datenbank-Schema: **72**
- Launcher: **0.47.23**
- Pakettyp: kumulatives Updatepaket, kein Full Project

## Ziel dieses Blocks
v150 ergänzt bewusst keine neue Provider-Funktion. Der Block festigt die öffentliche Website, das Backend und die aktive Test-/Release-Infrastruktur auf Basis von v149. TikTok, Twitch, YouTube, OBS und die vorhandenen Widget-/Stream-Funktionen bleiben funktional erhalten.

## HTTP- und Transport-Härtung
- `TRACE`, `TRACK` und `CONNECT` werden serverseitig mit HTTP 405 abgewiesen.
- `httpServer.maxHeadersCount` begrenzt die Anzahl akzeptierter HTTP-Header.
- `X-DNS-Prefetch-Control: off` wurde in dynamischen und statischen Security-Headern ergänzt.
- Rate-Limit-Antworten (`429`) tragen explizit `Cache-Control: no-store`, `CDN-Cache-Control: no-store` und `Surrogate-Control: no-store`.
- bestehende Request-Target-, Body-, Timeout-, Socket-, Host-/HTTPS-, CSRF-, Origin-/Fetch-Metadata- und Security-Header-Grenzen bleiben aktiv.

## Website / SEO / öffentliche Navigation
- Startseite enthält sichtbare Links auf Sicherheit und öffentlichen Status.
- OpenGraph-Metadaten wurden um Bildabmessungen und Alt-Text ergänzt.
- Twitter-Metadaten für Titel, Beschreibung und Bild wurden vervollständigt.
- Startseite enthält zusätzlich ein `WebPage`-JSON-LD-Objekt.
- öffentliche Merch-Seite besitzt vollständige Social-Preview-Metadaten.
- `/pages/merch` besitzt eine kanonische HTML-Route und ist in der Sitemap enthalten.
- CSP-Hash für die aktualisierte strukturierte Startseiten-Datenstruktur wurde synchronisiert.

## Test-Infrastruktur
Der historische `project:check` referenzierte mehrere inzwischen nicht mehr vorhandene Legacy-Testdateien. v150 ersetzt diesen aktiven Aggregator durch eine kuratierte aktuelle Regression-Suite, ohne Sicherheitsprüfungen zu entfernen.

Aktiv gebündelt werden unter anderem:
- Syntax-/Security-/SEO-Prüfung
- Account Lifecycle
- Passwort/KDF und Credential-Sicherheit
- Mail-Recovery
- MFA/TOTP
- Passkeys/WebAuthn
- Login-Anomalien
- Request Integrity
- Dependency-/Supply-Chain-Baseline
- Lockfile-Integrität
- Deployment-/Resilience-/Admin-Security
- Recovery/Application-Recovery
- Incident-/GitHub-Sicherheitsverträge
- Accessibility/Website Integration/E2E
- Launcher Static Checks
- v150 Website Hardening Gate

Veraltete Regressionstests mit exakten historischen Versionswerten wurden auf Mindestversionsverträge bzw. aktuelle semantische Sicherheitsanforderungen umgestellt. Dadurch bleiben die ursprünglichen Sicherheitsgarantien bestehen, ohne spätere Patch-Releases künstlich zu blockieren.

## Neue v150-Prüfung
`tools/website-hardening-v150-test.mjs` prüft unter anderem:
- Backend-Mindestversion
- Request-ID und HTTP-Grenzen
- Header-/Timeout-Limits
- Method-Blocking
- Host-Allowlist und HTTPS-Fail-Closed
- CSP/HSTS/nosniff/Referrer-/Permissions-/DNS-Prefetch-Policy
- No-Store für sensitive und rate-limitierte Antworten
- JSON-/Form-Body-Limits
- sichere Session-Cookies
- Same-Origin/CSRF für Browser-Writes
- API-Fail-Closed und generische 500-Antworten
- `security.txt` und sichtbare Security-/Status-Navigation
- datensparsame CSP-Telemetrie
- Production-Secrets fail-closed
- Creator-/Provider-Isolation
- verschlüsselte OAuth-Credentials
- Widget Optimistic Locking

## Externe Prüfungen / Grenzen der Arbeitsumgebung
Folgende Prüfungen wurden angestoßen, konnten in der isolierten Arbeitsumgebung aber nicht belastbar abgeschlossen werden:
- Production-Smoke gegen `https://cfs-zockt.de` (externe Seite aus der Umgebung nicht erreichbar)
- Online-`npm audit` gegen `registry.npmjs.org` (`EAI_AGAIN`/DNS-Netzwerkfehler)

Das ist kein bestandener oder fehlgeschlagener Produktionsnachweis. Die statische Dependency-/Lockfile-Baseline läuft lokal grün; Live-Smoke und Online-Advisory-Audit bleiben für die spätere reale Acceptance offen.

## Feature-Status
- TikTok: bestehender code-seitiger Provider-/Widget-Pfad unverändert
- Twitch: bestehender OAuth/EventSub/Chat/Widget/Self-Heal-Pfad unverändert
- YouTube: v149-Code bleibt vorhanden, wird in v150 nicht weiter ausgebaut
- OBS: bestehender WebSocket-/Browser-Source-Pfad unverändert
- Multistream: lokaler Kern bleibt vorhanden; echte Provider-Ziele sind weiterhin ein späterer Feature-Block

## Release-Gates
- `npm run website150:check`
- `npm run project:check`
- `npm run release:v150`

Die Ergebnisse werden erst nach dem finalen v150-Lauf als abgeschlossen dokumentiert.

## Finaler lokaler Abschlussstand
- Website Hardening v150: **35/35 PASS**
- aktiver Projekt-Regressionstest: **30/30 PASS**
- Release Readiness: **20/20 PASS**
- Technical Foundation: **19/19 PASS**
- JSON-Parse-Sweep: **26 Dateien ohne Parse-Fehler**
- JS/MJS-Syntax-Sweep: **486 Dateien ohne Syntaxfehler**
- `npm run release:v150` → **PASS**

- Active Script Integrity v150: **35 aktive npm-Skripte im Release-Graph ohne fehlende Alias-/Dateireferenzen**
