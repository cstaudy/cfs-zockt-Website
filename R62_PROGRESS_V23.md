# R62 Production Auth Drill – Progress Helper v23

Dieser Helper ändert **nichts** in Production. Er liest nur:

- die signierte lokale R62-Pending-Datei,
- die zugehörigen Production-Security-Events,
- die aktuelle Anzahl der Passkeys des Testkontos.

## Vorbereitung

Der bestehende R62-Drill bleibt der einzige Weg, den Test zu starten:

```bash
npm run auth:drill -- --prepare --email <TESTMAIL>
```

Danach werden die sieben manuellen Schritte durchgeführt.

## Fortschritt anzeigen

```bash
npm run auth:drill:progress
```

Optional als JSON:

```bash
node tools/account-auth-production-progress-r62-v23.mjs . --json
```

## Die sieben Schritte

1. temporären Passkey hinzufügen
2. Passkey-Login
3. sensible Aktion mit Passkey-Step-up
4. TOTP-Login
5. sensible Aktion mit TOTP-Step-up
6. genau einen Recovery-Code-Step-up
7. temporären Passkey wieder entfernen

Der Helper zeigt nur `DONE` oder `OPEN` anhand echter Security-Events.

## Wichtig

`READY_TO_VERIFY` ist **noch kein PASS**.

Erst wenn alle sieben Schritte offen sichtbar abgeschlossen sind, wird der bestehende signierte Verify-Lauf ausgeführt:

```bash
npm run auth:drill -- --verify
```

Nur ein echtes:

```text
Account Auth Production Drill R62: LIVE_AUTH_PASS
```

schließt R62 ab.

## Sicherheitsgrenzen

Der Progress-Helper:

- führt keine Login-Aktion aus,
- verwendet keinen Recovery-Code,
- erzeugt oder entfernt keinen Passkey,
- führt keinen Step-up aus,
- schreibt nichts in die Production-Datenbank,
- gibt weder E-Mail-Adresse noch Creator-ID aus,
- markiert keinen unvollständigen Drill als PASS.
