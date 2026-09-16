# GitHub Repository Readiness Pass 21

Stand: 16.09.2026

## Ziel

Den kumulativen cfs_zockt Stand sicher in das neue leere GitHub-Repository `cstaudy/cfs-zockt-Website` bringen, ohne Secrets, lokale Artefakte oder veraltete Repository-Hinweise zu veröffentlichen.

## Umgesetzt

- aktuelles Repository und Remote dokumentiert
- `.github/SECURITY.md` ergänzt
- Pull-Request-Template auf aktuellen Security-/Release-Stand gebracht
- historische V40/V41-Setup-Dokumente mit Hinweis auf Pass 21 versehen
- `npm run github21:check`
- `npm run github:push-plan`
- Repository-Check prüft verbotene Artefakte, `.env`, große Dateien, Node 22 in Workflows, CODEOWNERS, Dependabot, Security Policy und aktuelle Repository-Metadaten
- temporärer lokaler Git-Bootstrap wird vor Paketfreigabe zusätzlich praktisch geprüft

## Bewusst nicht automatisiert

- kein Speichern von GitHub-Zugangsdaten
- kein automatischer Push in das Benutzerkonto
- kein automatisches Aktivieren von Branch Rulesets oder Security-Settings
- keine automatische Production-Freigabe

Diese Schritte erfordern GitHub-Kontoberechtigungen und bleiben deshalb explizite Benutzer-/Repository-Aktionen.
