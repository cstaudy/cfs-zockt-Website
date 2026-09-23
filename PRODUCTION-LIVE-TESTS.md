# Production LIVE Tests R59-R67

Primärer Windows-Einstieg:

```text
RUN-PRODUCTION-LIVE-TESTS.cmd
```

Der Runner sucht einen vollständigen Checkout automatisch, aktualisiert einen sauberen Git-Checkout oder klont einen frischen Stand, führt `npm ci` aus und bewahrt erzeugte Evidence lokal unter
`%USERPROFILE%\Documents\cfs-zockt-production-evidence` auf.

## Reihenfolge

1. R59 — Render Production LIVE (`LIVE_PASS`)
2. R60 — echtes verschlüsseltes Backup + Restore in eine separate **leere** Recovery-DB (`LIVE_RESTORE_PASS`)
3. R61 — drei echte Mail-Kategorien; Codes müssen aus dem Testpostfach zurückgegeben werden (`LIVE_MAIL_PASS`)
4. R62 — echter Passkey-/TOTP-/Recovery-Code-Drill; Nachweis über Production-Security-Events (`LIVE_AUTH_PASS`)
5. R63 — echtes Windows, Authenticode, Clean Install, Device Link, Updater, Audio-/Game-Capture-Hardware (`LIVE_WINDOWS_PASS`)
6. R64 — mindestens 2 Stunden OBS/LIVE mit Heartbeats und >=90% Coverage (`LIVE_SOAK_PASS`)
7. R65 — echter externer signierter Monitoring-Webhook; Code muss am externen Ziel ankommen (`LIVE_MONITOR_PASS`)
8. R66 — echter Stripe LIVE Test. Der Runner führt **keine Zahlung** aus; Checkout und Cancel-Toggle müssen manuell erfolgen (`LIVE_BILLING_PASS`)
9. R67 — lokale R60-R66 Evidence kryptografisch prüfen und in Production-DB importieren; danach finaler Runtime-Test in Render.

`CHECK` führt die statischen Security-Gates R59-R67 aus, ersetzt aber keinen LIVE-Test.

## Finaler R67-Schritt

Nachdem R60-R66 bestanden und über den R67-Menüpunkt importiert wurden, im **Render Shell** des Production Web Service ausführen:

```text
npm run render:drill -- --strict-env --live --target https://cfs-zockt.de
npm run launch:gate -- --collect-defaults --verify
```

Nur ein echtes

```text
Launch Production Gate R67: LIVE_LAUNCH_PASS
```

schließt das zentrale Launch-Gate ab.

## Sicherheitsregeln

- Production-DB wird beim R60-Drill nur gelesen/gedumpt. Restore-Ziel muss eine andere, leere DB sein.
- Secrets werden von den Windows-Runnern verdeckt abgefragt und nicht in diese Dokumentation oder Chat-Ausgaben geschrieben.
- Ein fehlender externer/hardwarebezogener Nachweis bleibt `BLOCKED`/`FAIL`; es gibt keine simulierten PASS-Ergebnisse.
- Stripe LIVE kann reale Kosten verursachen. Finanzaktionen bleiben bewusst manuell.
