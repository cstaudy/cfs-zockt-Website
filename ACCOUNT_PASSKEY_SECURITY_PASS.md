# cfs_zockt – Account Passkey / WebAuthn Security Pass

Stand: 15.09.2026  
Backend: 3.12.0  
Launcher: 0.42.0

## Ziel

Die vorhandene Passwort-/TOTP-Sicherheit wird um optionale Passkeys auf WebAuthn-Basis erweitert. TOTP und Recovery-Codes bleiben verfügbar. Es wird kein eigener WebAuthn-Kryptografie-Stack gebaut; die serverseitige Ceremony-Verifikation nutzt `@simplewebauthn/server` 14.0.2.

## Umgesetzt

- Node.js-Mindest-Runtime auf 22+ angehoben.
- Optionale `CFS_WEBAUTHN_RP_ID`; in Production muss sie zur kanonischen Domain passen.
- Eigene Credential-Tabelle für Credential-ID, Public Key, Counter, Transports und minimale Authenticator-Metadaten.
- Eigene kurzlebige Challenge-Tabelle für Registration/Authentication.
- Registration-Challenges sind an Creator + aktive Session gebunden.
- Authentication-Challenges sind an Creator + kurzlebige MFA-Challenge gebunden.
- Jeder Verify-Versuch verbraucht die zugehörige WebAuthn-Challenge atomar (`DELETE ... RETURNING`).
- Registrierung und Anmeldung verlangen WebAuthn User Verification.
- Origin und RP-ID werden bei der serverseitigen Verifikation geprüft.
- Pro Account maximal 8 Passkeys sowie eigenes Rate Limit.
- Passkey-Hinzufügen und -Entfernen erfordern das aktuelle Passwort.
- Beim Hinzufügen/Entfernen werden andere aktive Sessions widerrufen.
- Der erste Passkey erzeugt Recovery-Codes, wenn weder TOTP noch bestehende Recovery-Codes vorhanden sind.
- Beim Entfernen des letzten Passkeys bleiben Recovery-Codes erhalten, wenn TOTP weiter aktiv ist; ohne verbleibenden starken Faktor werden sie bereinigt.
- Passkey-Login erfolgt erst nach erfolgreicher Passwortprüfung über die vorhandene MFA-Challenge; eine Creator-Session entsteht erst nach erfolgreicher WebAuthn-Verifikation.
- Signatur-Counter wird nach erfolgreicher Authentisierung aktualisiert.
- Passkey-Verwaltung im Creator-Account und Passkey-Bestätigung im Login ergänzt.
- Browser-Ceremonies verwenden die native WebAuthn-API (`navigator.credentials.create/get`).
- Account-Datenexport enthält nur bereinigte Passkey-Metadaten, keine Credential-Public-Keys und keine internen Challenge-Daten.
- Der private Schlüssel wird nie vom Backend gespeichert; er verbleibt beim Authenticator/Gerät.
- Sicherheitsmails für Passkey hinzugefügt/entfernt werden nur bei aktivem, signiertem Account-Mail-Relay versendet.
- Security-Event-Allowlist korrigiert: bereits vorhandene MFA-, Recovery- und Mail-Ereignisse sowie neue Passkey-Ereignisse werden jetzt tatsächlich gespeichert.

## Sicherheitsevents

- `login_success_passkey`
- `passkey_added`
- `passkey_removed`

Zusätzlich wurden die zuvor bereits verwendeten MFA-/Recovery-/Mail-Events in der Allowlist vervollständigt.

## Konfiguration

Optional:

```env
CFS_WEBAUTHN_RP_ID=cfs-zockt.de
```

Ohne Wert wird die RP-ID aus dem Host von `APP_BASE_URL` abgeleitet. In Production darf die konfigurierte RP-ID nur die kanonische Domain oder eine gültige übergeordnete Domain sein.

Runtime:

```text
Node.js >= 22
```

Neue Dependency:

```text
@simplewebauthn/server 14.0.2
```

## Bewusst nicht behauptet

In dieser Arbeitsumgebung wurde kein echter Browser-/Hardware-/Plattform-Authenticator gegen die produktive HTTPS-Domain durchgespielt. Der neue gezielte Test prüft Quellcode, Bindungen, Persistenz, Challenge-Verbrauch, UI-Verkabelung und Sicherheitsregeln, ersetzt aber keinen realen WebAuthn-Ceremony-Test.

Vor Release bleibt deshalb offen:

1. Production-Dependencies normal installieren.
2. echte HTTPS-Domain / RP-ID prüfen.
3. Registrierung mit mindestens einem Plattform-Authenticator durchführen.
4. Registrierung mit mindestens einem externen Security Key durchführen, sofern vorgesehen.
5. Login, Counter-Update, Recovery-Code-Fallback und Passkey-Entfernen praktisch durchspielen.
6. Origin-/RP-ID-Fehlfälle auf der echten Domain prüfen.

## Teststrategie

Gezielt, ohne großen Acceptance-/LIVE-Block:

```bash
npm run passkey:check
npm run check
npm run security:check
npm run seo:check
npm run funnel:check
npm run reviews:check
npm run ux30:check
npm run coreflows:check
npm run trust:check
npm run trust2:check
npm run conviction:check
npm run security3:check
npm run lifecycle:check
npm run credential:check
npm run mailrecovery:check
npm run mfa:check
```

Große Acceptance-, Last- und echte LIVE-Endtests bleiben pausiert.
