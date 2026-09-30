# TECHNIK v156 — Website Clarity Cleanup

**Status:** FEATURE FREEZE ACTIVE / WEBSITE CLEANUP PASS / REAL ACCEPTANCE OPEN  
**Backend:** 3.20.2  
**Schema Generation:** 73  
**Launcher:** 0.47.27

## Ziel

v156 eröffnet keinen neuen Produktblock. Die Änderung räumt die öffentliche Website innerhalb des aktiven Feature Freeze auf und entfernt statische Spielmotive, die wie aktuelle LIVE-/Game-Daten wirken konnten.

## Startseite

Entfernt wurden die drei festen Streamkarten-Bilder:

- CS2
- FC25
- Warzone

Zusätzlich wurde das feste Warzone-Fallback aus der LIVE-Vorschau entfernt. Die Vorschau zeigt jetzt nur dann ein Spielcover, wenn ein echtes `https://`-Cover aus den aktuellen Daten verfügbar ist. Ohne reales Cover bleibt ein neutraler CFS-LIVE-Platzhalter sichtbar.

Die zuletzt gespielten PlayStation-Titel dürfen weiterhin echte Remote-Cover anzeigen. Lokale statische GAME_ART-Fallbacks wurden entfernt, damit fehlende Daten nicht durch Demo-Grafiken ersetzt werden.

## Verständlichkeit

- Hero-CTA: `STREAMS ANSEHEN` oder `CREATOR SUITE`
- keine pauschale `JETZT LIVE`-Behauptung
- Stream-Bereich: `STREAMS & CONTENT` statt eines Streamplans ohne echte Termine
- textbasierte Community-/Gaming-/Special-Karten statt fester Spielbilder
- private geschlossene Beta auf Startseite, Login, Plans und Creator Suite klar benannt
- Stream-Studio-Link zeigt auf den richtigen Tools-Bereich
- Multistream wird nicht mehr als ungebaute Roadmap-Funktion dargestellt; offen ist die reale Acceptance

## Version / Runtime

Backend wurde auf **3.20.2** angehoben, damit System Check und öffentlich sichtbarer Buildstand den Website-Patch eindeutig identifizieren. Schema und Launcher ändern sich nicht.

## Gates

- `homepage156:check` → **32/32 PASS**
- `project:check` → **40/40 PASS**
- `website150:check` → **PASS**
- kompletter `npm run release:v156` → **PASS**

## Weiterhin offen

Die reale Acceptance bleibt unverändert offen: Windows/Launcher, OBS, Twitch LIVE, TikTok LIVE mit offiziellem Encoder-Zugang, YouTube nach Betreiber-OAuth-Setup, Multistream/Reconnect, Soak, Multi-Creator sowie Installer/Signing/SmartScreen.
