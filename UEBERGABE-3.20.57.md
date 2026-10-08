# CFS ZOCKT · Übergabe 3.20.57

## 1. Release-Kopf

- **Basisversion:** 3.20.56
- **Zielversion:** 3.20.57
- **Website / Backend:** 3.20.57
- **Datenbankschema:** 80
- **Launcher-Ziel:** 0.47.31
- **Status:** ALL TESTS READY · reale Acceptance noch OFFEN

## 2. Ziel dieses Updates

3.20.57 baut keine neue Creator-Funktion. Der Stand vereinheitlicht die komplette Beta-Abnahme, damit alle offenen Bereiche reproduzierbar getestet und mit Evidence dokumentiert werden können.

## 3. Geänderte Bereiche

### Beta Acceptance Core
- gemeinsame Matrix mit 10 Testgruppen und mindestens 55 realen Testfällen
- Status: pending / pass / fail / blocked / conditional skip
- Pflicht-PASS verlangt Evidence-Referenz
- Conditional-SKIP verlangt Begründung oder Evidence
- Web-Matrix und CLI verwenden denselben Acceptance-Vertrag
- Web-Export erzeugt CLI-kompatible `records`

### Testgruppen
- Windows / Launcher / OBS
- Twitch
- TikTok
- YouTube
- Multistream
- Browser / Responsive / Accessibility
- Account / Security
- Shop / Creator Downloads
- Creator End-to-End
- Stability / Recovery / Soak

### Testwerkzeuge
- `npm run beta:init`
- `npm run beta:status`
- `npm run beta:preflight`
- `npm run beta:preflight:windows`
- `npm run beta:windows-kit`
- `npm run beta:evidence`
- `npm run beta:go-no-go`
- `npm run beta:go-no-go:strict`

### Evidence / GO-NO-GO
- Evidence-Verzeichnis: `evidence/beta-3.20.57/`
- rekursives Manifest mit SHA-256
- Text-Evidence wird auf typische Secrets geprüft
- kein automatisches Release-GO; maximal `READY_FOR_MANUAL_GO_NO_GO`

### npm-Script-Hygiene
- aktive Test-Scripts zeigen nicht mehr auf fehlende Node-Dateien oder fehlende npm-Unter-Scripts
- entfernte historische Scriptdefinitionen sind unter `docs/legacy-npm-scripts-3.20.57.json` archiviert

### Übergabe-Standard
- ab diesem Stand ist `UEBERGABE-<Version>.md` für jedes Update Pflicht
- Standard: `docs/UPDATE-UEBERGABE-STANDARD.md`

## 4. Bewusst nicht geändert

- keine Datenbankmigration
- kein neuer Launcher-Build
- keine neue Creator-Funktion
- kein automatisches PASS für Realtests
- keine automatische Freigabe einer öffentlichen Beta
- keine Provider-Credentials im Repository

## 5. Teststatus

Ausgeführt und grün:

```bash
npm run beta:check
npm run check:v32057
```

Der Acceptance-Lifecycle wurde zusätzlich real ausgeführt:

```bash
npm run beta:init -- --force
npm run beta:status
npm run beta:preflight
npm run beta:windows-kit
npm run beta:evidence
npm run beta:go-no-go
```

Ergebnis vor den echten Realtests:
- Code-/Tool-Gates: **PASS**
- Release-Handover: **16/16 PASS**
- Acceptance Matrix: **0/56 · HOLD**
- Evidence Secret Scan: **PASS**
- GO/NO-GO: **HOLD**
- strikter GO/NO-GO bei HOLD: **Exit 2**

Das HOLD ist korrekt und ausdrücklich **kein Fehler**. Es verhindert ein falsches Beta-GO vor der realen Abnahme.

Installer-Prüfung auf sauberem 3.20.56-Stand:
- `--check`: **29 Dateien** updatefähig
- `--apply`: **29 Dateien** installiert
- zweiter `--check`: **0 Änderungen**
- installierter Stand: `npm run check:v32057` **PASS**
- Konflikttest mit absichtlich verändertem Systemcheck: **Exit 1**, eigene Datei unverändert, `package.json` unverändert

## 6. Externe / manuelle Acceptance noch offen

### Block A · Windows / Launcher / OBS
- Clean Install
- Device Link / Heartbeat / Capabilities
- OBS WebSocket 4455
- Widget One-Click
- OBS Restart / Reconnect
- Application Audio
- Game Capture
- Recording / Cut Handoff

### Block B · Provider
- Twitch OAuth / Chat / EventSub / Refresh / Reconnect
- TikTok LIVE über tatsächlich verfügbaren offiziellen Providerweg
- YouTube OAuth / Broadcast / Live Chat / Refresh
- Multistream mit mindestens zwei realen Zielen

### Block C · Browser / UX
- Chromium / Edge
- Firefox
- Mobile Breakpoints
- Keyboard / Fokus
- Admin-/Creator-Rechte
- Dashboard, Shop und Kernstudios

### Block D · Stability
- Netzwerkunterbrechung
- Providerunterbrechung
- Launcher/OBS-Reconnect
- 60-Minuten-Soak
- P0/P1-Triage

## 7. Einbau und Konfliktschutz

3.20.57 wird als Delta auf 3.20.56 ausgeliefert. Der Installer muss:
- nur erwartete 3.20.56-Dateihashes akzeptieren
- eigene/abweichende Dateien nicht überschreiben
- Backups vor Ersetzung anlegen
- bei Konflikt vor jeder Änderung abbrechen
- nach erfolgreichem Einbau idempotent `0 Änderungen` melden

## 8. Bekannte offene Punkte / Risiken

- reale Windows-/OBS-/Provider-Acceptance ist noch nicht durchgeführt
- TikTok-Funktionen sind abhängig vom tatsächlich verfügbaren offiziellen Zugang
- YouTube-Monetarisierungs-/optionale Providerfeatures bleiben conditional
- Commerce/Kaufabwicklung ist nicht Bestandteil dieses Acceptance-Updates
- keine Beta-Freigabe allein aufgrund grüner automatischer Tests

## 9. Nächster Arbeitsblock

**Keine neue Kernfunktion bauen.**

Nächster Schritt ist die reale Acceptance in dieser Reihenfolge:
1. Windows + Launcher + OBS
2. Twitch real
3. TikTok / YouTube / Multistream soweit offiziell verfügbar
4. Browser-/Responsive-Matrix
5. Creator-E2E
6. 60-Minuten-Soak
7. P0/P1 beheben
8. manueller GO/NO-GO für ersten Beta-RC

## 10. Wichtige Dateien / Einstiegspunkte

- `public/pages/beta-acceptance.html`
- `public/assets/data/beta-acceptance-v32057.json`
- `public/assets/js/page-beta-acceptance-v32057.js`
- `lib/beta-acceptance-v32057.js`
- `tools/beta-acceptance-v32057.mjs`
- `tools/beta-preflight-v32057.mjs`
- `tools/beta-evidence-v32057.mjs`
- `tools/beta-go-no-go-v32057.mjs`
- `tools/beta-windows-kit-v32057.mjs`
- `docs/UPDATE-UEBERGABE-STANDARD.md`
- `docs/legacy-npm-scripts-3.20.57.json`
