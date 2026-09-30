# HANDOFF v153 — cfs_zockt Creator Suite

## Aktiver Stand
Backend **3.19.0** · Schema **72** · Launcher **0.47.25** · kumulativer Update-Stand **v153**.

## Schwerpunkt v153
CFS Stream Studio Provider-Zielintegration. Twitch und YouTube können aus dem bereits verbundenen Creator-Account auf ausdrückliche Launcher-Aktion in lokale Streaming-Ziele übernommen werden. TikTok bleibt ausschließlich mit offiziell bereitgestelltem Encoder-/Stream-Key-Zugang nutzbar.

## Sicherheitsvertrag
- keine dauerhafte Stream-Key-Persistenz in PostgreSQL oder Browser-State
- Provider-Import über authentisierte/signierte Launcher-Bridge
- Importantworten no-store/no-cache
- lokale verschlüsselte Ablage über Windows SafeStorage
- Twitch zusätzlicher Read-Scope `channel:read:stream_key`, getrennt von EventSub/Chat
- YouTube weiterhin nur `youtube.readonly`
- keine Umgehung von TikTok-Zugangsregeln
- Cloud Relay bleibt deaktiviert

## Status
`stream-provider-target153:check` 45/45 PASS, Multistream 70/70 PASS, Control Center 37/37 PASS und kompletter `release:v153` PASS. CFS Studio gilt code-seitig als bereit für reale Multistream-Acceptance, nicht als produktionsabgenommen.

## Nächste Phase
Feature-seitig keine unnötige Studio-Erweiterung mehr. Als Nächstes Beta-Test-Handbuch/Acceptance-Matrix und danach reale Windows-/OBS-/Twitch-/YouTube-/TikTok-/Reconnect-/Last-/Soak-Tests. Nur Fehler oder zwingende Integrationslücken aus diesen Tests werden zurück in den Feature-Stand übernommen.

## Paketregel
Jede Version bleibt bis zum Release ein **kumulatives Updatepaket, kein Full Project**. Vor echtem Release wird ein vollständiger Projektstand/Full Build erzeugt.
