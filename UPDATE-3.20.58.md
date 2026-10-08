# CFS ZOCKT Creator Suite 3.20.58

## Schwerpunkt
Klare Aufgabentrennung zwischen Stream Maker und Widget Studio.

### Stream Maker
Der Standardweg ist ab jetzt ausschließlich für den visuellen Stream-Look vorgesehen:
- Masterbild
- Kamera-Rahmen
- Namens-/Social-Leisten
- Start/Pause/Ende/Offline-Screens
- Panels
- vollständiges Design-Bundle

Goals, Counter und Timer werden im neuen Standardkatalog nicht mehr angeboten. Der Masterbild-Generator erzeugt nur noch visuelle Design-Bausteine.

### Widget Studio
Der einfache Einstieg konzentriert sich auf dynamische Inhalte:
- Goals
- Counter
- Timer
- Chat
- Events / Alerts
- Latest Events
- Provider-Daten

Kamera-/Overlay-Erstellung wurde aus dem Simple-Quickstart entfernt. Bestehende statische Widget-Typen bleiben im Profi-/Legacy-Pfad erhalten.

### Kompatibilität
Bestehende Bundles und Widget-Projekte werden nicht migriert oder gelöscht. Alte dynamische Stream-Maker-Bausteine bleiben editierbar und werden als Legacy gekennzeichnet.

## Versionen
- Website / Backend: **3.20.58**
- Schema: **80**
- Launcher: **0.47.31**

## Acceptance
Code-/Regressionstests können lokal ausgeführt werden. Reale Windows-/OBS-/Provider-/Browser-/Soak-Acceptance bleibt offen.

## Teststatus
- Studio Role Separation: **18/18 PASS**
- Master Image Generator v3.20.50: **32/32 PASS**
- Widget Studio 30s UX: **41/41 PASS**
- Stream-Maker-Handoff / Model / Lifecycle: **PASS**
- `npm run check:v32058`: **PASS**
- Installer: Check / Apply / Wiederholung / Konfliktschutz: **PASS**
