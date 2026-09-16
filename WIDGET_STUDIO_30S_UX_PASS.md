# cfs_zockt – Widget Studio 30-Sekunden-UX-Pass
Stand: 15.09.2026

## Ziel
Der Einfach-Modus soll neue Creator bei den wichtigsten Widget-Familien schneller zu einem brauchbaren Ausgangspunkt bringen, ohne Funktionen aus dem Profi-Modus zu entfernen oder automatisch zu veröffentlichen.

## Umgesetzt
- Neuer „30-Sekunden-Start“ im Erstellungsbereich für Goal, Counter, Timer, Chat und Kamera.
- Ein Klick wählt einen zum aktuellen Stream-Bereich passenden Widget-Typ und das Standard-Startdesign.
- TikTok LIVE bevorzugt echte Profil-/LIVE-Varianten, sofern sie im aktuellen Plan verfügbar sind.
- OBS verwendet für Goal, Counter und Timer bewusst manuelle Varianten ohne erfundene Twitch-Daten.
- TikTok-Kamera bevorzugt den 9:16-Rahmen; OBS den 16:9-Rahmen.
- Chat bleibt an TikTok LIVE als Datenquelle gebunden und respektiert die vorhandene Plan-Freigabe.
- Neue Widgets springen nach der bereits erfolgten Designauswahl direkt zu „Inhalt“; Kamera-/Szenenrahmen direkt zu „Design“.
- Die Schnellstarts wenden einen vorhandenen, einfachen Rezept-Start an:
  - Goal: Klar & direkt
  - Counter: Clean Zahl
  - Timer: Clean Timer bzw. LIVE Timer
  - Chat: Ausgewogen
  - Kamera: Soft Rounded
- Alle sechs Einfach-Schritte bleiben erreichbar: Vorlage, Inhalt, Design, Position, Effekte, Testen.
- Profi-Modus und alle vorhandenen Detailoptionen bleiben unverändert verfügbar.
- Kein Schnellstart veröffentlicht automatisch.

## Plan-/Datenregeln
- Keine Twitch-Funktion wird vorgetäuscht.
- Plan-Sperren werden nicht umgangen.
- LIVE-Daten bleiben an die bestehenden TikTok-/Bridge-Regeln gebunden.
- Manuelle Varianten bleiben plattformunabhängig steuerbar.

## Checks
- `npm run check`
- `npm run security:check`
- `npm run seo:check`
- `npm run funnel:check`
- `npm run reviews:check`
- `npm run ux30:check`
- `node --check public/assets/js/widget-studio.js`

Backend-Version bleibt 3.12.0. Launcher-Version wird nicht verändert. Große Acceptance-, Last- und LIVE-Tests bleiben pausiert.
