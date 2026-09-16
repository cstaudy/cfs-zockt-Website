# Admin Audit Integrity Security Pass 17

Stand: 16.09.2026

## Ziel

Privilegierte Admin-Aktionen waren seit Pass 16 step-up-geschützt und minimiert protokolliert. Pass 17 macht neue Audit-Einträge zusätzlich **manipulationssichtbar**, ohne dafür mehr personenbezogene Daten zu sammeln.

## Umsetzung

- separates Production-Secret `CFS_ADMIN_AUDIT_HMAC_SECRET`
- HMAC-SHA-256-Verkettung neuer Audit-Ereignisse
- kanonischer Payload bindet Vorgänger-Hash, Admin-ID, Methode, Route, Ergebnis, Statuscode, Request-ID und Zeitpunkt
- PostgreSQL-Advisory-Transaction-Lock serialisiert konkurrierende Audit-Schreibvorgänge
- `chain_version`, `prev_hash` und `event_hash` als Integritätsmetadaten
- bestehende ältere Zeilen bleiben `chain_version=0` und damit transparent `LEGACY`
- Retention-Checkpoint wird vor Löschung der ältesten verketteten Auditzeilen gespeichert
- Integritätsprüfung rekonstruiert und verifiziert die komplette noch aufbewahrte Kette
- Admin Control Center zeigt `KETTE OK` oder `INTEGRITÄTSFEHLER`
- step-up-geschützter Forensik-Export liefert minimierte Ereignisse + Integritäts-Snapshot
- Export wird als `admin_audit_exported` in der Account-Sicherheitsaktivität erfasst

## Datenschutz

Unverändert **nicht** im Audit gespeichert:

- Request-Body
- rohe IP-Adresse
- User-Agent
- Geräte-/Browser-Fingerprint

Aufbewahrung bleibt 180 Tage.

## Legacy-Verhalten

Bestehende Auditzeilen werden absichtlich **nicht nachträglich signiert**, weil dies eine rückwirkende Vertrauensbehauptung erzeugen würde. Sie bleiben sichtbar als `LEGACY`. Nur Ereignisse ab Pass 17 sind kryptografisch verkettet.

## Secret-Rotation

`CFS_ADMIN_AUDIT_HMAC_SECRET` muss stabil gespeichert werden. Eine Rotation ohne geplanten Kettenwechsel macht bereits erzeugte HMACs erwartungsgemäß nicht mehr mit dem neuen Schlüssel verifizierbar.

## Checks

- `npm run admin16:check`: 40/40 PASS
- `npm run admin17:check`: 44/44 PASS
- `npm run project:check`: 26/26 PASS

Backend-Version bleibt **3.12.0**, Launcher **0.42.0**.
