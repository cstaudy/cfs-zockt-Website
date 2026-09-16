# Pass 20 – Incident Response / Website Write-Freeze

Stand: 16.09.2026

## Ziel

Bei Wartung oder einem Sicherheitsvorfall soll cfs_zockt nicht zwischen „alles offen“ und „komplett offline“ wählen müssen. Pass 20 ergänzt einen kontrollierten, datensparsamen Incident-Modus für die öffentliche Website und Creator-Browser-Schreibwege.

## Modi

- `normal` – normaler Betrieb, öffentlicher Status `online`.
- `degraded` – transparenter eingeschränkter Status, ohne automatischen Write-Freeze.
- `maintenance` – öffentliche Website, Support und Admin bleiben erreichbar; riskante Browser-Schreibwege werden mit HTTP 503 + `Retry-After: 300` pausiert.
- `security_lockdown` – gleicher Write-Freeze, zusätzlich kann der Admin explizit alle anderen Login-Sitzungen widerrufen.

## Eingefrorene Bereiche

Im Wartungs-/Lockdown-Modus werden unter anderem Schreibzugriffe für diese Bereiche blockiert:

- Account-Lifecycle / Registrierung / Passwortänderungen
- Creator-Suite-Schreibaktionen
- öffentliche Reviews
- Creator-Billing-Schreibwege
- TikTok-OAuth-Verknüpfung

Bewusst erreichbar bleiben:

- Admin Control Center
- `/api/health`
- `/api/public/status`
- privater Security-/Support-Meldeweg
- CSP-Reporting
- Stripe-Webhook
- Login/Logout, damit ein Administrator den Incident weiterhin steuern kann

## Admin-Schutz

Der Incident-Status wird über das Admin Control Center gesteuert. Änderungen laufen durch den bestehenden Admin-Step-up und damit auch durch das manipulations-erkennbare Admin-Audit.

Ein Security Lockdown kann optional alle anderen `creator_sessions` widerrufen. Die aktuell steuernde Admin-Session bleibt erhalten.

## Datenschutz

Der Incident-Unterbau benötigt keine Geolocation, keine rohe IP-Historie, keinen User-Agent-Verlauf und kein Browser-Fingerprinting. Der öffentliche Status liefert nur Betriebszustand, eine kurze öffentliche Meldung und keine internen Infrastrukturdetails.

## Operations-Drill vor Go-Live

In einer sicheren Staging-/Recovery-Umgebung einmal praktisch prüfen:

1. `normal` → Homepage zeigt `SYSTEM ONLINE`.
2. `degraded` → öffentliche Meldung sichtbar, normale Schreibwege bleiben möglich.
3. `maintenance` → Account-/Creator-/Review-Schreibzugriff liefert 503 + `Retry-After`, Support/Admin bleiben erreichbar.
4. `security_lockdown` → Write-Freeze greift; optional andere Sitzungen widerrufen.
5. Admin-Audit enthält die privilegierten Incident-Änderungen.
6. Danach zurück auf `normal` und Schreibwege erneut prüfen.

## Automatisierter Status

- `npm run incident20:check`: **41/41 PASS**
- `npm run project:check`: **29/29 PASS**
- `npm run check:v42`: **PASS**
- `npm run check:post-v42`: **PASS**
- `npm run check:acceptance-part2`: **PASS**

Ein echter Production-Incident wurde damit nicht simuliert oder behauptet. Der reale Incident-Drill bleibt ein Operations-Gate.
