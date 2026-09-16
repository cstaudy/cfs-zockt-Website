# Project Health Check · Pass 17

Stand: 16.09.2026

## Ergebnis

**Interner Code-/QA-Stand: GO – Release Candidate.**

**Öffentlicher Production-Launch: NO-GO**, bis die externen Gates geschlossen sind.

## Neue Pass-17-Prüfung

- `npm run admin17:check`: **44/44 PASS**
- Admin-Step-up Pass 16 bleibt **40/40 PASS**
- `npm run project:check`: **26/26 PASS**
- `npm run check:v42`: **PASS**
- `npm run check:post-v42`: **PASS**
- `npm run check:acceptance-part2`: **PASS**

## Pass-17-Sicherheitsgewinn

- neue Admin-Audit-Ereignisse HMAC-SHA-256-verkettet
- eigenes `CFS_ADMIN_AUDIT_HMAC_SECRET`
- transaktionaler Advisory-Lock gegen parallele Ketten-Forks
- Retention-Checkpoint vor Bereinigung alter Auditdaten
- Integritätsprüfung im Admin Control Center
- bestehende alte Auditzeilen transparent als `LEGACY`
- step-up-geschützter JSON-Forensik-Export
- weiterhin keine Request-Bodies, rohen IP-Adressen oder User-Agents im Audit

## Externe Production-Gates

`npm run production:external-gate` bleibt **NO-GO**:

1. Root-`package-lock.json` fehlt.
2. `launcher/package-lock.json` fehlt.
3. `cfs-zockt.de` ist aus der Prüfumgebung nicht per DNS auflösbar.
4. `www.cfs-zockt.de` ist aus der Prüfumgebung nicht per DNS auflösbar.
5. Dadurch bleiben HTTP→HTTPS, TLS, `security.txt`, `robots.txt`, `sitemap.xml` und live ausgelieferte Security Header extern unverifiziert.

Der letzte Edge-Lauf steht bei **0/9**, weil bereits die DNS-Auflösung fehlschlägt.

## Versionen

- Backend: **3.12.0**
- Launcher: **0.42.0**
- Node.js: **22+**
