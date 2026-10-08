# CFS Zockt · Restarbeiten 3.20.64

Basis `FUNKTIONSLUECKEN-STATUS-3.20.63.md`; dort nicht ausdrücklich geänderte offene Punkte gelten weiter.

| Prio | Bereich | Stand 3.20.64 | Nächster Abschluss |
|---|---|---|---|
| P1 | 01 Provider-Events | v3.20.60 Live-Bindings vorhanden | Realprovider/Windows/OBS/60-Min-Soak **HOLD** |
| P1 | 02 Bild → Widget | v3.20.59 Motiv-Layer vorhanden | Browser/Provider **HOLD** |
| P1 | 03 Maker → Widget → OBS | v3.20.61 Ablauf vorhanden | E2E auf Render/OBS **HOLD** |
| P1 | 04 Tonstudio | v3.20.62 WAV-Editor vorhanden | Hör- und Widget-Soundbindung **HOLD** |
| P1 | 05 Cut Studio | v3.20.63 Vorschau/Preflight vorhanden | Vollständige Browser-/Windows-/Encoder-/OBS-Abnahme **HOLD** |
| P1 | 06 Download-Designs | **Neu:** 8 integrierte Basisdesigns × 16 Farben, ZIP (7 PNG + JSON + Manifest), lokaler Maker-Import, 27/27 Tests. Originalkatalog (31) fehlt weiter. | Originalpakete + Nutzungsrechte beschaffen, Browser/Mobile/Render-ZIP-Download + Maker-Import abnehmen **HOLD** |
| P2 | 07 CFS AI | unverändert | Datenschutz, Render, Fallback, Failover |
| P2 | 08 optional Checkout | AUS | Nur nach ausdrücklichem Freigabe-Gate |
| Blocker | 09 Launcher | 0.47.31 unverändert | Windows/OBS/Audio/Soak, FFmpeg/GPU-Test |

Querschnitt: Historischer Testbestand teilweise unvollständig. Keine vollständige historische CI- oder Live-Freigabe. **BETA HOLD.**
