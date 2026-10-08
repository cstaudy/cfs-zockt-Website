# CFS Zockt · Restarbeiten 3.20.63

Basis `FUNKTIONSLUECKEN-STATUS-3.20.62.md`; alle dort nicht ausdrücklich geänderten offenen Punkte bleiben offen.

| Prio | Bereich | Stand 3.20.63 | Nächster Abschluss |
|---|---|---|---|
| P1 | 01 Provider-Events | v3.20.60 Live-Bindings weiterhin vorhanden | Realprovider/Windows/OBS/60-Min-Soak **HOLD** |
| P1 | 02 Bild → Widget | v3.20.59 Motiv-Layer vorhanden | Browser/Provider **HOLD** |
| P1 | 03 Maker → Widget → OBS | v3.20.61 Ablauf vorhanden | E2E auf Render/OBS **HOLD** |
| P1 | 04 Tonstudio | v3.20.62 WAV-Editor vorhanden | Hör- und Widget-Soundbindung **HOLD** |
| P1 | 05 Cut Studio | **Neu:** audiovisuelle Einzelclip-Vorschau (Basis-Music/Voice/Caption), Exportplan-Preflight, 28/28 Tests. Echter H.264/AAC-Export mit Linux-Software-FFmpeg/FFprobe bestätigt. | Vollständigen Audiomix/Keyframes/Captions/Transitions + Windows-Hardware-/OBS-Tests mit Evidence abnehmen **HOLD** |
| P1 | 06 Download-Designs | fehlender Original-Designkatalog unverändert | Originaldaten und Tests verfügbar machen |
| P2 | 07 CFS AI | unverändert | Render, Datenschutz, Failover |
| P2 | 08 optional Checkout | AUS | Nur nach ausdrücklichem Freigabe-Gate |
| Blocker | 09 Launcher | 0.47.31 unverändert | Windows/OBS/Audio/Soak, FFmpeg/GPU-Test |

Querschnitt: Teile des historischen Testbestands fehlen weiterhin. Keine vollständige historische CI-Freigabe. **BETA HOLD.**
