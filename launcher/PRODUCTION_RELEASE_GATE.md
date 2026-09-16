# cfs_zockt Creator Suite — Production Release Gate

## A. Automatische Gates

Diese Gates laufen über `npm run release:gate`.

- [x] Static / Syntax Contract
- [x] Bridge Client Integration
- [x] Persistent Event Spool
- [x] Stream Preflight
- [x] Gift-Streak Normalizer
- [x] Full LIVE Session E2E gegen Fake Bridge
- [x] 900-Event Stress Test
- [x] 12-Source OBS Polling Simulation
- [x] Release Package Contract

Ein GitHub Release darf nicht gebaut werden, wenn eines dieser Gates fehlschlägt.

## B. Windows Real-World Gate — noch manuell

- [ ] GitHub Actions V0.13 Build erfolgreich
- [ ] SHA256SUMS stimmt
- [ ] Setup auf sauberem Windows 11 installiert
- [ ] Portable auf sauberem Windows 11 gestartet
- [ ] Windows Autostart getestet
- [ ] Tray / Minimieren / Beenden getestet
- [ ] Renderer Crash Recovery getestet
- [ ] Update-Prüfung getestet
- [ ] Deinstallation getestet
- [ ] Code Signing / SmartScreen geprüft

## C. TikTok LIVE Gate — echter Stream nötig

- [ ] echter Follow kommt im Event Bus an
- [ ] LIVE Like Count korrekt
- [ ] Share Event korrekt
- [ ] Viewer Update korrekt
- [ ] Single Gift korrekt
- [ ] Gift-Streak final nur einmal mit korrekter Menge
- [ ] Provider Disconnect / Reconnect
- [ ] Launcher Neustart während aktiver Session
- [ ] persistente Events werden nachgesendet
- [ ] keine doppelten Alerts / AutoThanks

## D. OBS Gate

- [ ] Follower Goal
- [ ] LIVE Like Goal
- [ ] Viewer Counter
- [ ] Gift Goal / Counter
- [ ] Share Goal / Counter
- [ ] Follow Alert
- [ ] Gift Alert
- [ ] Share Alert
- [ ] Latest Follower
- [ ] Latest Gift
- [ ] 8–12 Browser Sources gleichzeitig
- [ ] Browser Source Reload
- [ ] Backend kurz offline → Recovery
- [ ] Launcher geschlossen → bereits veröffentlichte Cloud Widgets bleiben sichtbar

## Release-Entscheidung

Production Release erst, wenn **A vollständig PASS** und **B/C/D manuell vollständig bestätigt** sind.
