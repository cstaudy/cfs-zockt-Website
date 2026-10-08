# CFS ZOCKT · Übergabe 3.20.58

## Basisversion
3.20.57 · ALL TESTS READY

## Zielversion
3.20.58

- Website / Backend: **3.20.58**
- Datenbankschema: **80**
- Launcher: **0.47.31**
- Status: **CODE READY**

## Ziel dieses Updates
Stream Maker und Widget Studio werden für neue Nutzer klar voneinander getrennt, ohne bestehende Bundles oder ältere statische Widget-Studio-Projekte zu zerstören.

Produktregel ab 3.20.58:
- **Stream Maker = visuelles Designsystem**: Masterbild, Kamera-Rahmen, Branding, Szenen, Panels, Design-Bundle.
- **Widget Studio = dynamische Live-Elemente**: Goals, Counter, Timer, Chat, Events, Latest- und Provider-Daten.
- **Tonstudio = Alert-Sound / Audio**.
- **Stream Studio / OBS = Live-Produktion und Ausgabe**.

## Geänderte Bereiche
- Stream Maker Standardkategorien auf Overlays, Szenen und Panels reduziert.
- Masterbild-Generator erzeugt nur noch visuelle Design-Bausteine.
- Neue Stream-Maker-Bundles starten mit einem Kamera-Rahmen statt Countdown.
- Neuer Design-Starter enthält keine Goals / Timer / Counter mehr.
- Direkter Übergang vom Maker ins Widget Studio heißt jetzt klar „Dynamisches Widget daraus bauen“.
- Alter Overlay-Handoff bleibt technisch vorhanden, ist aber im Standardweg verborgen.
- Widget Studio Simple-Quickstart enthält keine Kamera mehr.
- Widget Studio Simple-Kategorien enthalten keine statischen Overlays mehr; Events bekommen stattdessen einen eigenen Einstieg.
- Dynamische Typen bilden die empfohlene Widget-Studio-Auswahl.
- Statische Kamera-/Scene-/Branding-Typen bleiben im Profi-/Legacy-Pfad kompatibel.
- Bestehende dynamische Elemente in alten Stream-Maker-Bundles bleiben ladbar und werden als Legacy-Bausteine erklärt.

## Bewusst nicht geändert
- Keine Datenbankmigration.
- Keine Launcher-Änderung.
- Keine Löschung alter Widget-/Maker-Typen aus Server oder Datenmodell.
- Keine Änderung an bestehenden gespeicherten Bundles.
- Keine Änderung an Shop-Entitlements oder Creator-Downloads.
- Keine neue Provider-/OBS-Funktion.

## Teststatus
Ausgeführt:
- `node tools/studio-role-separation-v32058-test.mjs .` → **18/18 PASS**
- `node tools/master-image-generator-v32050-test.mjs .` → **32/32 PASS**
- `node tools/stream-maker-handoff-v32046-test.mjs` → **PASS**
- `node tools/widget-studio-30s-ux-test.mjs .` → **41/41 PASS**
- `node tools/stream-maker-test.cjs` → **PASS**
- `node tools/stream-maker-lifecycle-test.cjs` → **PASS**
- `npm run check:v32058` → **PASS** (vollständige bestehende Regression einschließlich Launcher-Static-Check)
- Delta-Installer Check 3.20.57 → **19 Dateien aktualisierbar**
- Delta-Installer Apply → **PASS**
- zweiter Installer-Check → **0 Dateien**
- Konflikttest mit absichtlich veränderter `public/pages/stream-maker.html` → **Exit 1, Hash unverändert, package.json bleibt 3.20.57**

## Externe / manuelle Acceptance
Die reale Acceptance bleibt **OFFEN**. Dieses Update verändert keine bereits offenen Acceptance-Blöcke:
- Windows Launcher + OBS
- echte Twitch/TikTok/YouTube-Provider-Tests
- Browser-/Responsive-Matrix
- 60-Minuten-Soak / Recovery

Zusätzlich manuell prüfen:
- neuer Nutzer versteht nach höchstens wenigen Sekunden die Rollen von Stream Maker und Widget Studio;
- Stream Maker zeigt keine neuen Goals/Counter/Timer im Standardkatalog;
- Widget Studio Simple zeigt keine Kamera-/Overlay-Erstellung;
- bestehendes Alt-Bundle mit Countdown/Goal bleibt editierbar.

## Einbau und Konfliktschutz
Dieses Update wird als Delta auf **3.20.57** ausgeliefert. Der Installer muss vor jeder Änderung die erwarteten SHA-256-Werte der Basisdateien prüfen. Bei eigener/abweichender Änderung wird der Einbau vollständig abgebrochen; keine betroffene Datei darf still überschrieben werden.

Vor Einbau Backup erstellen. Nach Einbau `npm run check:v32058` ausführen.

## Bekannte offene Punkte
- Profi-/Legacy-Bereich des Widget Studios enthält weiterhin statische Kamera-/Scene-/Branding-Typen, damit bestehende Projekte kompatibel bleiben.
- Vollständige Entfernung dieser Legacy-Typen wäre eine spätere Migration und ist bewusst nicht Teil dieses Updates.
- Reale Acceptance ist weiterhin offen.

## Nächster Arbeitsblock
**Acceptance Block A: Windows + Launcher + OBS**. Ab jetzt nur noch Fehlerkorrekturen oder UX-Lücken aus echten Acceptance-Ergebnissen; keine erneute Vermischung der Studio-Rollen.

## Wichtige Dateien
- `public/pages/stream-maker.html`
- `public/assets/js/stream-maker.js`
- `public/assets/js/stream-maker-core.js`
- `public/assets/css/stream-maker.css`
- `public/pages/widget-studio.html`
- `public/assets/js/widget-studio.js`
- `public/assets/css/cfs-suite-v203.css`
- `tools/studio-role-separation-v32058-test.mjs`
- `tools/master-image-generator-v32049-test.mjs`
- `tools/master-image-generator-v32050-test.mjs`
- `tools/widget-studio-30s-ux-test.mjs`
- `package.json`
- `package-lock.json`
- `server.js`
- `public/assets/js/page-system-check.js`
