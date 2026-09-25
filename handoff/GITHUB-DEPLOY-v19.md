# GitHub / Deploy Übergabe – v19

## Ziel
Dieser Stand ist für den ersten GitHub-Einbau der gesammelten Website-Updates vorbereitet.

## Empfohlenes Paket
`cfs_zockt-github-ready-v19.zip`

Dieses ZIP enthält ausschließlich die neuen/geänderten Repo-Dateien mit ihren echten Projektpfaden.
Es enthält keine historischen Einzelupdate-ZIPs.

## Einbau
1. ZIP entpacken.
2. Inhalt über die bestehende Repository-Struktur kopieren.
3. Geänderte Dateien in Git prüfen.
4. Commit erstellen.
5. Zu GitHub pushen.
6. Render Deploy manuell auslösen.
7. Nach Deploy reale Desktop-/Mobile-Abnahme durchführen.

## Wichtig
Der lokale Stand ist statisch/regressionsseitig geprüft.
Das ersetzt keinen echten Render-/Browser-/Mail-/Stripe-/Windows-/Passkey-Hardware-Test.

## Vor Deploy lokal geprüft
- GitHub Repository Readiness: 30/30
- Deployment Flow: PASS
- Repository Hygiene: PASS
- Production Deployment Readiness: 22/22
- Pre-Deploy Migration Safety R68: 52/52
- Pre-Deploy Doctor R68: PREDEPLOY_READY 29/29
- v18 vollständige Website-/Security-Regression: PASS

## Production-Drills
Weiterhin separat:
- R59: Evidence vorhanden
- R60: Evidence vorhanden
- R61: Evidence vorhanden
- R62: teilweise manuell durchgeführt, noch nicht abgeschlossen
- R63-R66: offen
- R67: danach

## Nach dem Render Deploy
Zuerst nur reale UI-Abnahme:
- Startseite Desktop/Mobile
- Login/Registrierung/Verify
- Dashboard
- Account/Sicherheit
- Widget Studio
- Stream Studio
- TikTok/Integrationen
- Launcher-Seiten
- Plans
- Support

Danach R62 fortsetzen.
