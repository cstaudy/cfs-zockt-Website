# cfs_zockt – Browser Request Integrity / Supply-Chain Baseline

Stand: 15.09.2026

## Ziel

Den bisherigen Browser-, Session- und CSRF-Schutz so härten, dass zustandsändernde Browser-Requests ohne positive Herkunftssignale nicht mehr still akzeptiert werden. Gleichzeitig werden sensible Antworten gegen Zwischen-/Shared-Caches abgesichert und direkte Node-Abhängigkeiten reproduzierbarer gemacht.

## Umgesetzt

- `browserWriteSourceAllowed()` arbeitet fail-closed.
- `cross-site` und `same-site` werden für geschützte Browser-Schreibwege abgewiesen.
- Wenn Origin/Referer vorhanden sind, müssen sie exakt aus der Trusted-Origin-Allowlist stammen.
- Fehlen Origin/Referer, ist mindestens `Sec-Fetch-Site: same-origin` erforderlich.
- Account-, Creator-, Admin-, Billing-, Launcher-, Bridge- und Auth-Antworten erhalten zentral `Cache-Control: no-store, private, max-age=0`, `Pragma: no-cache` und `Expires: 0`.
- Sensitive Responses variieren zusätzlich über `Cookie` und `Authorization`.
- CSRF bleibt sessiongebunden und unverändert aktiv.
- Direkte Abhängigkeiten in Root- und Launcher-`package.json` sind exakt gepinnt.
- `.npmrc` setzt `save-exact=true` und `engine-strict=true`.

## Bewusst offen

Im Paket existiert noch kein `package-lock.json`. Ein Versuch, ihn in der aktuellen Laufzeit über npm zu erzeugen, konnte wegen fehlender/unerreichbarer Registry nicht abgeschlossen werden. Deshalb wird kein Lockfile erfunden. Vor Production/Release muss ein Lockfile in einer vertrauenswürdigen npm-Umgebung erzeugt, geprüft, committed und danach für Deployments `npm ci` verwendet werden.

## Kleine Checks

- `npm run requestintegrity:check` – 20/20
- `npm run supply:check` – direkte Dependency-Baseline PASS, Lockfile WARN
- `npm run project:check` – kumulative kleine Regressionen; keine großen Acceptance-/Last-/LIVE-Tests
