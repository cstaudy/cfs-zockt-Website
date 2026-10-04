# cfs_zockt Creator Suite · v184

Aktueller Stand: Backend **3.20.29**, Schema **78**, Launcher **0.47.30**.

v184 ergänzt den **Stream Lifecycle** im geschützten Stream Studio. Der in v183 vereinheitlichte Admin-Umwandler bleibt die einzige sichtbare Produktionsstelle für Shop-Pakete.

Die öffentliche Website ist **cfs_zockt** (Gaming, Streams, Games, Community). Die Creator Suite ist ein separates, geschütztes Produkt für registrierte Creator.

## v184 · Stream Lifecycle

- Starting Soon, LIVE, BRB/Pause, Ending und Offline können jeweils einer veröffentlichten Creator-Scene zugeordnet werden
- Statuswechsel sind manuell direkt im Stream Studio möglich
- optionaler Launcher-Automatikmodus für Starting/LIVE/Ending/Offline
- BRB/Pause bleibt bewusst manuell steuerbar
- Offline-Scene ist zusätzlich als Schnellstart-Preset verfügbar
- Lifecycle nutzt nur vorhandene veröffentlichte Creator-Scenes und übernimmt keine Provider-Secrets

## v183 · Unified Admin Converter

- eine sichtbare Admin-Produktionsstelle für Stream-Status, Overlays, Panels/Cards, Provider-Widgets und komplette Creator-Packs
- Plattformwahl Twitch, TikTok, YouTube oder Neutral
- Ausgabe als nur Bundle, nur Einzelstücke oder Bundle + Einzelstücke
- Preset/Detail/Varianten vor Produktion auswählbar; Produkt- und Collection-Duplizieren bleibt erhalten

## v181 · Private Admin Control Center

- Admin-Seite selbst serverseitig Admin-only; normale Creator erhalten 404 statt Admin-HTML
- Website Studio mit Draft → private Vorschau → Publish → Revert pro Bereich
- öffentliche Website liest ausschließlich veröffentlichte Snapshots; Entwürfe/Notizen bleiben privat
- Games-Highlights, Community-Links, Creator-Einstieg und öffentliche Hinweise können ohne Code-Änderung gepflegt werden
- zentrale Übersicht für Shop-Drafts, Live-Produkte, Assets/Rechte und Creator
- Bundle Factory bleibt die einzige Produktionsengine für Bundles und Einzelstücke

## v180 · Brand & Public Website Reset

- Public = `cfs_zockt`: Warum, Games, Streams, Community und Live-Zahlen
- Creator-Produkte = nach Login: Dashboard, Creator Suite, Shop, Launcher und Studios
- zentrale Creator-Produktkennzeichnung mit echtem Logo, Publisher `cfs_zockt` und dynamischem Copyright
- private Produktseiten aus der öffentlichen Sitemap entfernt und serverseitig mit Creator-Session geschützt
- Shop-/Bundle-Designs dürfen eigenständig bleiben; Publisher-/Rechte-Metadaten bleiben bei `cfs_zockt`


# v179 · Project Structure & Main Integration

- zentrale aktuelle Quellen: `PROJECT_CURRENT_STATE.md`, `PROJECT_FLOW_PLAN.md`, `IDEAS-BACKLOG.md`
- Website Main bindet Creator Shop sichtbar in Community, CTA und Footer ein
- Creator Suite beschreibt Shop/Bundle/Einzelprodukt-Workflow und aktuellen Studio-Status
- öffentliche Roadmap auf Backend 3.20.24 / Schema 77 aktualisiert und alte 21.x-Arbeitsreihenfolge entfernt
- Commerce bleibt bewusst Endphase; `CFS_COMMERCIAL_MODE=false`
- historische Nachweise bleiben versioniert erhalten, werden aber nicht mehr in der aktuellen Master-Plan-Datei dupliziert

# v178 · Shop Product Commerce Structure

Admin Production Suite mit Produkt-/Collection-Duplikation, Bundle + Einzelstück-Angeboten, vorbereiteten EUR-Preisen und Paid-Preview ohne Checkout. Backend 3.20.23 · Schema 77 · Launcher 0.47.30. `CFS_COMMERCIAL_MODE=false`.

# v177 · Admin Collection Releases

Admin Production Suite mit Collection-Lifecycle, gespeicherten SVG-Covern und echten Produktversionen/Release Notes. Backend 3.20.22 · Schema 76 · Launcher 0.47.30. Kein Live-Commerce.

# cfs_zockt v175

Admin Bundle Factory: Admin-only Bild-Upload mit Rechtefreigabe, wiederholte Designvarianten, editierbare Shop-Produktentwürfe, Preview/Publish und sichere Branding-Asset-Kopie beim Creator-Import. Backend 3.20.21 · Schema 75 · Launcher 0.47.30. Kein Live-Commerce.

# cfs_zockt · v174

Creator Shop Produktdetail + sichere Updates/Reinstall + Scene-/Branding-Bundles. Produkte zeigen jetzt konkrete Vorschauen und Paketinhalt; Updates behalten eigene editierte Inhalte, Neuinstallation erzeugt frische Kopien. Scene-Templates werden nur als validierte Drafts angelegt. Backend 3.20.19 · Schema 73 · Launcher 0.47.30. Kein Live-Commerce.

# cfs_zockt · v173

TikTok Card Polish + echter Creator-Shop-Import. 720×1280 TikTok-Karten nutzen einen eigenen Portrait-Renderer; Shop-Pakete können erlaubte Panel-Sets und Widget-/Overlay-Drafts materialisieren, ohne Provider-/Plan-Grenzen zu umgehen. Backend 3.20.18 · Schema 73 · Launcher 0.47.30. Kein Live-Commerce.

# cfs_zockt · v172

UI-Unification zwischen öffentlicher Website und Creator Dashboard, Creator Shop Foundation für Widgets/Panels/Overlays/Tools und Panel Design Generator v2 mit sechs rotierenden Varianten. Backend 3.20.17 · Schema 73 · Launcher 0.47.30. Der Shop ist Free/Beta; kein Live-Commerce.

# cfs_zockt · v171

Persistente Panel-Sets für Twitch und TikTok: Branding einmal definieren, mehrere Panels konsistent erzeugen, speichern/öffnen/duplizieren/löschen, als ZIP exportieren oder in die Medienbibliothek rendern. Der Panel-Paket-Agent erzeugt nur strukturierte Konfiguration. Backend 3.20.16 · Schema 73 · Launcher 0.47.30.

# cfs_zockt · v170

Panel-Umwandler für Twitch-Info-Panels und TikTok Profil-/Social-Karten. PNG-Download oder Speichern in die CFS-Medienbibliothek. Backend 3.20.15 · Schema 73 · Launcher 0.47.30.

# v169 · Widget-Umwandler & Plattformtrennung

TikTok- und Twitch-Widgets sind im Widget Studio strikt getrennt. Der neue Umwandler erstellt aus einem Bild/Logo und einem passenden TikTok-/Twitch-Typ ein normales editierbares Widget. Backend 3.20.15 · Schema 73 · Launcher 0.47.30.

# cfs_zockt Creator Suite – v168

Aktueller Fokus: **CFS Studio als Operator-Arbeitsplatz**. Die normale LIVE-Produktion bleibt sichtbar, technische Einstellungen und Diagnose treten in den Hintergrund.

- Backend: **3.20.13**
- Schema: **73**
- Launcher: **0.47.30**
- Scenes + Quellen links
- Preview/Program + Composer in der Mitte
- Session + Stream-Check + Multistream rechts
- Audio direkt sichtbar
- Capture, Output, Health und Activity standardmäßig eingeklappt
- benutzerdefinierte alte Workspaces werden nicht ungefragt überschrieben
- Secret-/SafeStorage-Grenzen unverändert
- CFS Studio Operator Gate: **92/92 PASS
- kompletter `release:v168`: **PASS / Exit 0****

Siehe `CFS-STUDIO-OPERATOR-v168.md`, `TECHNIK-v168.md`, `CREATOR-SUITE-COMPLETION-v168.md` und `SECURITY-BASELINE-v168.md`.

---

# cfs_zockt Creator Suite – v167

Aktueller Fokus: klare Produktgrenze zwischen **CFS Studio** und **Launcher**. CFS Studio ist der normale Produktionsweg. Der Launcher stellt lokal Engine, Capture, Provider-Bridges und verschlüsselte Stream-Credentials bereit. OBS bleibt optional im Profi-Bereich.

- Backend: **3.20.12**
- Schema: **73**
- Launcher: **0.47.30**
- CFS Studio: als eigene installierbare Web-App-Oberfläche vorbereitet
- Kein zweiter Native-Installer in v167

---

# cfs_zockt — Creator Suite v166

Aktiver Schwerpunkt: **Creator-Alltag nach dem Login**. Der Feature Freeze bleibt aktiv; v166 ist ein UX-/Informationsarchitektur-Pass.

- Backend: **3.20.12**
- Schema Generation: **73**
- Launcher: **0.47.30**
- Dashboard zeigt zuerst genau einen nächsten Schritt und vier Hauptaktionen
- Status, Stream-Startcheck und technische Module liegen unter `Status & Diagnose`
- Account ist in Profil, Sicherheit, Sitzungen sowie Daten & Konto gegliedert
- transparente Wortmarke auch im Creator-Dashboard und Account
- Auth-, Provider-, Launcher- und Secret-Grenzen unverändert
- Creator Daily + Account Gate: **88/88 PASS**

Siehe `TECHNIK-v166.md`, `CREATOR-SUITE-COMPLETION-v166.md`, `SECURITY-BASELINE-v166.md` und `CREATOR-DASHBOARD-ACCOUNT-v166.md`.

---

# cfs_zockt — Creator Suite v165

Aktiver Schwerpunkt: **professioneller Produkt-Einstieg**. Der Feature Freeze bleibt aktiv; v165 ist ein UX-/Informationsarchitektur-Pass.

- Backend: **3.20.11**
- Schema Generation: **73**
- Launcher: **0.47.30**
- Creator Suite, Launcher Download und Login/Registrierung auf klare Hauptaufgaben reduziert
- konsistente Navigation und kompakter Footer
- technische Status-/Security-Details sekundär und aufklappbar
- Auth-, Provider- und Launcher-Release-Verträge unverändert
- Public Entry Flow Gate: **68/68 PASS**

Siehe `TECHNIK-v165.md`, `CREATOR-SUITE-COMPLETION-v165.md`, `SECURITY-BASELINE-v165.md` und `PUBLIC-ENTRY-FLOW-v165.md`.

---

# cfs_zockt — Creator Suite v164

Aktiver Schwerpunkt: **professioneller öffentlicher Besucher-Flow**. Der Feature Freeze bleibt aktiv; v164 ist ein reiner UX-/Informationsarchitektur-Pass.

- Backend: **3.20.10**
- Schema Generation: **73**
- Launcher: **0.47.30**
- Mobile Header ohne unklaren `+`-Shortcut
- Anmeldung und kostenloser Start liegen mobil im Menü
- LIVE steht direkt nach dem Hero; Games und Community folgen logisch
- redundante Angebots-/Erwartungskarten entfernt
- kompakter Footer mit Twitch, TikTok und Discord
- Homepage Professional Flow Gate: **31/31 PASS**

Siehe `TECHNIK-v164.md`, `CREATOR-SUITE-COMPLETION-v164.md`, `SECURITY-BASELINE-v164.md` und `PUBLIC-HOMEPAGE-POLISH-v164.md`.

---

# cfs_zockt — Creator Suite v163

Aktiver Schwerpunkt: **Legal Privacy + Search Surface Hardening**. Der Feature Freeze bleibt aktiv; v163 ist ein Privacy-/SEO-Hardening-Pass.

- Backend: **3.20.9**
- Schema Generation: **73**
- Launcher: **0.47.30**
- Impressum, Datenschutz und Nutzungsbedingungen bleiben öffentlich erreichbar
- Rechtseiten werden nicht mehr in der XML-Sitemap beworben
- Meta Robots + `X-Robots-Tag`: `noindex,follow,noarchive,nosnippet`
- Kontakt-E-Mail/`mailto:` bleiben auf die drei Rechtseiten begrenzt
- keine Telefonnummer-Links im öffentlichen Website-Bereich

Siehe `TECHNIK-v163.md`, `CREATOR-SUITE-COMPLETION-v163.md`, `SECURITY-BASELINE-v163.md` und `PUBLIC-LEGAL-PRIVACY-v163.md`.

---

# cfs_zockt — Creator Suite v162

Aktiver Schwerpunkt: **kompakte öffentliche Hauptseite + Privacy-Audit**. Der Feature Freeze bleibt aktiv; v162 ist ein UX-/Privacy-Polish-Pass.

- Backend: **3.20.8**
- Schema Generation: **73**
- Launcher: **0.47.30**
- Hauptseite deutlich gekürzt, ohne LIVE-Status, Games, Community, Creator Suite oder Launcher zu entfernen
- doppelter `Über mich`-Abschnitt entfernt
- private Kontaktidentität bleibt aus der Hauptseite heraus
- Anbietername, Postanschrift und Kontakt-E-Mail bleiben auf den rechtlichen Seiten begrenzt
- Homepage Compact + Privacy Gate: **31/31 PASS**

Siehe `TECHNIK-v162.md`, `CREATOR-SUITE-COMPLETION-v162.md`, `SECURITY-BASELINE-v162.md` und `PUBLIC-PRIVACY-AUDIT-v162.md`.

---

# cfs_zockt — Creator Suite v161

Aktiver Schwerpunkt: **TikTok LIVE-/Last-LIVE-Tracking + transparentes Website-Branding**. Der Feature Freeze bleibt aktiv; v161 ist ein Reliability-/Polish-Pass.

- Backend: **3.20.7**
- Schema Generation: **73**
- Launcher: **0.47.30**
- TikTok LIVE/OFFLINE wird über den verbundenen CFS-Launcher-LIVE-Provider erkannt
- TikTok `Zuletzt live` nutzt vorhandene Provider-/Session-Historie
- Twitch und TikTok werden auf der Startseite separat angezeigt; simultanes LIVE wird als Multistream zusammengeführt
- TikTok-Status bleibt bewusst nicht-autoritativer Providerstatus; kein Scraping und keine vorgetäuschte offizielle LIVE-API
- Header/Footer verwenden jetzt das vorhandene echte transparente RGBA-CFS-Wortlogo statt der PNG mit eingebranntem schwarzen Hintergrund
- Public TikTok/Brand Gate: **48/48 PASS**
- Public Twitch Gate: **49/49 PASS**
- Projektregression: **40/40 PASS**
- kompletter `npm run release:v161`: **PASS / Exit 0**
- reale TikTok-Acceptance mit Windows/Launcher/Provider LIVE → OFFLINE bleibt als externer Test offen

Siehe `TECHNIK-v161.md`, `CREATOR-SUITE-COMPLETION-v161.md` und `SECURITY-BASELINE-v161.md`.

---

# cfs_zockt — Creator Suite v160

Aktiver Schwerpunkt: **Twitch LIVE-Status auf der öffentlichen Startseite zuverlässig erkennen**. Der Feature Freeze bleibt aktiv; v160 ist ein Reliability-/Status-Pass.

- Backend: **3.20.6**
- Schema Generation: **73**
- Launcher: **0.47.30**
- Twitch LIVE/OFFLINE wird serverseitig direkt über Twitch Helix geprüft
- `Zuletzt live` wird aus EventSub/Polling gespeichert und bei fehlender Alt-Historie aus dem letzten Twitch-Archiv gebootstrapped
- Startseite: direkter **Twitch-Kanal**-Button plus TikTok-Kanal
- Twitch Viewer/Game/Streamtitel werden öffentlich nur als nicht-sensitive Statusdaten ausgegeben
- Provider-Tokens, Stream Keys und Client Secrets bleiben serverseitig/lokal
- Public Twitch LIVE Gate: **49/49 PASS**
- kompletter `npm run release:v160`: **PASS / Exit 0**
- reale Produktionsabnahme mit deinem verbundenen Twitch-Konto (LIVE → OFFLINE) bleibt als externer Test offen

Siehe `TECHNIK-v160.md`, `CREATOR-SUITE-COMPLETION-v160.md` und `SECURITY-BASELINE-v160.md`.

---

# cfs_zockt — Creator Suite v159

Aktiver Schwerpunkt: **professioneller öffentlicher Produktauftritt + echter Windows-Launcher-Downloadweg**. Der Feature Freeze bleibt aktiv; v159 ist ein UX-/Distribution-/Release-Hardening-Pass, kein neuer großer Produktblock.

- Backend: **3.20.5**
- Schema Generation: **73**
- Launcher: **0.47.30**
- neue öffentliche Seite: **`/pages/launcher-download.html`**
- öffentliche read-only Release-API: **`/api/public/launcher/releases`**
- Windows Build: **NSIS Setup `.exe` + Portable `.exe` · x64**
- öffentliche Tag-Releases: **gültige Authenticode-Signatur verpflichtend**
- Setup/Portable erscheinen auf der Website nur, wenn sie wirklich als GitHub Release veröffentlicht wurden
- Startseiten-Navigation reduziert und Launcher als eigener Hauptweg hervorgehoben
- Public Launcher Distribution Gate: **32/32 PASS**
- kompletter `npm run release:v159`: **PASS**
- echter Windows-/Installer-/SmartScreen-Test bleibt bis zur Ausführung auf Windows offen

Siehe `TECHNIK-v159.md`, `CREATOR-SUITE-COMPLETION-v159.md`, `SECURITY-BASELINE-v159.md` und `LAUNCHER-DISTRIBUTION-v159.md`.

---

# cfs_zockt — Creator Suite v158

Aktiver Schwerpunkt: **Stream Studio, Integrationen und Scene Studio sauber nach Creator-Ablauf ordnen**. Der Feature Freeze bleibt aktiv; v158 ist ein UX-/Informationsarchitektur-Pass, kein neuer Produktblock.

- Backend: **3.20.4**
- Schema Generation: **73**
- Launcher: **0.47.28**
- gemeinsame Themen: **Start & Status · Gestalten · Produzieren · Verbinden · Community · System & Tests**
- Stream Studio: **Bühne bauen · Bild/Ton/Output · Stream prüfen · LIVE Session · Überwachen**
- Integrationen: **Streaming-Plattformen · PC/Launcher/OBS · Erweitert & Diagnose**
- Scene Studio: **Direkt-/Kompatibilitätseditor**, normaler neuer Weg liegt im CFS Stream Studio
- Workspace-Flow-Gate: **86/86 PASS**
- Release Gate: `npm run release:v158` → **PASS**
- Feature Freeze bleibt aktiv; reale Windows-/OBS-/Provider-Acceptance bleibt offen

Siehe `TECHNIK-v158.md`, `CREATOR-SUITE-COMPLETION-v158.md`, `SECURITY-BASELINE-v158.md` und `handoff/HANDOFF-v158.md`.

---

# cfs_zockt — Creator Suite v157

Aktiver Schwerpunkt: **vorhandene Funktionen sauber nach Aufgaben ordnen**. Der Feature Freeze bleibt aktiv; v157 ist ein UX-/Informationsarchitektur-Pass, kein neuer Produktblock.

- Backend: **3.20.3**
- Schema Generation: **73**
- Launcher: **0.47.28**
- sechs feste Themen: **Start & Status · Gestalten · Produzieren · Verbinden · Community · System & Tests**
- Launcher-Navigation entsprechend gruppiert und auf kleinen Höhen scrollbar
- Widget Studio: **Erstellen · Verwalten · Weiter zum Stream**
- Dashboard und öffentliche Creator Suite von Einzelmodulen auf Themenlogik reduziert
- Workspace-Organization-Gate: **69/69 PASS**
- Release Gate: `npm run release:v157` → **PASS**
- Feature Freeze bleibt aktiv; reale Windows-/OBS-/Provider-Acceptance bleibt offen

Siehe `TECHNIK-v157.md`, `CREATOR-SUITE-COMPLETION-v157.md`, `SECURITY-BASELINE-v157.md` und `handoff/HANDOFF-v157.md`.

---

# cfs_zockt — Creator Suite v156

Aktiver Schwerpunkt: **Website-Cleanup innerhalb des Feature Freeze**. Die drei statischen Spielebilder auf der Startseite wurden entfernt und der öffentliche Einstieg auf klare, wahrheitsgemäße Wege reduziert.

- Backend: **3.20.2**
- Schema Generation: **73**
- Launcher: **0.47.27**
- statische CS2-/FC25-/Warzone-Streambilder entfernt
- LIVE-Vorschau zeigt nur noch ein echtes verfügbares Cover, sonst neutrales CFS-LIVE-Feld
- Hero führt klar zu **Streams** oder **Creator Suite**
- Creator-Suite-Seite auf aktuelle kostenlose geschlossene Beta / Acceptance-Phase synchronisiert
- Homepage-Clarity-Gate: **32/32 PASS**
- Release Gate: `npm run release:v156` → **PASS**
- Feature Freeze bleibt aktiv; reale Windows-/OBS-/Provider-Acceptance bleibt offen

Siehe `TECHNIK-v156.md`, `CREATOR-SUITE-COMPLETION-v156.md`, `SECURITY-BASELINE-v156.md` und `handoff/HANDOFF-v156.md`.

---

# cfs_zockt — Creator Suite v155

Aktiver Schwerpunkt: **reale Private-Beta-Acceptance gestartet; Test-/Diagnosekette gehärtet**. Der Feature Freeze bleibt aktiv.

- Backend: **3.20.1**
- Schema Generation: **73**
- Launcher: **0.47.27**
- Projekt-Regression: **40/40 PASS** inklusive R59–R68
- Stream-Credential-Store: **29/29 PASS**
- Private-Beta-Acceptance-Contract: **34/34 PASS**
- Release Gate: `npm run release:v155` → **PASS**
- Windows-Starter: `RUN-PRIVATE-BETA-ACCEPTANCE.cmd`
- Nächster Schritt: **echte Windows-/OBS-/Provider-/Reconnect-/Soak-Acceptance**

Der Private-Beta-Starter aktiviert keine Monetarisierung und führt keinen Stripe-LIVE-Test aus. Externe/hardwareabhängige Punkte werden nicht als PASS simuliert.

Siehe `TECHNIK-v155.md`, `ACCEPTANCE-STATUS-v155.md`, `PRIVATE-BETA-ACCEPTANCE-v155.md`, `CREATOR-SUITE-COMPLETION-v155.md` und `SECURITY-BASELINE-v155.md`.

---

# cfs_zockt — Creator Suite v154

Aktiver Schwerpunkt: **integriertes Beta-Test-Handbuch + vorbereiteter Feature Freeze**.

- Backend: **3.20.0**
- Schema Generation: **73**
- Launcher: **0.47.26**
- Beta-Test-Handbuch: **12 strukturierte Schritte**
- Handbook Gate: `npm run beta-handbook154:check` → **57/57 PASS**
- Feature Freeze Gate: `npm run feature-freeze154:check` → **33/33 PASS**
- Release Gate: `npm run release:v154` → **PASS** auf dem vollständigen Repository
- Nächster Schritt: **gebündelte reale Acceptance, keine neuen großen Features davor**

Siehe `TECHNIK-v154.md`, `CREATOR-SUITE-COMPLETION-v154.md`, `SECURITY-BASELINE-v154.md` und `FEATURE-FREEZE-v154.md`.

---

# cfs_zockt — Creator Suite v152

Aktiver Schwerpunkt: **konsolidierte Private-Beta Legal-/Privacy-Härtung auf dem v151-Code-Stand**. Das Paket enthält den kompletten kumulativen v151-Updatebestand plus die neuesten Legal-/Privacy-Dateien jeweils nur einmal.

- Backend: **3.18.3**
- Schema Generation: **72**
- Launcher: **0.47.24**
- Admin-Zuordnung: **nur `CFS_ADMIN_EMAILS`**
- Geschlossene Provider-Beta: **TikTok + Twitch**
- Kommerzieller Modus: **standardmäßig aus (`CFS_COMMERCIAL_MODE=false`)**
- Legal/Privacy Gate: `npm run legalbeta:check`
- Release Gate: `npm run release:v152`

Registrierung dokumentiert Nutzungsbedingungen, Datenschutzhinweis, Beta-Hinweis und 18+-Bestätigung. Bezahlte Checkouts bleiben in der privaten Beta serverseitig deaktiviert.

Siehe `TECHNIK-v152.md`, `CREATOR-SUITE-COMPLETION-v152.md`, `SECURITY-BASELINE-v152.md` und `LEGAL-PRIVACY-PRIVATE-BETA.md`.

---

# cfs_zockt — Creator Suite v151

Aktiver Schwerpunkt: **geschlossene TikTok-/Twitch-Provider-Beta mit E-Mail-only Admin Control**. Der eigene cfs_zockt Admin-Account darf Provider und Widgets direkt testen; andere registrierte Creator warten zunächst auf eine explizite Beta-Freigabe.

- Backend: **3.18.2**
- Schema Generation: **72**
- Launcher: **0.47.24**
- Admin-Zuordnung: **nur `CFS_ADMIN_EMAILS`**
- Geschlossene Provider-Beta: **TikTok + Twitch**
- Provider Beta Gate: `npm run provider-beta151:check` → **20/20 PASS**
- Release Gate: `npm run release:v151` → **PASS**

Neue Creator werden automatisch als Beta `pending` geführt. Nach frischer Admin-Passwortbestätigung kann im Admin Control **TIKTOK + TWITCH BETA FREIGEBEN** gewählt werden. Bis dahin blockiert das Backend OAuth, Sync, Launcher-Handoff und providergebundene Widget-Runtime; reine UI-Manipulation kann die Sperre nicht umgehen.

YouTube bleibt in diesem Block unverändert und gehört nicht zur geschlossenen v151-Provider-Beta. Reale Provider-/Windows-/OBS-/Soak-Tests folgen weiterhin gesammelt nach Abschluss der Feature-Blöcke.

Siehe `TECHNIK-v151.md`, `CREATOR-SUITE-COMPLETION-v151.md` und `SECURITY-BASELINE-v151.md`.

---

# cfs_zockt — Creator Suite v150

Historischer Schwerpunkt: Website Hardening und belastbare aktive Testkette.

- Backend: **3.18.1**
- Schema Generation: **72**
- Launcher: **0.47.23**
- Website Hardening Gate: `npm run website150:check`
- Aktiver Projekt-Regressionstest: `npm run project:check`
- Release Gate: `npm run release:v150`

Siehe `TECHNIK-v150.md`, `CREATOR-SUITE-COMPLETION-v150.md` und `SECURITY-BASELINE-v150.md`.

# cfs_zockt — Creator Suite v149

Aktiver Integrationsstand: TikTok, Twitch, YouTube und OBS sind code-seitig als getrennte Creator-Provider/Integrationen vorhanden. **YouTube v149** ergänzt OAuth mit Offline-Refresh, verschlüsselte Tokens, Kanalzuordnung, LIVE-/Live-Chat-Runtime, Mitgliedschafts-/Super-Chat-Events und einen strikt YouTube-spezifischen Widget-Katalog.

Der YouTube-Block fordert nur `youtube.readonly`. Stream-/Broadcast-Management und echte Multistream-Ziele folgen als eigener nächster Feature-Block. Reale Provider-, Windows-, OBS-, Reconnect- und Soak-Abnahmen werden erst nach dem Feature-Freeze gebündelt durchgeführt; `production_ready` bleibt bis dahin bewusst `false`.

- Backend: **3.18.0**
- Schema Generation: **72**
- Launcher: **0.47.23**
- YouTube Integration Gate: `npm run youtube149:check`
- Creator Suite Aggregate: `npm run creator-suite149:check`
- Release Gate: `npm run release:v149`

Siehe `TECHNIK-v149.md` und `CREATOR-SUITE-COMPLETION-v149.md`.

---

# cfs_zockt — Creator Suite v148

## Aktueller Integrationsstand

Twitch ist code-seitig bis zur realen Provider-Acceptance vorbereitet: creator-spezifischer OAuth-/Token-Lifecycle, EventSub für LIVE/Offline, Follow, Subs/Gift-Subs, Cheer/Bits und Chat, providerreine Widgets, Remote-Reconciliation, Revocation-Handling, initialer LIVE-State-Sync und periodischer Self-Heal.

`production_ready` bleibt bewusst false, bis reale Twitch-Accounts, echte LIVE-Events, OBS/Windows und Soak-Tests bestanden sind. YouTube wird in v148 noch nicht funktional erweitert.

Siehe `TECHNIK-v148.md` und `CREATOR-SUITE-COMPLETION-v148.md`.

---

# cfs_zockt Creator Suite

Aktueller kumulativer Projektstand der cfs_zockt Website, Creator Suite und des Windows Launchers.

## Aktuelle Versionen

- Backend: **3.17.0**
- Schema: **71**
- Launcher: **0.47.22**
- Automatisierte lokale Release-/Regression-/Security-Gates: **bestanden**
- Externe Production-/Windows-/OBS-/echte LIVE-/Multi-Creator-Gates: **noch offen**

## Provider Widgets + Twitch Chat v146

- TikTok verbunden → TikTok-Widget-Katalog.
- Twitch verbunden → Twitch-Widget-Katalog.
- Beide verbunden → beide Provider-Bereiche.
- Kein Provider verbunden → nur providerunabhängige OBS-/allgemeine Widgets.
- Launcher öffnet `TIKTOK WIDGETS` bzw. `TWITCH WIDGETS` direkt im passenden gefilterten Studio-Bereich.
- Server erzwingt dieselbe Provider-Zuordnung auch bei direkten API-Requests.
- Twitch EventSub speist LIVE-/Follow-/Sub-/Cheer- und Chat-Widgets; echte Provider-Abnahme bleibt erforderlich.
- Multi-Chat führt aktuelle TikTok- und Twitch-Session-Events providergekennzeichnet zusammen.

## Stream-Ready Creator Flow v142

Launcher **0.47.19** schließt zwei konkrete UX-Lücken im Erstnutzer-Flow: Das Dashboard prüft jetzt Account, TikTok, Launcher, OBS WebSocket und ein veröffentlichtes Widget als gemeinsamen **STREAM STARTCHECK**. Im Widget Studio kann ein veröffentlichtes Widget anschließend per **IN AKTUELLE OBS-SZENE EINFÜGEN** direkt als OBS Browser Source angelegt bzw. aktualisiert werden.

Die private Widget-Source-URL wird dabei nicht in der Cloud-Action-Queue gespeichert. Der authentifizierte Launcher löst sie aus der Creator-Bibliothek auf und übergibt sie lokal an OBS. OBS-Credentials bleiben weiterhin ausschließlich lokal. Reale Windows-/OBS-/TikTok-Acceptance bleibt offen. Details: `TECHNIK-v142.md` und `CREATOR-SUITE-COMPLETION-v142.md`.


## Creator Suite Integration Pass v141

Launcher **0.47.18** ergänzt den geplanten OBS-WebSocket-Integrationspunkt: lokale verschlüsselte OBS-Credentials, kontrollierter Reconnect, Szenen lesen/wechseln und Browser-Source-URLs aktualisieren. Der Launcher begrenzt OBS-Kommandos auf eine feste Allowlist; reale Windows-/OBS-Abnahme bleibt offen.

TikTok LIVE besitzt zusätzliche Health-/Reconnect-Sichtbarkeit. Twitch und YouTube sind in v141 ausschließlich als OAuth-/Token-**Foundation** vorbereitet und werden nicht als fertig verbunden dargestellt. Details: `TECHNIK-v141.md` und `CREATOR-SUITE-COMPLETION-v141.md`.


## CUT Reference Learning Foundation v47

CUT Studio besitzt jetzt eine provider-neutrale, spielunabhängige Reference-Learning-Basis. DBD ist nur noch ein Profil neben FPS/Shooter, Battle Royale, Sports/Racing, Sandbox/Survival und Generic. Bis zu acht öffentliche YouTube-Referenzen können pro Projekt gespeichert werden; `pending`-Referenzen bleiben neutral. Nur sanitierte Analyseergebnisse dürfen kleine Editing-Boosts liefern, und semantische Events müssen immer aus dem eigenen Clip stammen. Siehe `CUT_REFERENCE_LEARNING_V47.md`.

## CFS Stream Studio Completion v46

Stream Studio ist code-seitig **FEATURE FROZEN / READY_FOR_WINDOWS_OBS_ACCEPTANCE**. Preview/Program, Dual Canvas, Quellen-Routing, Multi-Track Recording, Multistream, Multi-Chat, Live Health/Guard und Recording→Cut bleiben bestehen. v46 ergänzt den sichtbaren Save-State, Navigation-Warnung bei ungespeicherten Änderungen und die klare Regel, dass TAKE nur veröffentlichte Scenes ins Program schaltet.

Reale Windows-Capture-/Audio-, TikTok-LIVE-, OBS-/Browser-Source- und 2h-Soak-Abnahme bleibt extern offen. Siehe `STREAM_STUDIO_COMPLETION_V46.md`.

## Admin Control Center Completion v45

Der Admin-Bereich ist code-seitig eingefroren und klar von den Creator-Werkzeugen getrennt. Production zeigt Launch Gate, Monitoring, Mail-Outbox und Incident-Modus getrennt; manuelle Evidence kann nur serverseitig freigegebene manuelle Typen verwenden. Security Lockdown benötigt neben dem bestehenden Admin-Step-up eine ausdrückliche `SECURITY LOCKDOWN`-Bestätigung und kann optional andere Sessions sowie Launcher-Bridges/Device-Links widerrufen. Siehe `ADMIN_CONTROL_CENTER_V45.md`.

Status: **FEATURE FROZEN / READY_FOR_PRODUCTION_OPERATIONS_ACCEPTANCE**. Reale Incident-/Monitoring-Abnahme bleibt Bestandteil der späteren Production-Gates.

## Launcher Completion v44

Der Launcher ist code-seitig eingefroren und als zentrale lokale Schaltstelle geschärft: Widget Studio, Stream Studio, Cut Studio und Dashboard öffnen aus einer kompakten Startzentrale; Update-Status und nächste Update-Aktion sind dort ebenfalls sichtbar. Externe Creator-Ziele laufen jetzt über eine Main-Process-Allowlist statt frei zusammengesetzter Renderer-URLs. Remote HTTP, fremde Origins und nicht freigegebene Seiten werden blockiert. Siehe `LAUNCHER_COMPLETION_V44.md`.

Status: **FEATURE FROZEN / READY_FOR_WINDOWS_ACCEPTANCE**. Die reale Hardware-Abnahme bleibt R63 und muss das per v42 Release Lock exakt freigegebene Windows-Artefakt verwenden.

## Widget Studio Completion v43

Der vereinbarte Widget-Studio-Funktionsumfang ist code-seitig eingefroren: Overlay-Projekte/Scenes, Ebenen, Snap/Safe Area, 16:9/9:16, Test Center, Restore auf die letzte veröffentlichte Version und rotierbare Output-URLs. TikTok Profil, TikTok LIVE und Launcher Bridge werden getrennt dargestellt; eine Online-Bridge wird nicht als LIVE-Session ausgegeben. Siehe `WIDGET_STUDIO_COMPLETION_V43.md`.

Der Status ist **FEATURE FROZEN / READY_FOR_REAL_WORLD_ACCEPTANCE**. Reale TikTok-LIVE-, OBS- und Windows-/Hardware-Evidence wird erst in der späteren Abnahme erzeugt.

## Acceptance Release Lock v42

Vor der echten R59–R67-Abnahme wird der Release jetzt auf einen explizit verifizierten Git-Branch/Remote/Commit gelockt. Zusätzlich wird genau ein signiertes Windows-Artefakt anhand der CI-Build-Evidence freigegeben. R59–R66 müssen denselben Release-Lock tragen; R63/R64 zusätzlich dasselbe Windows Artifact Approval. Erst R67 darf daraus `LIVE_LAUNCH_PASS` bilden. Siehe `ACCEPTANCE_RELEASE_LOCK_V42.md`.

## Aktueller Schwerpunkt

Der aktuelle Creator-Suite-Ausbau arbeitet die noch offenen Integrationen nacheinander bis zum Feature-Freeze ab: OBS WebSocket ist code-seitig integriert, TikTok LIVE wird real abgenommen, danach folgen Twitch OAuth, YouTube OAuth und die echten Multistream-Ziele. Widget Studio und Launcher Core bleiben feature-frozen; Sicherheit, klare Zustände und bestehende Backend-/Runtime-Verträge haben Vorrang vor zusätzlichem Feature-Ausbau.

Bereits kumulativ enthalten:

- Website Security Pass mit CSP, Host-/HTTPS-Härtung, CSRF-/Origin-/Fetch-Metadata-Schutz und Rate Limits
- SEO-/Google-Pass mit Canonicals, robots.txt, sitemap.xml, OpenGraph, Social Preview und strukturierten Daten
- TikTok→Website-Funnel und deaktivierter, transparenter Monetarisierungs-/Affiliate-Unterbau
- öffentliche Review-Moderation im Admin-Bereich
- Widget-Studio 30-Sekunden-UX-Pass
- Core-Flow-Fixes für Goal, Counter, Timer, Chat und Kamera/Overlays
- Launcher-Stabilisierung ohne Versionssprung
- öffentliche Sicherheits-/Trust-Kommunikation
- privater Support-/Security-Meldeweg mit Admin-Inbox
- Produktbeweis-/Überzeugungspass auf der öffentlichen Startseite
- Pass 14: klar gekennzeichnete Produktvorschau sowie FREE-Account-/Registrierungs-Vertrauensblock ohne Zahlungsdaten oder automatische Buchung
- Pass 15: datensparsame CSP-Verstoß-Telemetrie, Request-IDs und eigene noindex 404-/500-Fehlerseiten
- Security & Conviction Pass 3 mit minimalem Public Status, `security.txt`, Host-/Secure-Cookie-Präfixen und fail-closed Production-Secrets
- Pass 20: zentraler Incident-/Wartungsmodus mit transparentem Public Status, kontrolliertem Write-Freeze und optionalem Session-Widerruf
- Pass 21: GitHub-Repository-Readiness für `cstaudy/cfs-zockt-Website` mit Security Policy, aktuellem PR-Gate, Repository-Scan und lokal validiertem Erst-Push-Baum

## Öffentliche Website

Die Startseite stellt cfs_zockt zuerst als Gaming-/Community-Marke vor und führt danach in die Creator Suite. Besucher können die Kernfunktionen vor der Registrierung verstehen. Ein eigener Produktbeweis-Bereich trennt klar zwischen bereits nutzbaren Funktionen und Bereichen, die noch nicht als fertig behauptet werden.

Wichtige öffentliche Seiten:

- `/` – Marke, Community, Creator Suite, Produktbeweis, Sicherheit
- `/pages/security.html` – aktive Schutzmaßnahmen und bewusst offene Punkte
- `/pages/support.html` – privater Meldeweg für Security, Datenschutz, Account und Technik
- `/pages/login.html` – Anmeldung und Registrierung
- `/pages/forgot-password.html` – Recovery-Link anfordern, wenn Mail-Relay aktiv ist
- `/pages/reset-password.html` – neues Passwort über Einmal-Token setzen
- `/pages/verify-email.html` – E-Mail-Bestätigung / neuen Bestätigungslink anfordern

## Sicherheit

Unter anderem vorhanden:

- versioniertes scrypt-Passwort-Hashing mit individuellem Salt; neue Hashes nutzen stärkere Parameter, Legacy-Hashes werden beim erfolgreichen Login migriert
- HttpOnly-/Secure-Session-Cookies in Produktion mit `__Host-`-Präfix
- signierte, sessiongebundene CSRF-Tokens
- Origin-/Referer- und Fetch-Metadata-Prüfung
- Content-Security-Policy und weitere Security Header
- CSP-Verstoßberichte über Same-Origin-Endpoint; nur aggregierte Muster ohne rohe IP/User-Agent/Query-Strings, intern im Admin sichtbar
- serverseitig erzeugte Request-IDs sowie eigene noindex 404-/500-Fehlerseiten ohne Stacktrace-Leaks
- Host-/HTTPS-Härtung
- Login-/Registrierungs-/Review-/Support-Rate-Limits
- persistenter kontoweiter Passwort-Fehlversuchs-Throttle in PostgreSQL, ohne IP-/Browser-Fingerprint-Speicherung
- gebündelte Login-/MFA-Anomalie-Warnungen bei aktivem Account-Mail-Relay
- HMAC-basierter Missbrauchsschutz ohne rohe IP im Review-/Support-Datensatz
- private Support-/Security-Inbox im Admin-Bereich
- sicherer Passwortwechsel nach Re-Authentifizierung; bestehende Sessions werden dabei widerrufen
- neue Passwörter: mindestens 15 Zeichen, keine künstlichen Komplexitätsregeln, serverseitige Blockliste für besonders vorhersehbare Werte
- standardisierter `/.well-known/security.txt` Meldeweg
- öffentlicher Status ohne Backend-/OAuth-/Moduldetails
- Production startet ohne getrennte Token-/CSRF-/Review-/Support-/MFA-Recovery-/Admin-Step-up-Secrets nicht
- E-Mail-Verifizierung/Recovery mit zufälligen, gehasht gespeicherten Einmal-Tokens und HMAC-signiertem HTTPS-Mail-Relay-Unterbau
- optionale Passkeys/WebAuthn mit domain-/origin-gebundener Public-Key-Anmeldung, User Verification, Signaturzähler und Einmal-Challenges
- optionaler TOTP-Zwei-Faktor-Schutz mit verschlüsseltem Shared Secret, Replay-Schutz und gehashten Einmal-Recovery-Codes

Ein echter TLS-/Zertifikats-/Edge-Check gegen die produktive Domain bleibt separat real auszuführen:

```bash
npm run edge:check
```

## Kleine kumulative Prüfungen

```bash
npm run check
npm run security:check
npm run seo:check
npm run funnel:check
npm run reviews:check
npm run ux30:check
npm run coreflows:check
npm run trust:check
npm run trust2:check
npm run conviction:check
npm run security3:check
npm run lifecycle:check
npm run credential:check
npm run mailrecovery:check
npm run mfa:check
npm run passkey:check
npm run anomaly:check
npm run conviction14:check
npm run resilience15:check
npm run incident20:check
```

Die historischen Milestone-/Release-Dokumente bleiben im Repository erhalten. Für den **aktuellen** Arbeitsstand ist `PROJECT_CURRENT_STATE.md` maßgeblich.


### Aktuelle Account-/Security-Pässe

Siehe `ACCOUNT_PRIVACY_LIFECYCLE_PASS.md` für Session-Verwaltung, Datenexport, TikTok-Trennung und Account-Löschung.

Siehe `ACCOUNT_CREDENTIAL_SECURITY_PASS.md` für Passwortwechsel, 15-Zeichen-Policy, versioniertes scrypt und automatische Legacy-Hash-Migration.

Siehe `ACCOUNT_MFA_SECURITY_PASS.md` für optionales TOTP und Recovery-Codes sowie `ACCOUNT_PASSKEY_SECURITY_PASS.md` für die zusätzliche Passkey/WebAuthn-Stufe.


## Account E-Mail Verification & Recovery (aktueller Stand)

Der sichere Token-/Recovery-Unterbau ist integriert. Ein produktiver Mailversand wird bewusst erst aktiv, wenn `CFS_ACCOUNT_MAIL_MODE=webhook` mit HTTPS-Relay und separatem HMAC-Secret konfiguriert ist. Optional kann danach die E-Mail-Verifizierung für neue Registrierungen mit `CFS_EMAIL_VERIFICATION_REQUIRED=true` erzwungen werden.


## Account MFA / 2FA (Pass 7)

Creator können optional TOTP über eine Authenticator-App aktivieren. Die Anmeldung erzeugt bei aktivem MFA nach erfolgreicher Passwortprüfung zunächst nur eine kurzlebige HttpOnly-MFA-Challenge; eine normale Creator-Session wird erst nach erfolgreichem zweiten Faktor erstellt. Recovery-Codes werden nur einmal angezeigt und nur gehasht gespeichert. TOTP wird ausdrücklich nicht als phishing-resistent dargestellt.


## Account Passkeys / WebAuthn (Pass 8)

Creator können zusätzlich Passkeys registrieren. Die serverseitige WebAuthn-Verifikation nutzt `@simplewebauthn/server` 14.0.2, bindet Challenges an Creator und Session bzw. MFA-Challenge und verlangt User Verification. Der private Schlüssel verbleibt immer beim Authenticator; gespeichert werden nur Credential-ID, öffentlicher Schlüssel, Signaturzähler und minimale Metadaten. TOTP und Recovery-Codes bleiben als optionale Fallback-Schicht erhalten. Für diesen Stand gilt Node.js 22+ als Mindest-Runtime. Ein echter End-to-End-Durchlauf mit realer HTTPS-Domain und Hardware-/Plattform-Authenticator bleibt vor dem Release noch auszuführen.

## Account Login / Anomaly Security (Pass 9)

Der Login kombiniert weiterhin IP-/Request-Limits mit einem zusätzlichen persistenten, kontoweiten Fehlversuchs-Throttle in PostgreSQL. Dieser zweite Zähler speichert bewusst keine IP-Adresse, keinen User-Agent und kein Geräteprofil. Aktive Sitzungen zeigen ihre Authentisierungsmethode. Ein korrektes Passwort mit anschließend fehlgeschlagenem TOTP-, Recovery- oder Passkey-Schritt wird als stärkeres Anomalie-Signal protokolliert; bei aktivem Mail-Relay werden Warnungen zeitlich gebündelt. Erfolgreiche Login-Warnungen werden ebenfalls gebündelt, damit Sicherheitsmails nicht bei jeder kurzen Neuanmeldung gespammt werden.

## Browser Request Integrity & Supply-Chain Baseline (Pass 10)

Browserbasierte Schreibzugriffe arbeiten jetzt fail-closed: Wenn weder eine vertrauenswürdige Origin/Referer noch ein positives `Sec-Fetch-Site: same-origin`-Signal vorhanden ist, wird der Request abgewiesen. Sensible Account-, Creator-, Admin-, Billing-, Launcher-, Bridge- und Auth-Antworten werden zentral mit `Cache-Control: no-store, private` sowie Legacy-No-Cache-Headern versehen.

Direkte Node-Abhängigkeiten in Backend und Launcher sind auf exakte Versionen gepinnt; `.npmrc` erzwingt `save-exact=true` und Node-Engine-Prüfung. Root und Launcher besitzen in diesem Stand **noch kein `package-lock.json`**. Die direkten Versionen sind exakt gepinnt, die transitive Dependency-Kette ist damit aber noch nicht vollständig reproduzierbar. Beide Lockfiles müssen in einer vertrauenswürdigen npm-Registry-Umgebung erzeugt und Deployments danach auf `npm ci` umgestellt werden.

Zusätzliche kleine Checks:

```bash
npm run requestintegrity:check
npm run supply:check
npm run project:check
```

## Release Candidate / automatisierte Release-Gates (Pass 11)

Der interne automatisierte Release-Stand wurde über die bisherigen kleinen Regressionen hinaus geprüft. Fehlende bzw. veraltete historische QA-Gates wurden wiederhergestellt und an die aktuelle CSP-/Dependency-/Bridge-Architektur angepasst, ohne die Produktlogik für einen Test künstlich zu vereinfachen.

Aktueller interner Nachweis:

```bash
npm run release:preflight
npm run release:gate
```

- `release:preflight`: PASS
- `project:check`: 21/21 Bereiche PASS
- `check:v42`: PASS
- `check:post-v42`: PASS
- `check:acceptance-part2`: PASS
- Launcher-/Release-Gate: **98/98 PASS**

Der 98er Gate-Lauf wurde wegen des äußeren Tool-Zeitlimits in reproduzierbaren Segmenten ausgeführt; alle einzelnen Gates wurden tatsächlich ausgeführt und bestanden. Der Gate-Runner schreibt ab diesem Stand außerdem nach jedem Gate Checkpoints, sodass ein äußerer Abbruch den Testfortschritt nicht mehr verwirft.

**Interner Code-/Automationsstatus: GO als Release Candidate.** Ein öffentlicher Production-Launch bleibt vorerst **NO-GO**, bis mindestens die externe Domain/DNS/TLS-Prüfung erfolgreich ist und Root + Launcher reproduzierbare `package-lock.json`-Dateien besitzen. Mail-Relay, reale Passkey-Ceremony und reale Windows-/LIVE-Tests sind je nach aktivierter Release-Funktion zusätzlich praktisch zu prüfen. Siehe `RELEASE_CANDIDATE_PASS11.md`.
## Production Finalization Pass 12

Der interne Release Candidate bleibt grün. Für den öffentlichen Launch gibt es jetzt zwei getrennte Gates:

- `npm run release:preflight` – kompletter interner Code-/QA-Preflight
- `npm run production:external-gate` – Lockfiles + echte DNS/TLS/Edge-Prüfung
- `npm run production:gate` – beide zusammen, fail-closed

Production- und Launcher-Deployments verwenden nach Commit der Lockfiles `npm ci`. Solange Root-/Launcher-Lockfiles fehlen oder die kanonische Domain nicht öffentlich auflösbar ist, bleibt der Production-Status bewusst `NO-GO`. Siehe `PRODUCTION_GO_LIVE_RUNBOOK.md`.



## Website Conviction / Account Start (Pass 14)

Die öffentliche Website trennt Beispielansichten jetzt ausdrücklich von echten Live-/Nutzerstatistiken. Vor der Registrierung wird konkret erklärt, dass neue Creator-Konten im FREE Plan starten, beim Anlegen keine Zahlungsdaten abgefragt werden und die Registrierung keine automatische kostenpflichtige Buchung auslöst. Gleichzeitig werden optionale starke Account-Faktoren sowie Session-, Export- und Löschkontrollen sichtbar gemacht. Die Release-Kommunikation wurde auf den tatsächlichen Stand gezogen: intern automatisiert grün, externe Production-Gates weiterhin separat offen.


## Admin Privileged Action Security · Pass 16

- privilegierte Admin-Schreibaktionen benötigen eine frische Passwortbestätigung
- Step-up-Freigabe gilt 10 Minuten und ist kryptografisch an die aktuelle Creator-Session gebunden
- produktiver Step-up-Cookie ist `__Host-`, `HttpOnly`, `Secure` und `SameSite=Strict`
- fehlende Freigabe liefert fail-closed `428 admin_reauth_required`
- Moderation, Beta-, Creator-, Production- und Release-Schreibaktionen werden zentral geschützt
- minimale Admin-Auditspur speichert nur Admin-ID, HTTP-Methode, Route, Ergebnis, Statuscode, Request-ID und Zeit
- keine Request-Bodies, rohe IPs oder User-Agents im Admin-Audit
- Audit-Retention: 180 Tage
- eigenes Production-Secret `CFS_ADMIN_ELEVATION_SECRET`
- eigenes Production-Secret `CFS_ACCOUNT_ELEVATION_SECRET` für sensible Creator-Step-ups

Prüfung:

```bash
npm run admin16:check
npm run project:check
```


## Admin Audit Integrity · Pass 17

Neue privilegierte Admin-Schreibaktionen werden zusätzlich zur minimierten Auditspur mit einer separaten HMAC-Kette verknüpft. Die Kette bindet Vorgänger-Hash, Admin-ID, Methode, Route, Ergebnis, Statuscode, Request-ID und Zeitpunkt. Ein Retention-Checkpoint erhält die Verkettung auch über die 180-Tage-Bereinigung hinweg. Bestehende ältere Auditzeilen bleiben bewusst als `LEGACY` unverkettet und werden nicht rückwirkend kryptografisch beglaubigt.

Im Admin Control Center wird die Integrität der aufbewahrten Kette angezeigt. Ein Step-up-geschützter Forensik-Export liefert die minimierten Auditdaten inklusive Hash-Metadaten und Integritäts-Snapshot. Auditdaten enthalten weiterhin keine Request-Bodies, rohe IP-Adressen oder User-Agents.

Production benötigt zusätzlich ein stabiles, eigenständiges Secret:

```env
CFS_ADMIN_AUDIT_HMAC_SECRET=<mindestens 32 zufällige Zeichen>
```

Prüfung:

```bash
npm run admin17:check
npm run project:check
```

## Database Backup & Recovery Security (Pass 18)

Der Production-Stand besitzt jetzt einen eigenen Recovery-Pfad. Provider-PITR bleibt die bevorzugte Wiederherstellung bei Datenverlust; zusätzlich können PostgreSQL-Custom-Format-Dumps mit einem separaten `CFS_BACKUP_ENCRYPTION_KEY` AES-256-GCM-verschlüsselt werden. Manifest-HMAC, Klartext-/Ciphertext-SHA-256 und `pg_restore --list` dienen zur Integritäts- und Formatprüfung.

Ein Restore ist standardmäßig **dry-run** und darf nicht in die laufende `DATABASE_URL` oder die im Backup gespeicherte Quelldatenbank erfolgen. Der echte Restore verlangt eine separate leere Ziel-Datenbank, `--execute` und `CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE`.

```bash
npm run recovery18:check
npm run recovery:doctor
npm run dbbackup:create
npm run dbbackup:verify -- backups/<datei>.cfsbackup
npm run dbrestore:run -- backups/<datei>.cfsbackup --target-url=postgresql://.../cfs_recovery
```

Siehe `DATABASE_BACKUP_RECOVERY_PASS18.md` und `ops/database-recovery-policy.json`.

## Current Recovery Baseline (Pass 19)

Der aktuelle Release Candidate trennt Datenbank-Recovery und Application-Rollback. Vor Production-Deploys kann ein Release-State-Snapshot erzeugt werden; ein manueller Recovery-Workflow validiert einen bekannten guten Commit und verlangt nach dem Redeploy erneut Canary + Edge/TLS-Gates. Ein App-Rollback führt niemals automatisch einen DB-Restore aus.

## GitHub Repository (Pass 21)

Aktives Source-Repository:

`cstaudy/cfs-zockt-Website`

Remote:

`https://github.com/cstaudy/cfs-zockt-Website.git`

Vor dem ersten Push bzw. nach Änderungen an Repository-Metadaten:

```bash
npm run github21:check
npm run github:push-plan
```

Der aktuelle Bootstrap steht in `GITHUB_REPOSITORY_BOOTSTRAP_PASS21.md`. Die älteren V40/V41-GitHub-Dokumente bleiben als historische Milestone-Dokumente erhalten.

Sicherheitsprobleme sollen nicht als öffentliche Issues gepostet werden; siehe `.github/SECURITY.md`.

### v147 Provider-Sortierung
Widget Studio trennt TikTok-, Twitch- und allgemeine OBS-Widgets jetzt auch in sichtbaren Kategorien/Suchhilfen strikt. Ein serverseitiger Taxonomie-Guard blockiert falsche Provider-Metriken/Eventtypen.


## v176 Admin Production Suite
Multi-Image Collections, frei wählbare Bundle-Inhalte, automatische Mosaik-Cover, Collection-Presets und Variantenvergleich sind umgesetzt. Siehe `ADMIN-PRODUCTION-SUITE-v176.md`.
