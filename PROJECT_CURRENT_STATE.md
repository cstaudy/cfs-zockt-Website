# PROJECT CURRENT STATE · v195

Aktiver kumulativer Stand: **v195**.

**Backend: 3.20.38**  
**Schema: 78**  
**Launcher: 0.47.30**

## Produktidentität
- **cfs_zockt ist Marke und öffentliche Website.**
- Public zeigt Motivation, Gaming, Streams, aktuelle Games, TikTok/Twitch/Discord und Community-Zahlen.
- **Creator Suite ist ein geschütztes Produkt** für registrierte Creator.
- Dashboard, Creator Suite, Shop, Launcher und Studios liegen hinter Login.
- Creator-Produkte tragen Logo/Publisher-Kennzeichnung `by cfs_zockt`.

## Privates Admin Control Center
- `/pages/admin-creators.html` ist serverseitig Admin-only.
- Website-Inhalte laufen über **Draft → private Vorschau → Publish → Revert**.
- Öffentliche Besucher erhalten ausschließlich veröffentlichte Snapshots.
- Bundle Factory/Production Suite bleibt die einzige Shop-Produktionsengine.

## v195 · Fixed Acceptance Baseline / RC Freeze

- v193/v194 werden in dieser aktuellen Release-Linie bewusst übersprungen, weil gleichnamige historische Artefakte bereits im Projekt liegen.
- Runtime und Acceptance-Tooling sind über `reports/rc-freeze-v195.json` SHA-256-versiegelt.
- `npm run freeze195:verify` stoppt bei fehlenden, zusätzlichen oder geänderten versiegelten Dateien.
- `npm run freeze195:secret` prüft sensitive Projektdateien/Beispielkonfigurationen vor der Abnahme.
- `npm run freeze195:recovery` führt einen lokalen bytegenauen Artifact-Rollback-Drill in einem temporären Verzeichnis aus.
- `reports/rc-fixed-baseline-v195.json` ist die feste Abnahmebasis, aber **kein** Real-Acceptance-PASS.
- Die 48 Realtests bleiben auf echter Windows-/OBS-/Provider-/Browser-/Passkey-Umgebung auszuführen.
- Ab Freeze keine neuen Features; Bugfix = neuer Kandidat + neuer Acceptance-Lock.
- `CFS_COMMERCIAL_MODE=false`.

## v192 · Website Brand Unification

- 40 Nutzerseiten nutzen eine gemeinsame Brand-/Shell-Schicht.
- Neue Bildmarke `/assets/img/brand/cfs-zockt-mark.png` ist zentrale sichtbare Marke.
- Public bleibt `CFS ZOCKT · GAMING · STREAMS · COMMUNITY`; geschützte Creator-Seiten tragen `CREATOR SUITE`.
- Favicon/App-Icons und historische Logo-Aliase sind auf die aktuelle Marke synchronisiert.
- Reale Acceptance bleibt offen; `CFS_COMMERCIAL_MODE=false`.

## v191 · Acceptance Tooling & Diagnostics
- Maschinenlesbarer Repo-/Windows-Preflight prüft Release-Voraussetzungen, ohne reale Acceptance vorzutäuschen.
- Evidence-Artefakte werden repo-relativ unter `evidence/` registriert, per SHA-256 gebunden und bei Textdateien auf erkennbare Secrets/RTMP-Ziele geprüft.
- Diagnoseereignisse können als redigiertes JSONL protokolliert werden.
- Reproduzierbarer 60+-Minuten-Soak-Plan deckt Baseline, Provider-Drop, Network-Drop und Launcher-Restart ab.
- Go/No-Go-Guard verlangt Preflight + vollständige v190-Real-Acceptance + passende v191-Evidence; höchster automatischer Status bleibt `READY_FOR_MANUAL_GO_NO_GO`.
- Keine reale Windows-/OBS-/Provider-/Browser-/Passkey-Abnahme wurde automatisch bestanden.
- Keine DB-Migration; Commerce bleibt deaktiviert.

## v190 · Release Candidate / Acceptance Prep
- Neue reale RC-Testmatrix für Windows, OBS, Twitch, TikTok, YouTube, Multistream, Reconnect/Soak, Browser/Responsive und Passkey/Isolation.
- Statusmodell `pending/pass/fail/skip/blocked` mit harter Go/No-Go-Auswertung.
- Pflichtprüfungen werden nur durch `PASS` aufgelöst; `SKIP` bleibt bei Pflichtfällen ein Blocker.
- Conditional-Prüfungen (z. B. TikTok Stream Target ohne offiziellen Encoderzugang) dürfen nur mit Begründung `SKIP` sein.
- `PASS` braucht eine sichere Evidence-Referenz; RTMP-Secrets, OAuth-Tokens und absolute lokale Pfade werden im CLI abgewiesen.
- Die eingecheckte Matrix startet vollständig `pending`; automatisierte Repo-Tests dürfen keine reale Acceptance als bestanden markieren.
- Commerce/Stripe ist bewusst nicht Bestandteil des v190-RC-Gates, solange `CFS_COMMERCIAL_MODE=false` gilt.

## v189 · Creator UX Polish
- Zentrale geschützte Creator-Seiten nutzen eine gemeinsame UX-Schicht für Leer-, Warn-, Fehler- und Erfolgszustände.
- Dynamische Zustände erhalten konsistente `role`-/`aria-live`-Semantik.
- Echte Ladefehler bieten einen manuellen Retry, ohne legitime leere Bestände als Fehler zu behandeln.
- Dashboard, Account, Integrationen, Setup/Settings, Studios, Launcher und Diagnosebereiche erhalten kontextuelle Hilfetexte mit festen internen Zielen.
- Mobile Aktionsgruppen werden einspaltig/touchfreundlich; Tabs und Toolbars bleiben horizontal erreichbar.
- Twitch-/YouTube-Sync-/Disconnect-Fehler erscheinen inline statt als Browser-Alert.
- Keine DB-Migration, keine neue öffentliche UX-API, keine Secret-Verarbeitung.
- Echte Browser-/Geräte-Responsive-Abnahme bleibt Teil der separaten Acceptance-Phase.

## v188 · Shop → Studio Deep Links + Shop Workflow Polish
- Installierte Shop-Receipts liefern creator-spezifische `workflow_links` für den nächsten Arbeitsschritt.
- Widgets und Overlays öffnen das konkrete creator-eigene Objekt im Widget Studio.
- Scenes öffnen die konkrete creator-eigene Scene im Scene Studio.
- Panel-Sets öffnen den passenden Panel-Set-Bereich; Tool-Links bleiben auf die bestehende Allowlist begrenzt.
- Widget-/Scene-Queryparameter werden nur gegen bereits geladene creator-eigene Objekte aufgelöst; fremde oder ungültige IDs werden nicht geöffnet.
- Shop-Karten und Produktdetail zeigen nach Installation direkt den passenden Weiterarbeiten-Schritt.
- Teilinstallationen verlinken offene Provider-/Quota-Voraussetzungen auf die passende Creator-Seite.
- Shop-Empty-/Error-/Retry-/Mobile-Zustände wurden für diesen Workflow gehärtet.
- Keine DB-Migration; Schema bleibt 78.
- Shop-spezifischer Workflow bleibt Teil der gemeinsamen v189 Creator-UX-Schicht; reale Browser-/Geräte-Abnahme bleibt separat offen.

## v187 · PNG/WebP Shop Cover & Media Workflow
- Auto-SVG bleibt Standard-Cover für Admin-produzierte Shop-Produkte.
- Ein Produkt kann optional ein bereits rechtegeprüftes PNG/WebP aus der privaten Admin-Medienbibliothek als Cover verwenden.
- JPG bleibt Quellbild, wird aber nicht als Raster-Shop-Cover angeboten.
- Medien-Cover werden creator-/admin-gebunden ausgewählt; es gibt keinen neuen Roh-Uploadpfad.
- Produkt- und Collection-Publish prüfen die Cover-Rechte erneut.
- Rechteentzug eines verwendeten Medien-Covers setzt betroffene veröffentlichte Produkte wieder auf `draft`.
- `AUTO-SVG WIEDERHERSTELLEN` regeneriert das SVG aus den Produkt-Quellbildern.
- Keine DB-Migration; Schema bleibt 78.

## v186 · Admin Catalog Search / Filter / Archive Overview
- Der private Admin-Katalog besitzt Freitextsuche über Produkte und Collections.
- Filter nach Status, Plattform und Bundle/Einzelstück wirken auf den bereits autorisierten Admin-Bestand.
- Archivierte Produkte und Collections werden getrennt gezählt und sind über einen Archiv-Schnellfilter auffindbar.
- `mixed` bleibt ein Collection-Status und wird nicht fälschlich als Produktstatus behandelt.
- Keine neue DB-Migration und kein neuer öffentlicher Such-/Katalogendpunkt.

## v185 · Shop Install Self-Healing
- Shop-Install-Receipts werden vor Wiederverwendung gegen den echten Creator-Bestand geprüft.
- Fehlende Widget-, Overlay-, Scene-, Panel-Set- oder Asset-Ziele werden beim nächsten Install/Update sicher neu materialisiert, statt wegen einer veralteten `ref` übersprungen zu werden.
- Tool-Links werden gegen den aktuellen allowlisted Zielpfad geprüft.
- Aus einer neuen Produktversion entfernte Paketbestandteile werden als `retired` dokumentiert.
- `retired` löscht **keine** Creator-Inhalte und erzeugt keine automatische Rücknahme eigener Änderungen.
- Install-Antworten weisen `stale_detected`, `repaired` und `retired` getrennt aus.
- Keine neue DB-Migration; Shop-State-Normalisierung ist Version 4.

## v184 · Stream Lifecycle
- Im Stream Studio können **Starting Soon, LIVE, BRB/Pause, Ending und Offline** jeweils einer veröffentlichten Scene zugeordnet werden.
- Jeder Lifecycle-Status kann manuell aktiviert werden.
- Optional kann der Launcher-Status **Starting/LIVE/Ending/Offline** automatisch auf die zugeordneten Scenes abbilden.
- **BRB/Pause bleibt bewusst manuell**.
- Offline ist zusätzlich als Scene-Schnellstart-Preset verfügbar.

## Sicherheit / Commerce
- **Account Login / Anomaly Security (Pass 9)** bleibt Bestandteil der Regression.
- Passkeys/WebAuthn sind implementiert; **echter Browser-/Authenticator-E2E** auf realer Hardware **bleibt offen**.
- Self-Healing prüft Zielobjekte immer creatorgebunden; fremde Creator-IDs können nicht als gültiges Receipt-Ziel dienen.
- Rematerialisierung verwendet dieselben Provider-, Plan-, Rechte- und Quotenprüfungen wie die normale Installation.
- Entfernte Paketbestandteile werden nicht automatisch gelöscht.
- `CFS_COMMERCIAL_MODE=false`.
- Reale Windows-/OBS-/TikTok-/Twitch-/YouTube-/Multistream-Abnahme bleibt offen.

Die verbindliche Reihenfolge steht in `PROJECT_FLOW_PLAN.md`; neue Ideen zuerst in `IDEAS-BACKLOG.md`.
