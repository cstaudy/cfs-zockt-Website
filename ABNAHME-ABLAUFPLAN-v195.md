# CFS ZOCKT v195 — Ablaufplan für die feste Abnahme

## Ziel

v195 ist die **feste Acceptance-Basis** nach dem Website-/Brand-Stand v192. Ab Beginn der Abnahme gilt Feature Freeze: **keine neuen Features**, keine stillen Runtime-/Asset-Änderungen und keine Versionssprünge innerhalb desselben Testlaufs.

Ein echter Release-GO darf erst nach den **48 Realtests** der v190-Matrix und einer manuellen Go/No-Go-Entscheidung erfolgen. Automatisierte Checks dürfen nur Vorbereitung, Integrität und Evidence prüfen.

## 0. Verbindliche Artefakte

Für einen Abnahmelauf müssen zusammen archiviert werden:

- `cfs-zockt-v195-full-project.zip`
- `cfs-zockt-v195-full-project.zip.sha256`
- `cfs-zockt-v195-all-current-update-files.zip`
- `cfs-zockt-v195-all-current-update-files.zip.sha256`
- `cfs-zockt-v195-acceptance-lock.json`
- `reports/rc-freeze-v195.json`
- `reports/rc-fixed-baseline-v195.json`

Die SHA-256-Werte und der Acceptance-Lock bestimmen **exakt** den Kandidaten. Wird ein Runtime-/Tooling-File verändert, ist der Lauf ungültig und es wird ein neuer Kandidat erzeugt.

## 1. Saubere Windows-Testmaschine

Empfohlen:

- Windows 11 mit aktuellen Updates
- normales Benutzerkonto plus getrennte Admin-Möglichkeit für Installation
- aktuelles Chrome oder Edge
- OBS Studio mit WebSocket-Unterstützung auf lokalem Port 4455
- keine produktiven Creator-/Provider-Secrets in Screenshots oder Logs
- separate Twitch-, TikTok- und YouTube-Testaccounts

Full Project in einen neuen Ordner entpacken. Kein alter `node_modules`-Ordner übernehmen.

## 2. Paket und Freeze vor dem Start prüfen

PowerShell:

```powershell
Get-FileHash .\cfs-zockt-v195-full-project.zip -Algorithm SHA256
```

Hash mit `.sha256` und `cfs-zockt-v195-acceptance-lock.json` vergleichen. Danach im entpackten Projekt:

```powershell
npm ci
npm run freeze195:verify
npm run freeze195:secret
npm run release:v195
```

Alle Befehle müssen PASS/Exit 0 liefern. Bei Freeze-Drift: **STOP**, Kandidat nicht weiter abnehmen.

## 3. Target-Preflight

OBS starten und WebSocket aktivieren. Dann:

```powershell
npm run acceptance191:preflight -- --target-windows --probe-obs
```

Der Preflight muss ohne Blocker enden. Warnungen dokumentieren und bewerten; Blocker stoppen die Abnahme.

## 4. Acceptance-Lauf initialisieren

Status prüfen:

```powershell
npm run acceptance190:status
npm run acceptance191:evidence -- status
npm run acceptance191:go-no-go
```

Zu Beginn muss die reale Matrix **0/48** aufgelöst und `HOLD` sein. Bereits vorhandene PASS-Werte aus einem anderen Kandidaten dürfen nicht übernommen werden.

## 5. Realtests — feste Reihenfolge

Die 48 Fälle werden in dieser Reihenfolge ausgeführt, damit Fehler früh isoliert werden:

1. **Windows / Launcher** — Installation, Portable Start, Device Link, SafeStorage, Update, Diagnostics, Signing.
2. **OBS** — Browser Widget, Browser Scene, WebSocket, Scene Switch, Widget Install, Boundary-Test.
3. **Twitch** — OAuth, Reauth, Sync, Events, Stream Target, Revoke/Reconnect.
4. **TikTok** — Connect, Events, Reconnect, 9:16 Output; Stream Target nur bei offiziellem Encoder-/Stream-Key-Zugang.
5. **YouTube** — OAuth, Channel/Refresh, Live/Chat, monetarisierte Events soweit verfügbar, Stream Target.
6. **Multistream** — zwei Ziele parallel, Isolation, manueller Stop, Custom RTMP lokal, No-Cloud-Secret.
7. **Stabilität** — Network Drop, Provider Drop, Launcher Restart, Watchdog und mindestens 60 Minuten Soak.
8. **Browser / Responsive** — Public, Creator, Admin, reales Mobilgerät, Keyboard/Fokus/ARIA-Basis.
9. **Security** — Passkey/WebAuthn auf echter Hardware, Creator-Isolation, Admin-Isolation, finaler Secret Review.

## 6. Evidence je Fall erfassen

Evidence-Dateien nur unter `evidence/` ablegen und keine OAuth-Tokens, Stream Keys, RTMP-Ziele, Passwörter oder private Schlüssel aufnehmen.

Beispiel:

```powershell
npm run acceptance191:evidence -- add --id evidence-windows-clean-install --case windows.clean_install --kind screenshot --file evidence/windows/clean-install.png --notes "Clean install completed"
```

Danach den zugehörigen Testfall mit der ausgegebenen Evidence-Referenz setzen:

```powershell
npm run acceptance190:record -- --id windows.clean_install --status pass --reference evidence-windows-clean-install --notes "Windows 11 clean install erfolgreich"
```

Für `fail`, `blocked` oder `skip` immer eine nachvollziehbare Notiz angeben. Pflichtfälle mit `skip` bleiben Blocker.

## 7. 60+-Minuten-Soak

Vor dem Soak:

```powershell
npm run acceptance191:soak-plan
```

Während des Laufs Diagnoseereignisse redigiert erfassen. Der Test umfasst Baseline, Provider-Drop, Network-Drop, Launcher-Restart und anschließende Stabilitätsphase. Kritische Fehler oder Secret-Leaks = FAIL.

## 8. Nach jeder Testgruppe

```powershell
npm run freeze195:verify
npm run acceptance191:evidence -- verify
npm run acceptance190:status
npm run acceptance191:go-no-go
```

Freeze-Drift stoppt den gesamten Kandidaten. Ein Bugfix erzeugt **einen neuen Release-Kandidaten und einen neuen Acceptance-Lock**; bereits ausgeführte Tests werden nur übernommen, wenn sie vom Fix nachweislich unberührt sind und dies dokumentiert wird.

## 9. Finaler Go/No-Go

Nach dem letzten Realtest:

```powershell
npm run freeze195:verify
npm run acceptance191:evidence -- verify
npm run acceptance190:status:strict
npm run acceptance191:go-no-go:strict
```

Erwartung vor der manuellen Entscheidung:

- 48/48 Fälle aufgelöst; Pflichtfälle PASS
- zulässige Conditional-Fälle PASS oder begründet SKIP
- alle PASS-Fälle besitzen gültige Evidence
- Freeze unverändert
- kein Secret-Leak
- höchster automatischer Status: `READY_FOR_MANUAL_GO_NO_GO`

Danach erfolgt eine **bewusste manuelle GO/NO-GO-Entscheidung**. Kein Script setzt selbstständig Production-GO.

## 10. Nach GO

- Acceptance-Reports, Evidence-Index, Diagnose-/Soak-Berichte und Acceptance-Lock unveränderlich archivieren.
- Full Project SHA-256 als freigegebenen Produktionsstand dokumentieren.
- Erst danach Deployment-Freigabe.
- **Commerce bleibt weiterhin aus**, bis Checkout/Payment/Entitlements/Steuern/Refunds als eigener späterer Block implementiert und separat abgenommen sind.

## Abbruchkriterien

Sofort `NO-GO/HOLD`, wenn mindestens einer dieser Punkte eintritt:

- Freeze- oder Paket-Hash stimmt nicht.
- Pflichtfall FAIL/BLOCKED/SKIP/PENDING.
- Evidence fehlt oder Hash stimmt nicht.
- Creator-/Admin-Isolation verletzt.
- OAuth-/Stream-/RTMP-Secret gelangt in Browser, DB, Log oder Support-Evidence.
- OBS/Launcher verliert einen Zustand ohne kontrollierte Recovery.
- Soak zeigt kritischen Crash, unkontrollierten Reconnect-Loop oder Datenverlust.
