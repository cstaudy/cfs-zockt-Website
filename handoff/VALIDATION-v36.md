# Validation v36

Stand: 25.09.2026

## Editorial Simplification

`npm run editorial36:check` -> **16/16 PASS**.

Der Check bestätigt unter anderem:

- `cfs-os-v24` bleibt globale Aktivierung; kein v36 UI-Layer
- Startseite bleibt unter festen Dichte-Grenzen
- persönliche Projekt-/Plan-Erklärung vorhanden
- Community-first Identität bleibt erhalten
- Angebot ist auf vier Hauptbereiche reduziert
- Einstieg bleibt dreistufig und ohne Verkaufsdruck
- Trust/Security bleibt kompakt und konkret
- Detailtiefe liegt weiterhin auf Creator Suite, Roadmap, Pläne, Security und Support
- TikTok-Source-Funnel und opt-in Partnerfläche bleiben funktional erhalten
- keine Setup-Foto-/`KURZE PAUSE`-Hero-Idee in der Runtime
- keine Fake-Skalen-/Sicherheitsbehauptungen

Aktuelle Homepage-Metriken im Main:

```text
Sections      9
Artikel      10
H2            7
Wörter      775
```

Zum Vergleich v35:

```text
Sections     17
Artikel      41
H2           15
Wörter    ~1388
```

## Regression nach v36

```text
Project small regression        57/57 PASS
Website Acceptance              34/34 PASS
Accessibility / Responsive      22/22 PASS
Visual Polish Pass 21.3.13      19/19 PASS
Brand Coherence v34             17/17 PASS
Welcome & Clarity v35           15/15 PASS
Product Acceptance full           9/9 PASS
Visual Polish v33               15/15 PASS
Release Candidate v25           49/49 RC25_READY
Deploy Automation v27           18/18 PASS
Post-Deploy local               30/30 PASS
```

## Angepasste historische QA-Erkennung

Zwei ältere Conviction-Harnesses erwarteten die vollständige technische Produktdokumentation direkt auf der Homepage. Sie wurden auf die neue Informationsarchitektur angepasst: Die Homepage muss nun die vier Kernangebote und klare Deep-Links zeigen; technische Detailbelege werden auf den dedizierten Creator-Suite-/Roadmap-Seiten geprüft. Dadurch werden Anforderungen nicht entfernt, sondern an der richtigen Stelle geprüft.

## Browser-Grenze

Ein neuer Chromium-Screenshot-Lauf wurde versucht, konnte in der Sandbox aber nicht zuverlässig abgeschlossen werden. Kein neuer Browser-/Device-PASS. Die v33 Browser-Evidence bleibt unverändert die letzte belastbare lokale Render-Evidence.

## Keine Live-Aussage

Keine Aussage als PASS zu:

- echtem GitHub Push / GitHub Actions
- echtem Render Deploy / Canary
- externer DNS/TLS/Edge-Evidence
- realer Geräte-/Production-Browserabnahme
- R62 Live Auth
- Windows-Hardware/Launcher R63
- 2h OBS/LIVE R64
- Monitoring R65
- Stripe LIVE R66
- R67 `LIVE_LAUNCH_PASS`
