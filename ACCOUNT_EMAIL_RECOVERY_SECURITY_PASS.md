# cfs_zockt – Account E-Mail Verification & Recovery Security Pass

**Stand:** 15.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Sicheren Unterbau für E-Mail-Bestätigung und Passwort-Recovery bereitstellen, ohne einen nicht konfigurierten Mailversand als produktiv funktionsfähig darzustellen.

## Umgesetzt

- provider-neutraler Account-Mail-Transport über signierten HTTPS-Webhook
- `CFS_ACCOUNT_MAIL_MODE=disabled|webhook`
- separates `CFS_ACCOUNT_MAIL_WEBHOOK_SECRET` mit HMAC-SHA256-Signatur
- optional `CFS_EMAIL_VERIFICATION_REQUIRED=true` für **neu registrierte Accounts**
- Production/Config Doctor blockieren Pflicht-Verifizierung ohne funktionsfähigen Mail-Relay
- `email_verified_at` am Creator-Account
- separate Tabelle `creator_account_action_tokens`
- Roh-Tokens werden **nicht** gespeichert; persistiert wird nur ein SHA-256-Hash
- Tokens sind kryptografisch zufällig, purpose-gebunden, zeitlich begrenzt und einmal verwendbar
- E-Mail-Verifizierung: 8 Stunden TTL
- Passwort-Recovery: 30 Minuten TTL
- gleichzeitige Token-Ausstellung wird pro Creator über DB-Row-Lock serialisiert
- Token-Verbrauch wird mit `FOR UPDATE` gegen parallele Mehrfachnutzung geschützt
- Verifizierungs-/Reset-Links tragen den Token im URL-Fragment (`#token=...`)
- Browser entfernt das Fragment sofort per `history.replaceState`, bevor der Token an die API gesendet wird
- öffentliche Verification-/Forgot-Responses sind account-neutral formuliert
- zusätzlicher Mindest-Zeitboden reduziert einfache Timing-Unterschiede
- Login zeigt `pending_email` erst **nach** erfolgreicher Passwortprüfung
- erfolgreicher Passwort-Reset widerruft alle bestehenden Login-Sitzungen
- nach Reset erfolgt keine automatische Anmeldung; normale Neuanmeldung ist erforderlich
- optionaler Bestätigungsversand nach Recovery informiert über die Passwortänderung
- neue noindex-Seiten für Forgot Password, Reset Password und E-Mail-Verifizierung
- Account-Seite zeigt echten Verifizierungs-/Mail-Relay-Status

## Mail-Relay Vertrag

Bei aktiviertem `webhook`-Modus sendet das Backend einen JSON-POST an `CFS_ACCOUNT_MAIL_WEBHOOK_URL` mit:

- `X-CFS-Mail-Timestamp`
- `X-CFS-Mail-Signature: v1=<HMAC-SHA256>`

Signaturgrundlage:

`v1.<timestamp>.<raw-json-body>`

Der externe Relay muss die Signatur mit `CFS_ACCOUNT_MAIL_WEBHOOK_SECRET` prüfen und sollte zusätzlich nur kurze Timestamp-Abweichungen akzeptieren, um Replay-Angriffe zu begrenzen.

## Production-Konfiguration

Standard bleibt sicher deaktiviert:

```env
CFS_ACCOUNT_MAIL_MODE=disabled
CFS_ACCOUNT_MAIL_WEBHOOK_URL=
CFS_ACCOUNT_MAIL_WEBHOOK_SECRET=
CFS_EMAIL_VERIFICATION_REQUIRED=false
```

Nach real geprüftem Relay:

```env
CFS_ACCOUNT_MAIL_MODE=webhook
CFS_ACCOUNT_MAIL_WEBHOOK_URL=https://<relay>/...
CFS_ACCOUNT_MAIL_WEBHOOK_SECRET=<eigener langer zufälliger Schlüssel>
CFS_EMAIL_VERIFICATION_REQUIRED=true
```

Die Pflicht-Verifizierung gilt bewusst nur für neue Registrierungen. Bestehende aktive Accounts werden durch das Umschalten nicht rückwirkend gesperrt.

## Sicherheitsereignisse

- `email_verification_requested`
- `email_verified`
- `password_reset_requested`
- `password_reset_completed`

## Tests

- `npm run mailrecovery:check` – **50/50**
- `npm run security:check` – OK
- `npm run seo:check` – OK
- `npm run funnel:check` – OK
- `npm run reviews:check` – 13/13
- `npm run ux30:check` – 40/40
- `npm run coreflows:check` – 22/22
- `npm run trust:check` – 20/20
- `npm run trust2:check` – 28/28
- `npm run conviction:check` – 23/23
- `npm run security3:check` – 33/33
- `npm run lifecycle:check` – 24/24
- `npm run credential:check` – 36/36
- Config Doctor V41 – OK
- GitHub Bootstrap V41 – OK
- Launcher Static Check – PASS
- Launcher Stability – PASS

Große Acceptance-, Last- und echte LIVE-Endtests wurden weiterhin nicht gestartet.

## Noch offen vor Aktivierung

1. echten Mail-Relay auswählen/konfigurieren
2. Relay-Signaturprüfung und Timestamp-Fenster real testen
3. SPF/DKIM/DMARC beim später eingesetzten Absender prüfen
4. Zustellung, Bounce-Verhalten und Missbrauchsszenarien real testen
5. erst danach `CFS_EMAIL_VERIFICATION_REQUIRED=true` setzen
