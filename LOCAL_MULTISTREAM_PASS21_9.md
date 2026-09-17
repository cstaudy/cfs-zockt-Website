# Pass 21.9 – CFS Local Multistream

## Ziel

CFS Stream Studio kann mehrere Streaming-Ziele konfigurieren, ohne Stream-Keys, Tokens, Passwörter oder RTMP/RTMPS-Zieladressen in der CFS Cloud zu speichern.

## Architektur

- Website = Control Plane für Zieltyp, Output-Profil, Bitrate und Aktivierung.
- Launcher = lokale Credential- und Streaming-Engine.
- Capture, Audio, Encoding und Ziel-Zugangsdaten bleiben lokal.
- Cloud Relay bleibt deaktiviert und ist kein Bestandteil dieses Passes.
- Zielausfälle werden als voneinander isolierte Ausgänge modelliert.

## Plan-Limits

- FREE: maximal 1 gleichzeitiges lokales Streaming-Ziel.
- CREATOR: maximal 2 gleichzeitige lokale Streaming-Ziele.
- PRO: maximal 4 gleichzeitige lokale Streaming-Ziele.
- Root/Admin: Testgrenze 8 Ziele.

Die Limits werden nicht nur in der Oberfläche, sondern serverseitig beim Speichern durchgesetzt.

## Unterstützte Zielprofile

Vorbereitet sind YouTube, Twitch, TikTok, Kick, Facebook und Custom RTMP/RTMPS. Die tatsächliche Streaming-Berechtigung hängt immer von der jeweiligen Plattform und den lokal im Launcher hinterlegten Zugangsdaten ab. CFS umgeht keine Plattformbeschränkungen.

## Stabilität

- Pro Ziel eigenes Profil und eigene Bitrate.
- Aggregierte Upload-Schätzung im Stream Studio.
- Empfohlene Reserve von mindestens 30 Prozent bzw. 2 Mbit/s.
- Maximal acht vorbereitete Zielprofile pro Konfiguration.
- Ein Zielfehler soll später nicht die anderen aktiven Ziele beenden.
- Alte Einzelziel-Konfigurationen werden ohne Secret-Migration in das neue Schema überführt.

## Security

Der Server verarbeitet nur eine Whitelist aus ID, Label, Provider, Aktivstatus, Profil und Bitraten. Secret-Felder werden nicht in das Cloud-Schema übernommen. Der Launcher-Bridge-Endpunkt liefert ebenfalls nur die sanitizte Control-Plane-Konfiguration.

## Status

Pass 21.9 liefert die abgesicherte Multistream-Control-Plane. Echtes RTMP/RTMPS-Senden, Reconnect, Encoder-Worker, lokale Credential-Verwaltung und Ziel-Telemetrie folgen in der Launcher Streaming Engine.
