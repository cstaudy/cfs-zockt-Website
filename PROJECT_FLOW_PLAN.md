# CFS Projekt-Ablaufplan
- [x] Website Brand Unification v192: neue CFS-Bildmarke, einheitliche Header/Footer/Icons auf allen Nutzerseiten.

Stand: **v195** · feste Acceptance-Basis

## 1. Nicht verhandelbare Produktgrenze
- **Public:** cfs_zockt · Warum/Story · Gaming · Streams · aktuelle Games · Community · TikTok/Twitch/Discord · Live-Zahlen.
- **Creator:** Dashboard · Creator Suite · Shop · Studios · Launcher · Integrationen · Account – erst nach Login.
- **Admin:** privates Control Center · Website-Drafts/Publish · Production Suite · Rechte · Collections · Releases · Shop-Verwaltung.
- **Shop-Produkte:** visuell eigenständig; Publisher-/Lizenz-/Versionsnachweis bleibt cfs_zockt.

Neue Ideen werden zuerst in `IDEAS-BACKLOG.md` eingeordnet.

## 2. Definition of Done
Backend/DB → Creator/Admin UI → betroffene Public-Kommunikation → Auth-/Sicherheitsgrenze → Tests → Doku → Fresh-Base-Paketprüfung.

## 3. Arbeitsreihenfolge

### Phase A — Struktur, Marke & Admin-Kontrolle
- [x] cfs_zockt als öffentliche Hauptidentität festlegen.
- [x] Creator-Produkte hinter Login trennen.
- [x] Logo + `by cfs_zockt` im Creator-Layer vereinheitlichen.
- [x] Admin-Seite serverseitig Admin-only machen.
- [x] Website Draft/Preview/Publish/Revert integrieren.
- [x] Shop/Assets/Creator/Release-Einstiege im Admin Dashboard bündeln.
- [x] Zentralen Admin-Umwandler für Status/Overlay/Panel/Widget/Pack integrieren.
- [x] Bundle/Einzelstück/beides sowie 1/2/4 Varianten vor Produktion auswählbar machen.
- [x] Stream-Status-Serie Starting/Pause/Ending/Offline vollständig machen.

### Phase B — Stabilität & reale Acceptance
- [x] Release-Candidate / Acceptance Prep bündeln und reale Testmatrix finalisieren.
- [x] Acceptance Tooling/Diagnostics: Preflight, Evidence-Index, Soak-Plan und Go/No-Go-Guard vorbereiten.
- [x] v195 RC Freeze: Runtime/Tooling versiegeln, Secret-Scan, lokalen Rollback-Drill und festen Acceptance-Baseline-Report erzeugen.
- [ ] Windows Launcher real abnehmen.
- [ ] OBS Browser Source / WebSocket real testen.
- [ ] TikTok/Twitch/YouTube mit echten Testaccounts abnehmen.
- [ ] Multistream/Reconnect/Soak unter realer Last abnehmen.
- [ ] Browser-visuelle Abnahme Public + Creator + Admin durchführen.

### Phase C — Shop/Admin-Härtung
- [x] Stream-Lifecycle Starting → LIVE → BRB → Ending → Offline integrieren; Launcher-Auto opt-in, BRB manuell.
- [x] stale Install-Receipts validieren/rematerialisieren.
- [x] entfernte Paketbestandteile als `retired` abbilden ohne Creator-Inhalte zu löschen.
- [x] größere Kataloge: Suche/Filter/Archivübersicht prüfen.
- [x] PNG/WebP-Shop-Cover zusätzlich zu SVG prüfen.
- [ ] geplante Veröffentlichung nur bei echtem Bedarf ergänzen.
- [ ] externe Publisher/Signaturen nur bei echtem Bedarf.

### Phase D — Creator-Workflow-Polish
- [x] Shop → Studio Deep-Links vereinheitlichen.
- [x] Fehler-/Leerzustände und mobile Bedienung im übrigen Creator-Layer code-seitig vereinheitlichen. (Reale Browser-/Geräte-Abnahme bleibt Phase B.)
- [x] Hilfetexte im Creator-Layer konsistent halten.

### Phase E — Commerce ganz zum Schluss
- [ ] Checkout/Payment Provider.
- [ ] Kauf-Entitlements/Besitzhistorie.
- [ ] Steuer/Rechnung/Refunds.
- [ ] echtes „Bundle vervollständigen“.
- [ ] erst danach explizites `CFS_COMMERCIAL_MODE=true` Release.
