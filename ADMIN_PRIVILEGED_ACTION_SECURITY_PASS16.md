# Admin Privileged Action Security · Pass 16

**Stand:** 15.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Privilegierte Admin-Schreibaktionen sollen nicht allein durch den Besitz einer bereits angemeldeten Admin-Session möglich sein. Vor Änderungen an Moderation, Creator-/Beta-Daten, Production Evidence oder Release Operations ist eine frische Re-Authentifizierung erforderlich.

## Umgesetzt

- zentraler Step-up-Schutz für alle nicht-lesenden `/api/admin/*`-Requests
- erneute Prüfung des aktuellen Admin-Passworts
- Freigabe nur **10 Minuten** gültig
- Freigabe kryptografisch an die aktuelle Creator-Session gebunden
- eigener produktiver `__Host-cfs_admin_elevation` Cookie
  - HttpOnly
  - Secure
  - SameSite=Strict
  - Path=/
- abgelaufene/fehlende Freigabe arbeitet fail-closed mit `428 admin_reauth_required`
- eigenes Rate Limit für Admin-Step-up-Versuche
- neue Security Events:
  - `admin_elevation_granted`
  - `admin_elevation_failed`
- neue normale Login-Session und Logout löschen eine eventuell alte Step-up-Freigabe

## Admin Audit

Privilegierte Admin-Schreibaktionen werden minimal protokolliert:

- Admin-Creator-ID
- HTTP-Methode
- Express-Route
- Ergebnis `success` / `failed`
- HTTP-Statuscode
- serverseitige Request-ID
- Zeitpunkt

Bewusst **nicht** gespeichert:

- Request-Body
- Passwort
- rohe IP-Adresse
- User-Agent
- Browser-/Geräte-Fingerprint

Retention: **180 Tage**.

Das Admin Control Center zeigt den aktuellen Sperrstatus sowie die letzten Audit-Ereignisse intern an.

## Production-Konfiguration

Neu erforderlich:

```env
CFS_ADMIN_ELEVATION_SECRET=<eigener zufälliger Wert mit mindestens 32 Zeichen>
```

In Production startet das Backend ohne diesen Wert nicht.

## Tests

```text
admin16:check             40/40 PASS
project:check             25/25 PASS
check:v42                 PASS
check:post-v42            PASS
check:acceptance-part2    PASS
```

Ein älterer Review-Admin-QA-Test wurde auf den neuen zentralen `adminJson` Step-up-Wrapper aktualisiert. Die Produktlogik wurde dafür nicht abgeschwächt.

## Externer Production-Status

Unverändert **NO-GO**:

- Root-/Launcher-`package-lock.json` fehlen
- `cfs-zockt.de` / `www.cfs-zockt.de` konnten im External Gate nicht per DNS aufgelöst werden
- dadurch TLS/Redirect/live Header weiterhin nicht real verifizierbar

Der interne Code-/QA-Stand bleibt **GO – Release Candidate**.
