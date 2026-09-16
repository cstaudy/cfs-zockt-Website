# CFS Creator Suite — Final Test Matrix

Backend: `3.12.0`  
Launcher: `0.42.0`

## Website / Creator Account

- [ ] Login/Logout funktioniert
- [ ] Registrierung funktioniert
- [ ] Security-/Account-Seite lädt
- [ ] FREE/CREATOR/PRO wird korrekt angezeigt
- [ ] Admin-Zugriff nur für berechtigte Creator

## TikTok Account / OAuth

- [ ] Creator 1 verbindet TikTok real
- [ ] Creator 2 verbindet TikTok real
- [ ] Profil/Avatar/Follower-Daten werden korrekt synchronisiert
- [ ] Disconnect entfernt Creator-Verknüpfung korrekt
- [ ] Reconnect funktioniert erneut

## Widget Studio

- [ ] Widget erstellen
- [ ] Text/Counter/Progress/Shape/Image bearbeiten
- [ ] Widget veröffentlichen
- [ ] stabile OBS URL funktioniert
- [ ] TikTok Vertical Output korrekt
- [ ] Landscape Output korrekt
- [ ] lokaler Alert-Test sichtbar
- [ ] Widget eines anderen Creators nicht zugreifbar

## Scene Studio

- [ ] Scene erstellen
- [ ] Widget Position/Scale/Rotation/Opacity bearbeiten
- [ ] Scene veröffentlichen
- [ ] Scene Runtime als Browser Source
- [ ] Scene im Launcher laden
- [ ] Scene Creator Isolation

## Desktop Launcher

- [ ] Setup auf Clean Windows 11
- [ ] Device-Link
- [ ] Login bleibt nach Neustart erhalten
- [ ] Tray / Hide / Restore
- [ ] Autostart falls aktiviert
- [ ] Update Check
- [ ] Diagnostics / Preflight
- [ ] OBS Doctor
- [ ] Support Bundle
- [ ] Logout / Device Revoke

## TikTok LIVE Provider

- [ ] echter LIVE Connect
- [ ] echtes Follow Event
- [ ] echtes Like Event
- [ ] echtes Gift Event
- [ ] echtes Share Event
- [ ] Viewer Snapshot/Update
- [ ] Gift Streak
- [ ] Reconnect nach Unterbrechung
- [ ] Launcher Restart + Session Recovery
- [ ] keine doppelten Event Deliveries

## CFS Stream Deck

- [ ] 12-Button Layout
- [ ] Widget On/Off
- [ ] Follow/Gift/Share Test
- [ ] AutoThanks Toggle
- [ ] Game Start/Stop/Score/Reset
- [ ] Cut Projekt öffnen
- [ ] Layout nach Neustart erhalten

## Creator Games

- [ ] Game Runtime vorhanden
- [ ] Overlay URL funktioniert
- [ ] Start/Stop
- [ ] Follow Regel real
- [ ] Like Regel real
- [ ] Gift Regel real
- [ ] Share Regel real
- [ ] Rule Hit Dedupe
- [ ] Game Runtime in Scene

## Cut Studio

- [ ] lokale Videoquelle zuordnen
- [ ] ffprobe/Metadaten falls vorhanden
- [ ] Timeline/Reihenfolge
- [ ] Caption Burn-in
- [ ] Keyframes / Bezier
- [ ] Transition
- [ ] mehrere Musikspuren
- [ ] mehrere Voice-Spuren
- [ ] SFX
- [ ] Voice Ducking
- [ ] Waveform/Peak Analyse
- [ ] Clip Export
- [ ] Reel Export
- [ ] Export Cancel falls vorhanden
- [ ] Exportordner öffnen
- [ ] größeres reales Creator-Video

## OBS

- [ ] Widget Browser Source
- [ ] Scene Browser Source
- [ ] Transparenz
- [ ] 1080x1920 / 1920x1080
- [ ] Framerate unter Last
- [ ] Cloud Sources laufen nach Launcher-Schließen
- [ ] mehrere Sources gleichzeitig

## TikTok LIVE Studio / Output

- [ ] 9:16 Output real sichtbar
- [ ] gewählter Capture-/Output-Pfad funktioniert
- [ ] Alpha/Hintergrund Verhalten geprüft
- [ ] gleichzeitig OBS + TikTok
- [ ] 30 Minuten Stabilität

## Billing / Stripe Testmode

- [ ] CREATOR Checkout
- [ ] PRO Checkout
- [ ] signierte Webhooks
- [ ] Plan wird korrekt angewendet
- [ ] Customer Portal
- [ ] Upgrade
- [ ] Downgrade
- [ ] Kündigung Periodenende
- [ ] Payment Failure / Grace
- [ ] Invoice Paid / Recovery

## Release / Windows / Production

- [ ] GitHub Quality Gate PASS
- [ ] GitHub Windows Build PASS
- [ ] Authenticode VALID oder bewusst als offen dokumentiert
- [ ] Setup EXE installiert
- [ ] Portable EXE startet
- [ ] Installed Updater E2E
- [ ] Pilot Beta 5 Creator
- [ ] Expanded Beta 20 Creator
- [ ] Production Canary
- [ ] Production Rollback
- [ ] Finales Go/No-Go dokumentiert
