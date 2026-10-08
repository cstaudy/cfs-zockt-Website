# CFS Zockt · Restarbeiten 3.20.60

Grundlage: `FUNKTIONSLUECKEN-STATUS-3.20.59.md`. Alle dort genannten Folgearbeiten bleiben bestehen, soweit hier nicht ausdrücklich ergänzt.

| Priorität | Bereich | Ist 3.20.60 | Nächste Abnahme |
|---|---|---|---|
| P1 | 01 Live-Daten / Events | Twitch: zusätzliche eventbasierte Session-Counter und Goals für Follow/Bits; abgesicherte Session-Abfragen und Stale-Zeitfenster; explizite Simulator-Trennung. TikTok-Bridge, Twitch EventSub und YouTube-Polling bleiben vorhanden. **Code fokussiert getestet.** | **HOLD:** reale Provider-Events und OBS auf Windows, Reset/Offline pro Typ, Provider-Scopes, 60-Minuten-Soak, reproduzierbare Evidence. Fehlende ältere Testdateien wiederherstellen und Gesamt-Regression. |
| P1 | 02 Bild → fertige Widgets | 3.20.59 Motiv-Layer unverändert. | Reale Bild- und Browser-Acceptance, semantische Segmentierung separat. |
| P1 | 03 Einfacher Studio-Ablauf | Maker-/Widget-Rollentrennung unverändert. | Shop→Masterbild→Widget→OBS Ende-zu-Ende. |
| P1 | 04 Tonstudio | Lokale Alert-Engine unverändert. | Echter Sample-Editor und Hörtests. |
| P1 | 05 Cut Studio | Export-/FFmpeg-Workflows unverändert. | Vollständige audiovisuelle Browser-Vorschau, Hardware/Codec-Evidence. |
| P1 | 06 Download-Designs | Manifeste/Designwelten unverändert. | Alpha, Layout, ZIP, Farbvarianten und OBS-Installation. |
| P2 | 07 CFS AI | Vorhandene Anbindung unverändert. | Konfiguration/Failover/Datenschutz live auf Render prüfen. |
| P2 optional | 08 Bezahlen | Kostenlose Beta; Commerce weiterhin AUS. | Nur nach ausdrücklichem Checkout-/Entitlement-Gate. |
| Blocker | 09 Windows Launcher | Quellstand 0.47.31 unverändert. | Reale EXE, OBS, Audio, Game Capture, Reconnect, 60-Minuten-Soak. |

**Entscheidungsregel:** `CODE geprüft` ≠ `BETA ABGENOMMEN`. Ohne echte Provider-/Windows-/OBS-Evidence bleibt **HOLD**.
