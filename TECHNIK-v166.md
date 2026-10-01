# Technik v166

- Backend: **3.20.12**
- Schema Generation: **73**
- Launcher: **0.47.29**
- Feature Freeze: aktiv

## Änderung

v166 ist ein reiner UX-/Informationsarchitektur-Pass für den eingeloggten Creator-Alltag.

- Dashboard: ein nächster Schritt + vier Schnellzugriffe im ersten Blick
- LIVE-Fallback weiterhin direkt erreichbar
- Status, Stream-Startcheck, Runtime und Berechtigungen in `Status & Diagnose`
- Account: Profil / Sicherheit / Sitzungen / Daten & Konto
- redundante Account-Verwaltungsnavigation entfernt
- technische Account-Schutzdetails eingeklappt
- transparente CFS-Wortmarke auch im Dashboard/Account

Keine neue Datenbankmigration, kein neuer Provider-Scope und keine Änderung an Stream-Credentials.

## Validierung

- `creator-daily166:check`: **88/88 PASS**
- `project:check`: **40/40 PASS**
- `public-live-control-v132`: **9/9 PASS**
- `workspace-organization-v157`: **69/69 PASS**
- `website-acceptance-pass21-3-14`: **34/34 PASS**
- vollständiger `release:v166`: **PASS / Exit 0**

Ein separat gestarteter historischer `creator-stream-ready-v142-test.mjs` erwartet noch einen früheren Widget-Studio-Funktionsnamen und ist nicht Teil des aktuellen Release-Gates. Die aktuelle Widget-/OBS-Logik wurde dafür nicht zurückgebaut.
