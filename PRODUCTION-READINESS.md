# CFS ZOCKT – Production Readiness

## Einziger normaler Einstieg

Unter Windows im Repository doppelklicken oder aus PowerShell starten:

```powershell
.\RUN-PRODUCTION-LIVE-TESTS.cmd
```

Der Controller läuft in Node.js 22+ und führt die Production-Nachweise R59–R66 in Reihenfolge aus. Bereits vorhandene Evidence wird als `FOUND` angezeigt und nicht als kryptografisch verifizierter PASS ausgegeben. Die Endverifikation übernimmt R67.

## Bedeutungen

- `PASS_THIS_RUN`: der Test wurde in diesem Prozess erfolgreich ausgeführt und die erwartete Evidence wurde erzeugt.
- `FOUND`: passende Evidence ist vorhanden; die kryptografische Endverifikation durch R67 steht noch aus.
- `OPEN`: Nachweis fehlt oder wurde übersprungen.
- `FAIL/BLOCKED`: echter Fehler oder fehlende Voraussetzung.

`SKIP` erzeugt niemals einen PASS.

## Optionale Modi

```powershell
.\RUN-PRODUCTION-LIVE-TESTS.cmd --status
.\RUN-PRODUCTION-LIVE-TESTS.cmd --check
.\RUN-PRODUCTION-LIVE-TESTS.cmd --next
.\RUN-PRODUCTION-LIVE-TESTS.cmd --round R60
.\RUN-PRODUCTION-LIVE-TESTS.cmd --r67
```

`RUN-NEXT-PRODUCTION-TEST.cmd` ist nur ein Alias für `--next`.

## Finaler R67-Schritt

Erst wenn R59–R66 Evidence vollständig ist, importiert/verifiziert R67 die Evidence. Danach müssen in der echten Render Production Shell weiterhin diese beiden Befehle laufen:

```bash
npm run render:drill -- --strict-env --live --target https://cfs-zockt.de
npm run launch:gate -- --collect-defaults --verify
```

Das finale Ziel bleibt:

```text
Launch Production Gate R67: LIVE_LAUNCH_PASS
```
