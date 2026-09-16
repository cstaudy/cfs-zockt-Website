# cfs_zockt – Production Deployment Readiness Pass 13

**Stand:** 15.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Die letzten externen Production-Blocker sollen nicht nur dokumentiert, sondern möglichst früh und reproduzierbar erkannt werden. Pass 13 ergänzt deshalb eine versionierte Render-Deployment-Vorlage und einen redigierten Production-Setup-Doctor.

## Neu

- `render.blueprint.example.yaml`
  - Node-Webservice
  - `autoDeployTrigger: off`
  - Build ausschließlich über `npm ci`
  - `/api/health` als HTTP-Healthcheck
  - kanonische Domain `cfs-zockt.de`
  - kanonische `APP_BASE_URL`, TikTok-Callback und WebAuthn-RP-ID
  - externe Zugangsdaten mit `sync: false`
  - unabhängige interne Security-Secrets über `generateValue: true`
  - kein hart codiertes Production-Secret

- `npm run deployment:doctor`
  - prüft Node-Runtime und exakt gepinnte direkte Dependencies
  - prüft Root-/Launcher-Lockfiles
  - prüft Blueprint-Sicherheitsstruktur
  - kann mit echten Production-Environment-Werten zusätzlich Runtime-Konfiguration, kanonische Origin, OAuth-Callback, RP-ID und Host-Allowlist prüfen
  - schreibt `reports/production-setup-doctor.json` und `.md`
  - gibt keine Secret-Werte aus

- `npm run deployment13:check`
  - 22 strukturelle Regressionen für Blueprint, Doctor und Production-Workflows

- `npm run project:check`
  - enthält Pass 13 jetzt kumulativ mit

- GitHub Quality Gate / Production Deploy
  - prüfen die Pass-13-Deployment-Struktur vor den weiteren Gates

## Aktuelles Ergebnis

Die neue Deployment-Struktur ist grün. Der Setup Doctor bleibt absichtlich **NO-GO**, solange `package-lock.json` und `launcher/package-lock.json` fehlen.

Der zweite externe Blocker bleibt unverändert: Die öffentliche Domain ist aus der aktuellen Prüfumgebung nicht per DNS erreichbar. Daher kann der echte TLS-/Redirect-/Header-Gate noch nicht grün werden.

## Release-Bewertung

- Repository-/Deployment-Struktur: **GO**
- interner Release Candidate: **GO**
- öffentlicher Production-Launch: **NO-GO**, bis Lockfiles vorhanden und DNS/TLS extern grün sind
