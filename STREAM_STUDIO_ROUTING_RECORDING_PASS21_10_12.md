# Pass 21.10.12 – Source Routing, Multi-Track Recording & Workspace Presets

## Ziel
Die in Pass 21.10.11 vorbereitete OBS-/Streamlabs-artige Studio-Oberfläche wird technisch erweitert, ohne die lokale Media-Engine mit der Website zu vermischen.

## Eingebaut
- Pro Scene-Quelle serverseitig allowlist-sanitisiertes Routing für `LIVE`, `RECORDING`, `16:9` und `9:16`.
- Die öffentliche Scene Runtime wertet das Routing tatsächlich aus. Recording-Scene-Routen verwenden `mode=recording`.
- Pro CFS-Scene-Quelle Filter für Helligkeit, Kontrast, Sättigung und Blur; Werte werden im Client und erneut serverseitig begrenzt.
- Aufnahme-URLs je Format (`recording_landscape`, `recording_tiktok_vertical`).
- Lokale FFmpeg-Aufnahme kann Stream-Mix, Audio Bus 1 und Audio Bus 2 als getrennte Spuren in dieselbe Datei mappen.
- Track-Namen werden als Audio-Stream-Metadaten geschrieben.
- Bis zu sechs Studio-Workspace-Presets mit Dock-Positionen, Panelgrößen und Spaltenbreiten; Server sanitisiert jedes Preset erneut.

## Sicherheits-/Architekturgrenzen
- Keine Stream-Keys, RTMP-Secrets, Roh-Audio- oder Roh-Video-Daten werden durch diese Funktionen in die Website-Konfiguration aufgenommen.
- Multi-Track-Aufnahme bleibt lokal im Launcher.
- Source-Filter und Routing sind für CFS Scene Runtime technisch aktiv. Native Screen/Game/Camera-Layer benötigen für dieselbe Routing-/Filterlogik noch den geplanten nativen Compositor im Launcher.
- Es werden aktuell maximal zwei lokale Audio-Eingangsbusse plus der gemeinsame Mix aufgenommen. Weitere App-spezifische Busse (z. B. Discord/Musik getrennt) setzen native Application-Audio-Capture voraus.

## Tests
- `npm.cmd run studio-routing21:check`
- `npm.cmd run stream-studio21:check`
- `npm.cmd run stream-engine21:check`

Ein echter Windows-Test mit FFmpeg, MKV, zwei Audiogeräten und realem Multistream bleibt Production-/Hardware-Abnahme.
