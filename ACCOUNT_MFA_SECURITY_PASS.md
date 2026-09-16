# cfs_zockt – Account MFA / 2FA Security Pass

Stand: 15.09.2026

Backend bleibt **3.12.0**. Launcher bleibt **0.42.0**.

## Ziel

Optionaler zusätzlicher Account-Schutz ohne falsche Sicherheitsversprechen. TOTP ergänzt das Passwort, wird aber ausdrücklich **nicht** als phishing-resistent dargestellt. Passkeys/WebAuthn waren bei diesem Pass noch die spätere stärkere Ausbaustufe; seit Pass 8 sind sie zusätzlich implementiert.

## Umgesetzt

- optionales TOTP mit 20-Byte Shared Secret
- kompatible `otpauth://`-URI für Authenticator-Apps
- 6-stellige Codes, 30-Sekunden-Zeitschritt, ±1 Schritt Clock-Skew
- bereits akzeptierter TOTP-Zeitschritt wird nicht erneut akzeptiert
- TOTP-Secret wird über den bestehenden AES-256-GCM-Schlüssel verschlüsselt gespeichert
- Login erstellt bei aktiviertem MFA nach korrektem Passwort zunächst nur eine 5-Minuten-MFA-Challenge
- Challenge-Cookie: HttpOnly, Secure in Production, SameSite=Strict, `__Host-`-Präfix in Production
- normale Creator-Session erst nach erfolgreichem zweiten Faktor
- 10 Recovery-Codes bei Aktivierung
- Recovery-Codes werden nur einmal im Klartext ausgegeben und danach nur als HMAC-Hash gespeichert
- verwendeter Recovery-Code wird atomar als verbraucht markiert
- neue Recovery-Codes machen alle bisherigen Codes sofort ungültig
- Einrichtung: aktuelles Passwort erforderlich
- Aktivierung: gültiger Authenticator-Code erforderlich
- Regeneration: aktuelles Passwort + gültiger Authenticator-Code
- Deaktivierung: aktuelles Passwort + Authenticator- oder Recovery-Code
- Aktivierung/Deaktivierung beendet andere aktive Sessions
- Sicherheitsereignisse für Aktivierung, Deaktivierung, MFA-Login, Recovery-Code-Nutzung und Code-Regeneration
- bei aktivem Account-Mail-Relay Sicherheitsmail nach Aktivierung/Deaktivierung sowie Recovery-Code-Login
- Datenexport enthält nur MFA-Status/Datum, niemals Shared Secret oder Recovery-Code-Hashes

## Production-Konfiguration

Neu erforderlich:

`CFS_MFA_RECOVERY_HASH_SALT=<eigenständiger geheimer Wert mit mindestens 32 Zeichen>`

Das TOTP-Shared-Secret verwendet weiterhin `CFS_TOKEN_ENCRYPTION_KEY` für verschlüsselte Speicherung. In Production gibt es keinen Plaintext-Fallback.

## UI

- Login besitzt einen getrennten zweiten Faktor ohne Challenge-Token im Browser-JavaScript
- Account-Seite ermöglicht Setup, Aktivierung, neue Recovery-Codes und Deaktivierung
- Recovery-Codes werden nur unmittelbar nach Aktivierung bzw. Neugenerierung angezeigt
- Sicherheits- und Datenschutzseite erklären Speicherung und Grenzen

## Checks

- `npm run mfa:check` – **49/49**
- RFC-6238-SHA1-Testvektor enthalten
- Security / Security3 / Trust / Trust2 / SEO / Funnel / Reviews / Lifecycle / Credentials / Mail-Recovery / UX / Core-Flows weiterhin grün
- Launcher Stability weiterhin PASS

## Bewusst noch offen

- Passkeys/WebAuthn als phishing-resistente MFA-Stufe
- echte Production-/Browser-/Authenticator-End-to-End-Abnahme
- große Acceptance-/Last-/LIVE-Endtests

