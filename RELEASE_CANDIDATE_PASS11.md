# cfs_zockt – Release Candidate Pass 11

**Stand:** 15.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.42.0  
**Node.js:** 22+

## Ziel

Pass 11 zieht den kumulativen Projektstand über die kleinen Regressionen hinaus durch die vorhandenen automatisierten Release-Gates und trennt anschließend klar zwischen intern verifizierbarem Codezustand und externen Production-Gates.

## Wiederhergestellte / korrigierte QA-Gates

Während des Release-Laufs wurden mehrere Verpackungs- bzw. historische QA-Inkonsistenzen gefunden und behoben:

- `tools/server-runtime-symbols-v42-test.mjs` wiederhergestellt
- vier Root-Post-V42-Tests wiederhergestellt:
  - `post-v42-stability-test.mjs`
  - `post-v42-creator-isolation-test.mjs`
  - `post-v42-recovery-test.mjs`
  - `post-v42-security-test.mjs`
- `launcher/tools/post-v42-bridge-controls-test.mjs` wiederhergestellt
- Fake-Bridge um die aktuellen Stream-Bot-/Counter-/Timer-Control-Endpunkte ergänzt
- historischen V10-Test auf die absichtlich exakt gepinnte `tiktok-live-api`-Version aktualisiert
- Creator-Isolation-QA an die CSP-konforme Architektur mit ausgelagertem JavaScript und aktuellem Admin-Control-Center angepasst
- Release-Gate-Runner schreibt jetzt nach jedem Gate einen Checkpoint

Dabei wurden Tests nicht entfernt, um einen grünen Zustand zu erzwingen. Gefundene Lücken wurden wiederhergestellt bzw. an die reale aktuelle Architektur angepasst.

## Automatisierter Nachweis

`npm run release:preflight` ist vollständig bestanden. Es umfasst:

- `npm run project:check` – 21/21 kumulative Bereiche PASS
- `npm run check:v42` – PASS
- `npm run check:post-v42` – PASS
- `npm run check:acceptance-part2` – PASS

Zusätzlich wurden alle **98/98 Launcher-/Release-Gates** ausgeführt und bestanden. Der Lauf musste wegen des äußeren Ausführungszeitlimits in Segmente geteilt werden; jedes Gate wurde tatsächlich ausgeführt. Der zusammengeführte Report liegt unter `launcher/reports/release-gate.json` und `.md`.

Die automatisierten Gates decken unter anderem Bridge, Recovery, Output, Stream Deck, Provider, Media-/Cut-Pfade, Billing-/Release-Simulationen, E2E, Stress, OBS-Multi-Widget und Acceptance-Part-2 ab.

## Release-Urteil

### Interner Code-/Automationsstatus

**GO – Release Candidate.**

Auf dem aktuell automatisiert prüfbaren Projektstand liegt kein bekannter roter interner Release-Gate mehr vor.

### Öffentlicher Production-Launch

**NO-GO – externe Gates noch offen.**

Die folgenden Punkte sind nicht durch lokale/static/simulierte Tests ersetzbar:

1. **DNS / Domain / TLS**  
   `cfs-zockt.de` ließ sich aus der aktuellen Prüfumgebung nicht auflösen. Deshalb konnten echtes Zertifikat, HTTP→HTTPS, Canonical-Host, HSTS und die tatsächlich ausgelieferten Production-Header nicht verifiziert werden.

2. **Reproduzierbare transitive Dependencies**  
   Root und Launcher besitzen noch kein `package-lock.json`. Direkte Dependencies sind zwar exakt gepinnt, aber erst mit geprüften Lockfiles und `npm ci` ist die transitive Installationsbasis reproduzierbar. In dieser Laufzeit konnte npm die Registry nicht zuverlässig erreichen; es wurden deshalb bewusst keine Lockfiles erfunden.

3. **Featureabhängige externe Realtests**  
   - Account-Mail-Relay: echte Zustellung/Fehlerfälle, bevor E-Mail-Verifizierung verpflichtend wird
   - Passkeys: echte WebAuthn-Ceremony auf der finalen HTTPS-Origin mit realem Authenticator
   - Windows/Installer/Hardware/LIVE: reale Tests entsprechend dem tatsächlichen Release-Scope

## Schritte zum Production-GO

1. DNS/Custom-Domain korrekt konfigurieren und öffentlich auflösbar machen.
2. Root- und Launcher-Lockfiles in einer vertrauenswürdigen npm-Netzwerkumgebung erzeugen und prüfen.
3. Deployment auf `npm ci` umstellen.
4. erforderliche Production-Secrets setzen; Production muss weiterhin fail-closed bleiben.
5. Staging/Production deployen.
6. `npm run edge:check` gegen die reale Domain ausführen.
7. aktivierte externe Funktionen real testen (Mail, Passkeys, Windows/LIVE je nach Scope).
8. finalen Freeze durchführen und erst dann Production-GO erteilen.

## Versionsregel

Backend bleibt **3.12.0**, Launcher bleibt **0.42.0**. Pass 11 ist ein Release-Candidate-/QA-Pass, kein Versionssprung.
