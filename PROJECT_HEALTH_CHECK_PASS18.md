# Project Health Check · Pass 18

Stand: 16.09.2026

## Ergebnis

**Interner Code-/QA-Stand: GO – Release Candidate.**

**Öffentlicher Production-Launch: NO-GO**, bis externe und operative Gates geschlossen sind.

## Neue Pass-18-Prüfung

- `npm run recovery18:check`: **52/52 PASS**
  - 46 strukturelle Backup-/Restore-Sicherheitschecks
  - 6 echte AES-GCM/HMAC/Roundtrip-/Tamper-Checks
- `npm run project:check`: **27/27 PASS**
- `npm run check:v42`: **PASS**
- `npm run check:post-v42`: **PASS**
- `npm run check:acceptance-part2`: **PASS**

## Recovery Doctor – reale Betriebsgegenprobe

`npm run recovery:doctor` ist in dieser Arbeitsumgebung erwartungsgemäß **NO-GO (3/8)**:

- Policy vorhanden: PASS
- separates Restore-Ziel verpflichtend: PASS
- Restore-Drill-Frist definiert: PASS
- `pg_dump`: fehlt in dieser Umgebung
- `pg_restore`: fehlt in dieser Umgebung
- `psql`: fehlt in dieser Umgebung
- `CFS_BACKUP_ENCRYPTION_KEY`: für einen echten Ops-Lauf nicht gesetzt
- echte Restore-Drill-Evidence: noch nicht vorhanden

Es wird daher **kein realer Production-Backup-/Restore-Erfolg behauptet**.

## Pass-18-Sicherheitsgewinn

- versionierte Recovery-Policy
- verschlüsselte PostgreSQL-Custom-Format-Backups
- AES-256-GCM
- scrypt + HKDF mit getrennten Encryption-/Manifest-MAC-Schlüsseln
- SHA-256 für Klartext und Ciphertext
- HMAC-SHA-256 über Backup-Metadaten
- keine DB-Credentials im Manifest
- Klartext-Dump nur temporär und danach gelöscht
- kryptografische Backup-Verifikation vor Restore
- `pg_restore --list` als Formatprüfung
- Restore in Quell-/Primärdatenbank standardmäßig gesperrt
- Restore nur in leeres separates Ziel
- echter Restore nur mit zusätzlichem `--execute` + Bestätigungsphrase
- lokale Recovery-Evidence nach erfolgreichem Restore-Drill

## External Production Gate

`npm run production:external-gate` bleibt **NO-GO**:

- Root-/Launcher-Lockfiles fehlen weiterhin
- `cfs-zockt.de` DNS nicht auflösbar
- `www.cfs-zockt.de` DNS nicht auflösbar
- dadurch bleiben HTTP→HTTPS, TLS und live ausgelieferte Dateien/Header extern unverifiziert
- letzter Edge-Lauf: **0/9**

## Zusätzliches Operations-Gate vor Go-Live

Vor einem öffentlichen Production-Go-Live ist jetzt zusätzlich ein realer Restore-Drill erforderlich:

1. tatsächliche Render-PITR-/Recovery-Fähigkeit des gewählten DB-Plans bestätigen
2. PostgreSQL-Clienttools passend zur Server-Version verwenden
3. echtes verschlüsseltes Backup erzeugen und verifizieren
4. in separate leere Recovery-Datenbank restaurieren
5. Anwendung gegen Recovery-Datenbank validieren
6. `npm run recovery:doctor` mit frischer Evidence grün bekommen

## Versionen

- Backend: **3.12.0**
- Launcher: **0.42.0**
- Node.js: **22+**
