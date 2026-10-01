# v166 — Creator Dashboard + Account Alltag

Ziel dieses Passes ist nicht ein neues Feature, sondern ein klarerer Creator-Alltag nach dem Login.

## Dashboard

Der erste Blick enthält nur noch:

1. den automatisch ermittelten nächsten Schritt,
2. vier Schnellzugriffe: Stream Studio, Widget Studio, Launcher, Integrationen,
3. den öffentlichen LIVE-Status-Fallback.

Verbindungsdetails, Stream-Startcheck, Runtime-Karten, Workspace-Taxonomie und Modulberechtigungen liegen unter **Status & Diagnose**. Die zugrunde liegenden IDs, APIs und Berechtigungsprüfungen bleiben bestehen.

Der Onboarding-Block bleibt für noch nicht abgeschlossene Grundschritte erhalten und wird nach dem Schnellzugriff einsortiert. Der ältere doppelte Schnellstart-/Studio-Grid wird nicht mehr per JavaScript erzeugt.

## Account

Die Account-Seite ist auf vier klare Bereiche reduziert:

- **Profil** — Creator-Name, E-Mail, Zugang/Plan.
- **Sicherheit** — E-Mail-Verifikation, Passkeys, 2FA, Passwort.
- **Sitzungen** — aktive Logins und Sicherheitsereignisse.
- **Daten & Konto** — Export, TikTok-Trennung, Recovery, Datenschutz, Kontolöschung.

Die doppelte Verwaltungsnavigation wurde entfernt. Technische Schutzdetails bleiben vorhanden, sind aber eingeklappt.

## Unverändert

- MFA-/Passkey-/Passwort- und Session-APIs
- Datenexport und Kontolöschung
- TikTok-Lifecycle-Aktionen
- öffentlicher LIVE-Override inklusive CSRF-Schutz
- Twitch/TikTok LIVE-Tracking
- Launcher-/OBS-/Provider-Secret-Grenzen
- Schema Generation 73

## Gate

`npm run creator-daily166:check`

Erwartung: **88/88 PASS**.
