# HANDOFF v157 — Creator Suite geordnet / reale Acceptance bleibt nächster Block

Aktiver Release-Stand: **v157**  
Backend **3.20.3** · Schema **73** · Launcher **0.47.28**

Der Feature Freeze aus v154 bleibt aktiv. v157 enthält ausschließlich UX-/Informationsarchitektur-Bereinigung und Versions-Synchronisierung.

## Neue Grundstruktur

1. Start & Status
2. Gestalten
3. Produzieren
4. Verbinden
5. Community
6. System & Tests

## Fertig

- Launcher-Navigation nach Aufgaben gruppiert
- alle bisherigen Launcher-Views erhalten
- Sidebar bei geringer Bildschirmhöhe scrollbar
- `Creator Tools` sichtbar zu `Games & Cut` präzisiert
- Widget Studio im Einfach-Modus in Erstellen / Verwalten / Weiter zum Stream gegliedert
- Dashboard und öffentliche Creator Suite auf sechs Themen zusammengeführt
- Multistream-/Credential-Sicherheitsgrenzen sichtbar erhalten
- System Check / Build Target / Recovery Policy auf Backend 3.20.3 und Launcher 0.47.28 synchronisiert
- `workspace157:check` 69/69 PASS
- kompletter `npm run release:v157` PASS

## Nächster Arbeitsauftrag

Weiter mit der realen Testfolge aus `PRIVATE-BETA-ACCEPTANCE-v155.md`: Windows/Launcher/SafeStorage → OBS → Twitch → TikTok bei offiziellem Encoder-Zugang → YouTube nach OAuth-Setup → Multistream/Reconnect → Soak → Multi-Creator → Installer/Signing/SmartScreen.

Keine Stream-Keys, Passwörter oder Provider-Tokens in Chat/Screenshots kopieren.
