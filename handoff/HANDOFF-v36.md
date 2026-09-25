# CFS_ZOCKT – Übergabe v36 Editorial Simplification

Stand: 25.09.2026

## Aktueller Stand

- Designbasis: **v24 Creator OS Redesign**
- Visual Refinement: **v33 `LOCAL_VISUAL_POLISH_PASS`**
- Brand Coherence: **v34 `BRAND_COHERENCE_PASS`**
- Welcome & Clarity: **v35 `WELCOME_CLARITY_V35_PASS`**
- Editorial Simplification: **v36 `EDITORIAL_SIMPLIFICATION_V36_PASS`**
- Release Seal: **v25 `RC25_READY`**
- Deploy Automation: **v27**
- Production Evidence Runner: **v30**
- Finalization Readiness: **v31 `READY_FOR_LIVE_FINALIZATION`**
- Product Acceptance: **v32 Harness, frischer v36 Lauf 9/9 `LOCAL_PRODUCT_ACCEPTANCE_PASS`**
- Backend: **3.12.0**
- Launcher: **0.42.0**
- PostgreSQL Schema Generation: **68**

## Ziel von v36

Die öffentliche Startseite soll nicht die gesamte technische Plattform dokumentieren. Sie soll in wenigen Schritten erklären:

1. Was ist cfs_zockt?
2. Was ist mein Plan damit?
3. Was biete ich heute an?
4. Wie kann jemand ohne Druck einsteigen?
5. Wo findet die Community statt und wie werden Status, Daten und Sicherheit behandelt?

Die technischen Details bleiben auf Creator Suite, Roadmap, Pläne, Security und Support erhalten.

## Tatsächliche Reduktion

Vergleich v35 -> v36 im `<main>` der Startseite:

- Sections: **17 -> 9**
- Content-Artikel: **41 -> 10**
- H2-Überschriften: **15 -> 7**
- Wörter: ca. **1388 -> 775**

Damit ist die Startseite deutlich stärker eine Orientierung über Projekt, Plan und Angebot statt eine vollständige Funktionsliste.

## Neue Startseiten-Struktur

- Hero: `MEHR ALS NUR GAMES. / GEMEINSAM CREATOR SEIN.`
- **Über cfs_zockt · Mein Plan** in bewusst persönlicher Sprache
- **Was ich anbiete** als vier verständliche Bereiche:
  - Widget & Stream Studio
  - Creator Suite & Dashboard
  - Launcher & Cut Studio
  - Games & Community
- **Erst verstehen. Dann entscheiden.** als dreistufiger Einstieg
- kompakter Bereich **Sicherheit & Transparenz**
- Community mit TikTok, Discord und Support
- ruhiger Abschluss-CTA

## Was absichtlich aus der Startseite herausgenommen wurde

Die ausführlichen Einzeldarstellungen von Widget Studio, Creator Suite, Launcher, Games, Account-Schutz, Plans und Roadmap werden nicht mehr jeweils als große eigene Homepage-Sektionen wiederholt. Die Inhalte bleiben auf ihren dedizierten Seiten erreichbar.

Funktionale versteckte Flächen wie TikTok-Source-Funnel und opt-in Partnerfläche bleiben erhalten, damit bestehende Flows nicht gebrochen werden.

## Navigation

Auf der Startseite werden visuell **Start, Mein Plan, Angebot, Community und Sicherheit** priorisiert. Detaillierte Produkt-Shortcuts und sekundäre Informationswege bleiben im DOM bzw. Footer/Unterseiten erreichbar, werden auf der Homepage aber bewusst zurückgenommen.

## Architekturgrenze

Kein neuer UI-/OS-Layer. `cfs-os-v24` bleibt die globale Aktivierung. v36 ist in die bestehenden Dateien integriert:

- `public/index.html`
- `public/assets/css/cfs-ui-v18.css`

Logo, Wortmarke, Schrift, Backend-Verträge, Auth/Billing und Creator-IDs bleiben unverändert.

## Lokale Prüfungen

```text
Editorial Simplification v36    16/16 PASS
Project Regression              57/57 PASS
Website Acceptance              34/34 PASS
Accessibility / Responsive      22/22 PASS
Visual Polish Pass 21.3.13      19/19 PASS
Brand Coherence v34             17/17 PASS
Welcome & Clarity v35           15/15 PASS
Product Acceptance full           9/9 PASS
Visual Polish v33               15/15 PASS
Release Candidate v25           49/49 RC25_READY
Deploy Automation v27           18/18 PASS
Post-Deploy lokal               30/30 PASS
```

`reports/product-acceptance-v36.json` dokumentiert den frischen v36-Wiederholungslauf. Historische v32/v34/v35 Evidence-Dateien wurden nicht als neue v36 Evidence umetikettiert.

## Browser-Grenze

Ein frischer Headless-Chromium-Screenshot wurde versucht, terminierte in dieser Sandbox aber nicht zuverlässig. Deshalb **kein neuer v36 Browser-PASS**. Die gespeicherte v33 Browser-/Layout-Evidence bleibt die letzte belastbare lokale Browser-Evidence.

## Noch offen bis vollständige Freigabe

1. Remote, Zielbranch und HEAD-SHA im echten Git-Repository prüfen
2. v36 auf den verifizierten Zielbranch bringen und GitHub Quality Gate real prüfen
3. Render/Canary/External Security/Postdeploy real -> `PRODUCTION_EVIDENCE_PASS`
4. reale Desktop-/Mobile-Abnahme der reduzierten Startseite und der v35 Welcome-Flows
5. reale Launcher-/Widget-/Cut-/Stream-Abnahme im Zielsystem
6. R62 -> `LIVE_AUTH_PASS`
7. R63 -> `LIVE_WINDOWS_PASS`
8. R64 -> `LIVE_SOAK_PASS`
9. R65 -> `LIVE_MONITOR_PASS`
10. R66 -> `LIVE_BILLING_PASS`
11. R67 -> `LIVE_LAUNCH_PASS`

## Evidence-Grenze

Alle oben genannten v33-v36-, Product-, RC25- und Finalization-PASS-Aussagen sind lokal/statisch. Sie sind kein realer GitHub-, Render-, Production-, Geräte-, Windows-Hardware-, OBS-, Monitoring-, Stripe- oder R62-R67-Live-PASS.
