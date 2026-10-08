# CFS Zockt · Restarbeiten 3.20.62

Basis: `FUNKTIONSLUECKEN-STATUS-3.20.61.md`; sämtliche dort aufgeführten unerledigten Punkte und Live-Acceptances bleiben offen, sofern hier nicht ausdrücklich anders angegeben.

| Prio | Bereich | Ist 3.20.62 | Nächster Abschluss |
|---|---|---|---|
| P1 | 01 Provider-Events | 3.20.60 Live-Bindings unverändert. | Echte Sessions, Windows/OBS/Provider/60-Minuten-Soak: **HOLD**. |
| P1 | 02 Bild → Widgets | 3.20.59 Motiv-Layer unverändert. | Browser/Provider-Acceptance: **HOLD**. |
| P1 | 03 Maker → Widget → OBS | 3.20.61 Browser-Flow unverändert. | E2E/OBS/Quota/Render: **HOLD**. |
| P1 | 04 Tonstudio | **Lokal funktionaler WAV-Sample-Editor**, Wellenform, Trim, Fade, Gain, Peak, hörbare Web-Audio-Vorschau und Download. **16/16 Tests** sowie unabhängiger WAV-Dekoder PASS. | Reale Browser-/Kopfhörer-/OBS-Hörabnahme, automatische Widget-Soundbinding und Launcher-Live-Mixer weiter offen. |
| P1 | 05 Cut Studio | Nicht geändert. | Audio+Video-Vorschau, Encoder/Hardware-Matrix, reale Exporte. |
| P1 | 06 Download-Designs | Unverändert; Katalogdatei fehlt. | Autoritative Originalpakete und Tests wiederherstellen. |
| P2 | 07 CFS AI | Unverändert. | Render/Datenschutz/Failover. |
| P2 optional | 08 Checkout | AUS, nicht freigeschaltet. | Nur über ausdrückliches Commerce-Gate. |
| Blocker | 09 Launcher | 0.47.31 unverändert. | Windows/OBS/Audio/Soak/Bestätigung. |

**Querschnittsblocker:** fehlender Designpaket-Katalog und Teile alter Testtargets; neuer Headless-Chromium-Smoke-Test wegen Timeout nicht abgenommen. **BETA = HOLD**. Keine echte Provider-/OBS-/Windows-Abnahme behaupten.
