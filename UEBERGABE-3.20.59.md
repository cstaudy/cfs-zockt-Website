# CFS Zockt · Übergabe 3.20.59

## Basisversion
3.20.58 · Rollen Stream Maker / Widget Studio.

## Zielversion
3.20.59 · Bild→dynamisches Widget, Motivausschnitte.

## Status
**CODE READY**, reale Acceptance **OFFEN / HOLD**.

## Ziel dieses Updates
Die erste echte Motiv-Ableitung ins Widget Studio einsetzen, während die Plattformdaten vom Widgettyp kommen und der Nutzer einen klaren Zweischritt erhält.

## Geänderte Bereiche
- Widget-Konverter: Motiv / Logo, Stilauswahl Prisma/Ribbon/Glass.
- Clientseitiger Canvas-Motiv-Layer mit Transparenz und Farbanalyse.
- Normaler geschützter Asset-Upload und Widget-Draft-Save.
- Neuer funktionaler Restarbeiten-Plan für alle neun Bereiche.

## Bewusst nicht geändert
- Keine DB-Migration; Schema 80.
- Launcher 0.47.31 unverändert, kein Windows-Build.
- Keine automatische Provider-Event-Injection, keine Fake-Follower-Zahlen.
- Keine automatische KI-Bildsegmentierung, kein Kauf-/Entitlement-Wechsel.
- Vorhandene Widgets/Bundles und Originalbilder bleiben erhalten.

## Teststatus
- Neuer Generator-Unit-/Integrationstest (Mock-Canvas + statische Contracts): 27/27 PASS.
- `npm run check:v32059`: **PASS** in Arbeitskopie und nach Delta-Installation auf frischer 3.20.58-Kopie.
- Installer: 15 Dateien aktualisiert; zweiter Check: 0 Änderungen; Konflikt mit eigener `widget-studio.js`: Exit 1, SHA unverändert, `package.json` bleibt 3.20.58.
- Browser-/OBS-Live-Abnahme offen.

## Externe / manuelle Acceptance
**OFFEN**: tatsächlicher Browser-Flow auf Render, Windows/OBS, Twitch/TikTok/YouTube, Smartphone-Layouts, 60-Minuten-Soak, echte Captions-/Audio-Vorschau.

## Einbau und Konfliktschutz
Nur Delta 3.20.58→3.20.59. Installer zunächst `--check`, dann `--apply`, nachher `npm run check:v32059`. SHA-Prüfung und Backup vor Überschreiben. Bei eigenen Änderungen ohne passenden Quellhash abbrechen, manuell mergen.

## Bekannte offene Punkte
- Motiv-Layer nutzt deterministischen Bildausschnitt, keine semantische Erkennung und Freistellung.
- Nach einem abgebrochenen Widget-Anlageversuch kann ein eigenes erzeugtes PNG in der Medienbibliothek verbleiben.
- Live-Provider- und Zielbrowser-Abnahme ausstehend.

## Nächster Arbeitsblock
**01 · echte Live-Daten / Events und Provider-Matrix** – gegen vorhandene Registry und EventSub/TikTok-Verträge abgleichen, fehlende Bindungen implementieren, dann Windows-/Provider-Live-Acceptance mit Evidence. Danach einfacher Gesamt-Flow, Tonstudio, Cut-Vorschau, Design-Pakete, CFS AI, optional Checkout, Launcher.

## Wichtige Dateien
- `public/assets/js/widget-motif-generator.js`
- `public/assets/js/widget-studio.js`
- `public/pages/widget-studio.html`
- `public/assets/css/widget-studio.css`
- `tools/widget-motif-generator-v32059-test.mjs`
- `tools/studio-role-separation-v32058-test.mjs`
- `FUNKTIONSLUECKEN-STATUS-3.20.59.md`
- `UPDATE-3.20.59.md`
