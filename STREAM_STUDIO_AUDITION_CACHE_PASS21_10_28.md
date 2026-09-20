# Stream Studio Pass 21.10.28 – Real-time Audition Cache & Transport

## Ziel

Pass 21.10.28 reduziert die Latenz beim wiederholten Vorhören langer Multitrack-Recordings. Timeline-Audition aus Pass 21.10.27 bleibt der sichere Web→Launcher-Auftragspfad; neu ist ein lokaler, mixer-sensitiver WAV-Segment-Cache plus einfache Transportsteuerung.

## Lokaler Audition Cache

Der Cut Media Engine legt ausschließlich im Launcher-Verzeichnis `_audition_cache` PCM-WAV-Segmente ab. Normale Auditions verwenden 30-Sekunden-Fenster mit 15-Sekunden-Raster. Damit können ein 4-Sekunden-Scrub, 12-Sekunden-Mix/Stem-Auditions sowie typische ±5-Sekunden-Sprünge dasselbe Segment wiederverwenden.

Ein Cache-Key ist SHA-256-basiert und berücksichtigt lokal unter anderem Recording-Datei-Zustand (Größe/mtime), Modus, eingebetteten Stream-Index und die wirksamen Source-Track-Einstellungen. Änderungen an Aktiv, Gain, Mute, Solo oder Pan erzeugen deshalb einen neuen Mix-Key; ein veralteter Mix wird nicht wiederverwendet.

30-Sekunden-Anfragen, die nicht vollständig in ein gerastertes Segment passen würden, bekommen ein exakt am gewünschten Startpunkt beginnendes 30-Sekunden-Fenster. Die Audition wird dadurch nicht abgeschnitten.

Der Cache ist auf 64 WAV-Segmente bzw. 512 MiB begrenzt. Die ältesten Segmente werden lokal entfernt. Cache-Hits, Misses, Renderings, Evictions, Datei-Anzahl und Bytes erscheinen in der lokalen Media-Engine-Telemetrie.

## Transport

Cut Studio hat zusätzlich `−5 S`, `+5 S`, `PAUSE`, `PLAY` und `STOP`. ±5 Sekunden bewegen den Web-Playhead und fordern den neuen Punkt an; liegt er im vorhandenen lokalen Segment, ist dafür kein neuer FFmpeg-Render nötig. Pause/Play/Stop werden als kleine `cut_audition`-Transportjobs an den verbundenen Launcher geschickt und steuern nur dessen lokale Electron-Audioinstanz.

Der Launcher spielt bei Cache-Segmenten nicht blind die gesamte 30-Sekunden-Datei. Er springt mit `currentTime` auf den berechneten Offset und stoppt nach der ursprünglich angeforderten 4-/12-/maximal 30-Sekunden-Dauer. Resume respektiert dieselbe Endgrenze.

## Sicherheitsgrenze

Recording-Datei, Cache-WAV und absolute lokale Dateipfade bleiben ausschließlich auf dem Launcher-PC. Die Website übermittelt nur Projekt-ID, Handoff-ID aus dem bereits gespeicherten Projekt, Modus, Track-Key, Start/Dauer und Transportaktion. Die Website kann keinen lokalen Datei- oder Preview-Pfad vorgeben.

Cache-Dateinamen sind Hashes und enthalten weder Recording-Dateinamen noch Streamkeys, RTMP-Adressen, Tokens oder Credentials.

## Abnahme

Der Repository-Test prüft Fensterbildung, Cache-Hit ohne zweiten Render, Cache-Invalidierung bei Mixänderung, Track-/Mix-Trennung, Längen-Grenzfall, Eviction, lokale Hash-Dateinamen, Server-Transport-Schema, Launcher-IPC, Playback-Offset/Stopgrenze und Cut-Studio-Steuerung.

Die echte Windows-Abnahme mit mehrstündigen 6-Track-Recordings bleibt offen. Insbesondere reale Cache-Latenz, Datenträgerlast und Bediengefühl bei sehr langen Aufnahmen müssen auf dem Windows-Zielsystem gemessen werden.
