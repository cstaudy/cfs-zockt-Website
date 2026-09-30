# HANDOFF v156 — Website bereinigt / reale Acceptance bleibt nächster Block

Aktiver Release-Stand: **v156**  
Backend **3.20.2** · Schema **73** · Launcher **0.47.27**

Der Feature Freeze aus v154 bleibt aktiv. v156 enthält ausschließlich Website-/UX-Bereinigung und Status-Synchronisierung.

## Fertig

- statische CS2-/FC25-/Warzone-Bilder aus dem Stream-Bereich entfernt
- statisches Warzone-Fallback der LIVE-Vorschau entfernt
- neutrale CFS-LIVE-Fläche bei fehlendem echten Cover
- lokale Demo-GAME_ART-Fallbacks für Recent Games entfernt; echte Remote-Cover bleiben möglich
- Startseiten-Einstieg auf Streams / Creator Suite vereinfacht
- falsche LIVE-/Streamplan-Sprache bereinigt
- Creator-Suite-Seite auf kostenlose geschlossene Beta und Acceptance-Phase synchronisiert
- falschen Stream-Studio-Anker korrigiert
- Multistream-Roadmap-Status aktualisiert
- `homepage156:check` 32/32 PASS
- kompletter `release:v156` PASS

## Nächster Arbeitsauftrag

Weiter mit der realen Testfolge aus `PRIVATE-BETA-ACCEPTANCE-v155.md` und dem integrierten Beta-Test-Handbuch: Windows/Launcher/SafeStorage → OBS → Twitch → TikTok falls offizieller Encoder-Zugang → YouTube nach OAuth-Setup → Multistream/Reconnect → Soak → Multi-Creator → Installer/Signing/SmartScreen.

Keine Stream-Keys, Passwörter oder Provider-Tokens in Chat/Screenshots kopieren.
