# Pass 21.3.10 — Creator Verwaltung

## Ziel
Account, Einstellungen, Setup und Integrationen bilden einen zusammenhängenden Verwaltungsbereich der Creator Suite.

## Änderungen
- Gemeinsame Verwaltungsnavigation auf Account, Einstellungen, Setup und Integrationen.
- Account erhält eine kompakte Übersicht für Profil/Zugriff, Login-Schutz und Datenkontrolle.
- Einstellungen fungieren als zentraler Wegweiser statt Funktionen zu duplizieren.
- Veraltete Aussage zu nicht verfügbarem 2FA-Self-Service entfernt; MFA/Passkeys bleiben im Account-Bereich.
- Setup erklärt Look, Tools und Workflow vor dem bestehenden Formular.
- Integrationen unterscheiden TikTok/Launcher klar von Twitch/OBS Roadmap.
- Vorhandene IDs, Formulare und API-gebundene Elemente bleiben erhalten.
- Alle Verwaltungsseiten bleiben `noindex`.

## Nicht verändert
- Authentifizierungs- und Security-Backend
- CSRF/Origin/Rate-Limit-Logik
- Account-Formular-IDs und Account-JavaScript
- Setup-Formular und Setup-JavaScript
- Integrations-Status-IDs `ttStatus`, `ttText`, `nexusInfo`

## Status
PASS, sobald `tools/website-management-pass21-3-10-test.mjs` und die bestehenden Website-Regressionstests erfolgreich laufen.
