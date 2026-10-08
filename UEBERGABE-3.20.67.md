# CFS Zockt · Übergabe 3.20.67

## Basis / Ziel
- 3.20.66 → 3.20.67
- Shop-UX, Download-Center, Designvorschau und geschützte CFS-AI-Unterstützung.

## Status
**CODE READY**, fokussierte Tests grün; reale Acceptance weiter **HOLD**.

## Geändert
- `public/pages/shop.html`
- `public/pages/original-design.html`
- `public/assets/css/cfs-shop-v172.css`
- `public/assets/js/shop-design-advisor-v32067.js` (neu)
- `public/assets/js/shop-experience-v32067.js` (neu)
- `public/assets/js/shop-scene-preview-v32067.js` (neu)
- `tools/shop-experience-v32067-test.mjs` (neu)
- Versions-/Testdateien und Dokumentation

## CFS AI
- Admin-AI bleibt mit Creator-Session, Admin-Gate, CSRF und CFS_AI_ENABLED geschützt.
- Bei offline/deaktiviert/unberechtigt zeigt der Shop einen eindeutig gekennzeichneten katalogbasierten Vorschlag.
- Das System behauptet keinen aktiven Modellbetrieb, bis die geschützte Statusabfrage das Modell als online meldet.
- Die 31 Originaldesigns bleiben die einzige erlaubte Ergebnisliste; Vorschläge ändern keine Benutzerdaten.

## Offen
- CFS-AI-Worker mit echtem Modell und Browser-Session live testen.
- Shop-/Smartphone-/OBS-Browser-Abnahme.
- Echte Twitch-/TikTok-/YouTube-Provider-Events und Launcher-Abnahme.
