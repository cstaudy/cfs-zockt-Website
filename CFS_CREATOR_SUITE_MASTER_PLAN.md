# cfs_zockt Creator Suite — Master Plan

Stand: **v195**

## Verbindliche Quellen
- `PROJECT_CURRENT_STATE.md` — aktueller technischer/productiver Stand
- `PROJECT_FLOW_PLAN.md` — verbindliche Arbeitsreihenfolge
- `IDEAS-BACKLOG.md` — neue Ideen und Priorisierung
- `README.md` — Einstieg und Release-Hinweise
- `handoff/CURRENT-HANDOFF.md` — Übergabe des letzten Releases

## Aktuelle Reihenfolge
1. Marke/Public/Creator/Admin-Grenzen konsistent halten.
2. v190 RC-Acceptance-Matrix verwenden und reale Windows-/OBS-/Provider-/Multistream-/Browser-/Passkey-Abnahme schließen.
3. Shop/Admin technisch härten; zentralen Umwandler und v186-Katalogsuche/-Filter/-Archivübersicht und den v187 SVG/PNG/WebP-Cover-Workflow als Produktionsoberfläche beibehalten; Shop→Studio Deep Links aus v188 und die gemeinsame Creator-UX-Schicht aus v189 nutzen.
4. Creator-Workflow und visuelle/mobile Qualität abrunden.
5. Commerce erst ganz zum Schluss aktivieren.

## Produktgrenzen
- **Public Website:** cfs_zockt, Gaming, Streams, Games, Community und öffentliche Kennzahlen.
- **Creator-Produkte:** Dashboard, Creator Suite, Shop, Studios und Launcher hinter Login.
- **Private Admin Control Center:** Website Draft/Preview/Publish, Creator-Kontrolle, zentraler Produkt-Umwandler, Bundle Factory, Rechte, Releases und Production.
- **Unified Admin Converter:** Status/Overlays/Panels/Widgets/Creator-Packs; Twitch/TikTok/YouTube/Neutral; Bundle/Einzelstücke/beides.
- **CFS Studio** ist der primäre Produktionsarbeitsplatz.
- **Launcher** ist lokale Engine/Bridge und hält lokale Secrets.
- **OBS** ist optionaler Kompatibilitätsweg.
- **Creator Shop** liefert validierte CFS-Inhalte; keine ungeprüfte externe Codeausführung.
- `CFS_COMMERCIAL_MODE=false` bleibt aktiv bis zur separaten Commerce-Endphase.


## v192 Website Brand Unification

- Einheitliche Website-Shell und aktuelle CFS-Bildmarke über Public, Creator, Shop, Studios und Admin.
- Public-/Creator-Produktgrenze bleibt erhalten.

## v191 Acceptance Tooling
- Preflight/Evidence/Diagnostics/Soak/Go-No-Go vor echter Zielumgebungsabnahme abgeschlossen.
- Reale Acceptance und Commerce bleiben nachgelagert.


## v195 Fixed Acceptance Baseline
- Runtime/Acceptance-Tooling SHA-256-versiegelt.
- Secret-/Config-Scan und lokaler Rollback-Drill als Pflichtgates.
- 48 Realtests bleiben auf echter Zielumgebung auszuführen.
- Feature Freeze bis zur manuellen GO/NO-GO-Entscheidung.
- Commerce bleibt danach weiterhin separater Endblock.
