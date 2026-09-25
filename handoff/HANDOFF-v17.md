# Übergabe – v17 Account Recovery & Security UX Polish

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält v3 bis v17.

## In v17 umgesetzt

### Sicherheits-Setup im Account
Der Security-Tab erhält eine kompakte Statusübersicht für:
1. E-Mail-Verifizierung
2. starken Login-Schutz
3. optionalen Authenticator
4. Recovery-Codes

Der nächste sinnvolle Schritt wird aus bestehenden Account-APIs abgeleitet:
- `/api/account/passkeys`
- `/api/account/mfa`
- `CFS.me()`

Es wird kein eigener Sicherheitsstatus erfunden.

### Passkey-Einrichtung erklärt
Vor dem bestehenden Passkey-Formular wird der Ablauf sichtbar:
1. Namen vergeben
2. aktuelles Passwort bestätigen
3. Browser/Windows Hello/WebAuthn bestätigen

Die vorhandene Passkey-API und `page-account.js` bleiben unverändert.

### TOTP-Einrichtung erklärt
Es wird klar dargestellt, dass das Erzeugen eines TOTP-Secrets allein 2FA noch nicht aktiviert.
Erst der gültige 6-stellige Code beendet die Einrichtung.

### Recovery-Codes
Wenn Recovery-Codes sichtbar sind, kann der Nutzer sie bewusst in die Zwischenablage kopieren.
Das passiert nur per Klick.
Zusätzlich erscheint ein Hinweis, dass Zwischenablagen sensibel sind und Codes danach sicher außerhalb des Browsers gespeichert werden sollten.

### 2FA deaktivieren
Das vorhandene Deaktivierungsformular wird visuell hinter einem separaten Gefahrenbereich gruppiert.
Es wird nicht entfernt und seine bestehende Event-Logik bleibt erhalten.

### Login mit zweitem Faktor
Wenn nach Passwortlogin ein zweiter Faktor verlangt wird, erscheint eine klare Methodenauswahl:
- Passkey
- Authenticator
- Recovery-Code

Es werden nur Methoden angeboten, die der vorhandene Login-Response bereits freigegeben hat.
Recovery-Code wird als Notfall-Einmalcode erklärt.

Die vorhandenen Endpunkte und Login-Handler bleiben unverändert:
- `/api/account/mfa/login`
- `/api/account/mfa/passkey/options`
- `/api/account/mfa/passkey/verify`

## Neue Dateien
- public/assets/css/cfs-security-v17.css
- public/assets/js/cfs-security-v17.js

## Geänderte Datei
- public/assets/js/cfs-shell-v3.js

## Sicherheitsgrenzen
v17:
- speichert keine Passwörter,
- speichert keine MFA-Codes,
- erzeugt keine Recovery-Codes selbst,
- ändert keine WebAuthn-Challenges,
- umgeht keinen zweiten Faktor,
- führt keine Step-up-Aktion automatisch aus,
- kopiert Recovery-Codes nur nach ausdrücklichem Klick.

## Production-Readiness
R59-R61 Evidence vorhanden.

R62 bleibt weiterhin ein separater manueller Produktionsdrill.
Der UI-Umbau ist kein Nachweis für:
- Passkey-Step-up,
- TOTP-Login,
- TOTP-Step-up,
- Recovery-Code-Step-up,
- Entfernen des temporären Test-Passkeys.

Diese Schritte bleiben offen, bis sie wirklich live ausgeführt wurden.

R63-R66 offen.
R67 danach.

## Nächster empfohlener Stand
v18: Final UI Regression & Consolidation
- alle v3-v17 UI-Layer gemeinsam prüfen,
- doppelte oder widersprüchliche Elemente entfernen,
- CSS-/JS-Ladereihenfolge konsolidieren,
- tote Selektoren und doppelte Hilfen entfernen,
- finalen GitHub-Patch vorbereiten.

## Neuer Chat
Letzten kumulativen ZIP hochladen und sagen:
`Bitte ab CURRENT-HANDOFF weiterarbeiten.`

## Security regression cleanup
Während der v17-Prüfung haben bestehende Projekttests vier veraltete bzw. abweichende Sicherheitstexte erkannt.
Dafür wurden ausschließlich transparente UI-Texte angepasst in:
- `public/pages/account.html`
- `public/pages/login.html`
- `public/pages/settings.html`
- `public/pages/support.html`

Keine Backend-, Auth-, MFA-, Recovery- oder Passkey-Logik wurde dabei verändert.
