# HANDOFF v153 — Provider → Streaming-Ziel Zusammenführung abgeschlossen

Aktiver Release-Stand: **v153**  
Backend **3.19.0** · Schema **72** · Launcher **0.47.25**

Der in der v152-Übergabe geplante Multistream-Provider-Ziel-Block ist code-seitig abgeschlossen.

## Fertig

- Twitch `channel:read:stream_key` + offizieller Ingest
- Twitch Re-Auth nur für Streaming-Ziel, EventSub unabhängig
- YouTube `liveStreams`/Ingest über `youtube.readonly`
- Auswahl bei mehreren YouTube Streams
- TikTok weiterhin nur offizieller Encoder-Zugang, kein Auto-Import
- signierter/no-store Launcher-Importpfad
- lokale SafeStorage-Persistenz
- Website nur mit provider target status, ohne Secrets
- kompletter aktiver release:v153 Gate PASS
- v153 Test 45/45 PASS
- Projekt-Regression 30/30 PASS
- Provider-Beta 20/20 PASS
- Multistream-Core 70/70 PASS
- rekonstruierter YouTube-v149-Vertrag 41/41 PASS

## Nicht als real getestet behaupten

Windows, OBS, Twitch LIVE, TikTok LIVE, YouTube LIVE, 2+ Ziele gleichzeitig, Reconnect/Netzwerkverlust, Soak, mehrere Creator, Installer/Signing.

## Nächster Arbeitsauftrag

1. CFS Studio Feature Freeze vorbereiten.
2. Beta-Test-Handbuch vollständig bauen.
3. verbliebene Feature-Lücken prüfen, keine neuen großen Features eröffnen.
4. Danach echte gebündelte Acceptance starten.
