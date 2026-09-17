# CFS Stream Studio – Workflow Options Pass 21.10.3

## Ziel

Das Stream Studio übernimmt bewährte Arbeitsmuster aus professioneller Streaming-Software, ohne OBS oder Streamlabs zu kopieren. Der Fokus bleibt auf einem einfachen CFS-Workflow mit nativen Widgets, Scene Composer, lokalem Launcher und Local Multistream.

## Neu

- Schnellstart-Szenen: Gameplay, Just Chatting, Starting Soon, BRB/Pause, Stream Ende und Vertical Live.
- Schnelle Output-Presets: Qualität 1080p60, Balanced 1080p30, Leicht 720p60 und Vertical 1080x1920.
- Eigenes `Stream Check`-Panel.
- Preflight-Prüfung für Launcher, LIVE-Scene, Bildquelle, Mikrofon, Output, Ziel/Aufnahme, Planlimit und Upload-Budget.
- Der Preflight startet keinen Stream und liest keine Streamkeys aus. Hardware-, Netzwerk- und Zielzugangsdaten bleiben Aufgabe des lokalen Launchers.

## Recherche-Orientierung

OBS und Streamlabs strukturieren den Live-Workflow rund um Scenes, Sources, Audio und Output. Streamlabs betont zusätzlich schnelle Szenen-Setups, integrierte Widgets, Dual Output und einen vereinfachten Go-Live-Ablauf. CFS übernimmt daraus nur allgemeine UX-Muster und verbindet sie mit eigenen CFS-Funktionen.

## Noch bewusst offen

- Native Game-Capture-Hooks
- WASAPI Loopback / echtes natives Desktop-Audio
- Multi-Chat
- Automationen / Auto Scene Switching
- horizontale und vertikale Varianten derselben Scene
- echter Launcher-Hardware-Preflight und echter Go-Live-Start
