# CFS Zockt · Restarbeiten 3.20.61

Basis: `FUNKTIONSLUECKEN-STATUS-3.20.60.md`; alle nicht ausdrücklich genannten Punkte und alle Live-Abnahmen bleiben offen.

| Priorität | Bereich | Ist 3.20.61 | Nächste Abnahme |
|---|---|---|---|
| P1 | 01 Live-Daten / Events | Twitch Follow/Bits, TikTok/Twitch/YouTube Runtime von 3.20.60 unverändert. | Echte Provider-/Windows-/OBS-Ereignisse, Trennung der Sessions, 60-Minuten-Soak. **HOLD.** |
| P1 | 02 Bild → Widgets | Motiv-Layer 3.20.59 unverändert. Statische lokale Maker-Bilder können nutzergebunden importiert werden. | Realbilder/Browser-Layout; fehlende Paketdateien aus Originalquelle. |
| P1 | 03 Einfacher Gesamt-Flow | Maker → eigene Medienreferenz → Widget-Konverter → Publish-Guard → OBS URL; geführter Editor-Abschluss; gefahrloser Startdesign-Fallback. **12/12 neue Tests.** | Durchgängige Render-Browser/Windows-OBS-Acceptance, Auth/Quota-Fälle, echte Shop-Pakete. **HOLD.** |
| P1 | 04 Tonstudio | Unverändert. | Editor für Samples, Echte-Wiedergabe + Hörtests. |
| P1 | 05 Cut Studio | Unverändert. | Audiovisuelle Vorschau, Codec/Hardware. |
| P1 | 06 Download-Designs | Unverändert. Im gelieferten Archiv fehlt der Paket-Katalog. | Autoritative Assets/Manifeste, Alpha/ZIP/OBS. |
| P2 | 07 CFS AI | Unverändert. | Render/Datenschutz/Failover. |
| P2 optional | 08 Bezahlen | Kostenlose Beta, Commerce AUS. | Nur ausdrücklicher Checkout/Entitlement-Gate. |
| Blocker | 09 Windows Launcher | Unverändert 0.47.31. | EXE/OBS WebSocket/Audio/Soak. |

**Querschnittsblocker:** historischer Testsatz unvollständig; `public/assets/data/design-pack-catalog-v211.json` fehlt in der 3.20.60-Quelle. Die ergänzten Integrations-Mocks sind **kein** Ersatz für reale Live-Evidence. BETA = HOLD.
