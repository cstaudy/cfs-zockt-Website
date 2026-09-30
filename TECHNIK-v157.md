# TECHNIK v157 — Workspace Organization / UI-Struktur

**Status:** FEATURE FREEZE ACTIVE / UX-ORDNUNG PASS / REAL ACCEPTANCE OPEN  
**Backend:** 3.20.3  
**Schema Generation:** 73  
**Launcher:** 0.47.28

## Ziel

v157 eröffnet keinen neuen Produktblock. Der Stand ordnet die vorhandene Creator Suite innerhalb des aktiven Feature Freeze neu, damit Creator nicht zwischen vielen Modulnamen suchen müssen.

Die übergeordnete Produktlogik lautet jetzt:

1. **Start & Status**
2. **Gestalten**
3. **Produzieren**
4. **Verbinden**
5. **Community**
6. **System & Tests**

## Launcher

Die Desktop-Navigation ist nach Aufgaben gruppiert:

- Start & Status: LIVE Control
- Verbinden: Bridge, Sync Status
- Produzieren: Stream Deck, Stream Engine, Live Output, OBS Control
- Community: Live Events, AutoThanks, Stream Bot
- Creator Tools: Games & Cut
- System & Tests: Systemcheck, Beta Test, Einstellungen

Alle vorhandenen Views und IDs bleiben erhalten. Die Sidebar-Navigation ist vertikal scrollbar und erhält für geringe Bildschirmhöhen einen kompakteren Rhythmus.

Der bisher sehr allgemeine Menüpunkt `CREATOR TOOLS` heißt sichtbar `GAMES & CUT`, weil genau diese beiden Werkzeuge dort liegen.

## Widget Studio

Der Einfach-Modus ist nicht mehr als flache Liste gleichwertiger Schnellaktionen aufgebaut. Der Einstieg ist in drei lokale Arbeitsphasen gegliedert:

- **Erstellen:** neues Widget, weiterarbeiten, Marke
- **Verwalten:** Favoriten, Entwürfe, veröffentlichte Widgets
- **Weiter zum Stream:** Scene Studio, CFS Studio, Launcher-Status

Die vorhandenen Actions, Filter und Bridge-Funktionen bleiben unverändert; die Änderung betrifft Struktur, Beschriftung und responsives Layout.

## Dashboard / öffentliche Creator Suite

Die bisher verstreuten Einzelmodule sind in sechs Themen zusammengeführt. Der Dashboard-Workspace zeigt die sechs Bereiche mit den passenden Zielseiten. Die öffentliche Creator-Suite-Seite zeigt ebenfalls sechs Themen statt einer langen Liste einzelner Tools.

Die Multistream-Sicherheitsgrenze bleibt sichtbar: `LOCAL MULTISTREAM`; Capture und Zugangsdaten bleiben im Launcher.

## Version / Runtime

- Backend: **3.20.3**
- Schema: **73** unverändert
- Launcher: **0.47.28**
- System Check, `.env.example`, Render Blueprint und Recovery Policy sind auf denselben Launcher-/Backend-Stand synchronisiert.

## Gates

- `workspace157:check` → **69/69 PASS**
- historische Launcher-/Multistream-Verträge auf die neue UI-Taxonomie aktualisiert, ohne Funktionschecks zu entfernen
- vollständiger `npm run release:v157` → **PASS**

## Weiterhin offen

Unverändert offen bleiben reale Windows-/Launcher-/OBS-/Provider-/Multistream-/Reconnect-/Soak-/Multi-Creator-Acceptance sowie Installer/Signing/SmartScreen.
