# CFS Zockt · Übergabe 3.20.60

## Basis / Ziel
3.20.59 → 3.20.60 · Arbeitsblock 01: Provider-Matrix und Live-Event-Datenbindungen.

## Ergebnis
**CODE-FOKUSTESTS PASS · BETA-ACCEPTANCE HOLD.** Twitch erhält Follow-/Bits-Session-Counter und Goals; Events werden an aktuelle Sessions gebunden; Twitch-/YouTube-Status kann stale werden; Mock-Ereignisse befüllen keine produktiven Live-Metriken.

## Nicht geändert
- Schema 80, kein DB-Migrationsschritt.
- Windows Launcher 0.47.31; kein neuer EXE-Build.
- Keine Provider-Logins, keine echte OBS-Abnahme, kein Checkout-/Entitlement-Wechsel.
- 3.20.59-Motiv-Konverter bleibt erhalten.

## Tests
- `npm run check:v32060` PASS (fokussierte Tests; neue Providertests 34/34).
- `npm run check:v32059` nicht vollständig PASS: gelieferte alte Regression enthält fehlende Testdateien; siehe `UPDATE-3.20.60.md`.
- Live-Acceptance für Twitch, TikTok, YouTube, Render, Windows/OBS und 60-Minuten-Soak offen.

## Einbau
Im Delta-Verzeichnis `node install-update.cjs --check <Projektpfad>` und dann `--apply`. SHA-Guard/Backup. Alternativ Vollarchiv 3.20.60. Bei lokalen Änderungen immer Konflikte manuell zusammenführen.

## Nächster Block
1. Fehlende ältere Testtargets/CI-Regressionen aus vollständiger Quelle wiederherstellen.
2. Provider-Testkonten und Windows/OBS-Evidence: Twitch Follow/Bits/Resub, TikTool Gift/Like/Share, YouTube Live Chat/Super Chat, Offline/Reset.
3. Danach Arbeitsblock 03 · einfacher Gesamt-Flow und 04 · Tonstudio.

## Kern-Dateien
- `server.js`
- `lib/widget-provider-live-policy.js`
- `public/assets/js/widget-studio.js` + `public/pages/widget-studio.html` (Browser-Cache-Key)
- `tools/provider-live-binding-v32060-test.mjs`
- `FUNKTIONSLUECKEN-STATUS-3.20.60.md`
- `UPDATE-3.20.60.md`
