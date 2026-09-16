# Database Backup & Recovery Security · Pass 18

Stand: 16.09.2026

## Ziel

Dieser Pass ergänzt den bisherigen Release Candidate um eine belastbare Datenbank-Wiederherstellungsstrategie. Ein sicherer Login hilft nicht, wenn ein fehlerhaftes Deployment, ein versehentliches DELETE oder eine beschädigte Datenbank nicht wiederherstellbar ist.

## Production-Strategie

1. **Bevorzugt: Provider-PITR** auf Render, wenn der gewählte Datenbankplan Recovery unterstützt.
2. Vor Schema-/Datenmigrationen zusätzlich einen logischen Export erzeugen.
3. Für unabhängige Langzeit-/Offsite-Kopien steht ein eigenes verschlüsseltes `pg_dump`-Werkzeug bereit.
4. Restores werden standardmäßig ausschließlich in eine **separate, leere Recovery-Datenbank** erlaubt.
5. Erst nach Validierung wird eine Anwendung auf eine wiederhergestellte Datenbank umgeschaltet.

Die maschinenlesbare Soll-Policy liegt in `ops/database-recovery-policy.json`.

## Neue Werkzeuge

```bash
# Voraussetzungen / letzter Restore-Drill
npm run recovery:doctor

# Verschlüsseltes Custom-Format-Backup
DATABASE_URL=... CFS_BACKUP_ENCRYPTION_KEY=... npm run dbbackup:create

# Kryptografisch + mit pg_restore --list prüfen
CFS_BACKUP_ENCRYPTION_KEY=... npm run dbbackup:verify -- backups/<datei>.cfsbackup

# Dry-Run gegen eine separate leere Ziel-DB
CFS_BACKUP_ENCRYPTION_KEY=... npm run dbrestore:run -- \
  backups/<datei>.cfsbackup \
  --target-url=postgresql://.../cfs_recovery

# Echter Restore – zusätzlich explizite Freigabe erforderlich
CFS_BACKUP_ENCRYPTION_KEY=... \
CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE \
npm run dbrestore:run -- \
  backups/<datei>.cfsbackup \
  --target-url=postgresql://.../cfs_recovery \
  --execute
```

## Backup-Sicherheit

- `pg_dump --format=custom`
- `--no-owner` / `--no-privileges`
- Datenbankpasswort nur im Child-Process-Environment, nicht im Backup-Dateinamen/Manifest
- zufälliges 128-Bit-Salt
- scrypt `N=32768, r=8, p=1`
- getrennte HKDF-Schlüssel für Verschlüsselung und Manifest-HMAC
- AES-256-GCM mit zufälliger 96-Bit-IV
- SHA-256 über Klartext und Ciphertext
- HMAC-SHA-256 über das vollständige Manifest
- temporäres unverschlüsseltes Dump wird in `finally` entfernt
- Backup- und Manifestdateien werden mit restriktiven Dateirechten erzeugt
- Backup-Verzeichnisse/Recovery-Evidence werden nicht committed

## Restore-Sicherheit

Das Restore-Werkzeug verweigert standardmäßig:

- Restore in die im Backup gespeicherte Quelldatenbank
- Restore in die aktuell konfigurierte `DATABASE_URL`
- Restore in eine Datenbank mit bestehenden Anwendungstabellen
- destruktives `--clean`
- Datenbank-Drop/-Create
- echten Restore ohne `--execute`
- echten Restore ohne `CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE`

Nach einem erfolgreichen Restore wird eine lokale, git-ignorierte `reports/database-recovery-evidence.json` mit Zeit, Backup-Prüfsumme, Quelle/Ziel ohne Credentials und Anzahl wiederhergestellter Tabellen geschrieben.

## Tests

- `npm run recovery18:check`
  - 46 strukturelle Sicherheitschecks
  - 6 echte Crypto-Roundtrip-/Manipulationstests
- erwartet: **52/52 PASS**

## Noch real auszuführen

Diese Umgebung enthält keine PostgreSQL-Clienttools (`pg_dump`, `pg_restore`, `psql`) und keine echte Production-Datenbank. Deshalb wurde **kein echter Datenbankdump oder Restore behauptet**.

Vor öffentlichem Production-Go-Live:

1. Render-PITR/Recovery-Fähigkeit des tatsächlichen Datenbankplans bestätigen.
2. PostgreSQL-Clienttools passend zur Server-Major-Version in einer sicheren Ops-Umgebung installieren.
3. `CFS_BACKUP_ENCRYPTION_KEY` außerhalb des Repositories setzen.
4. echtes Backup erzeugen und verifizieren.
5. in eine separate Recovery-Datenbank restaurieren.
6. Anwendung gegen die Recovery-Datenbank prüfen.
7. `npm run recovery:doctor` mit frischer Restore-Evidence grün bekommen.
