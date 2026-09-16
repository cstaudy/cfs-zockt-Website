# Security Policy

## Private Sicherheitsmeldungen

Bitte Sicherheitsprobleme **nicht als öffentliches GitHub Issue** veröffentlichen.

Bevorzugte Wege:

1. GitHub → **Security** → **Advisories** → private Meldung / private Security Advisory, sofern für das Repository verfügbar.
2. Nach dem Production-Go-Live: der private cfs_zockt Meldeweg unter `https://cfs-zockt.de/pages/support.html` bzw. `/.well-known/security.txt`.

Bitte niemals Passwörter, OAuth-/API-Tokens, Recovery-Codes, private Schlüssel, vollständige `.env`-Dateien oder andere Zugangsdaten in Issues, Discussions, Screenshots oder Logs veröffentlichen.

## Was in eine Meldung gehört

- betroffener Bereich / Route
- reproduzierbare Schritte
- erwartetes und tatsächliches Verhalten
- Browser-/Runtime-Version, falls relevant
- eine kurze Risikoabschätzung

Nur die minimal nötigen technischen Daten mitsenden. Keine fremden personenbezogenen Daten oder Secrets sammeln.

## Release-Stand

Der aktuelle technische Status steht in `PROJECT_CURRENT_STATE.md`. Production-spezifische externe Gates wie DNS/TLS, Lockfiles und Recovery-Drills werden dort getrennt von internen automatisierten Tests geführt.
