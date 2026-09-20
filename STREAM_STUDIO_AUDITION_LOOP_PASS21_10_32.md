# Stream Studio Pass 21.10.32 – A/B Loop Audition & Selection Range

## Ziel

Pass 21.10.32 macht die bereits vorhandenen A- und B-Marker zu einer echten lokalen Loop-Region für Recording-Audition. Die Auswahl wird im Cut Studio sichtbar über dem Playback-Head markiert. `A↔B LOOP` startet eine Continuous-WebAudio-Session, die ausschließlich den Bereich von A bis unmittelbar vor B wiederholt.

Die Loop-Region ist nicht auf ein einzelnes 30-Sekunden-Cachefenster begrenzt. Längere Bereiche werden wie bisher aus mehreren lokalen Audition-Cache-Segmenten zusammengesetzt. Die kleinste erlaubte Loop-Länge beträgt 500 ms.

## WebAudio-Loop

Der WebAudio-Transport aus Pass 21.10.30 bleibt die autoritative lokale Audio-Clock. Für Loop-Sessions besitzt er zusätzlich `loopStartMs` und `loopEndMs`. Beim Scheduling wird jedes AudioBufferSourceNode nur bis zur B-Grenze geplant. Danach wird der nächste Node auf derselben AudioContext-Zeitachse wieder ab A geplant.

Der Transport verwendet keinen periodischen Neustart der HTML-Audio-Wiedergabe und keinen neuen Web-Bridge-Job pro Wiederholung. Bereits dekodierte Cache-Segmente können über mehrere Loop-Zyklen erneut als AudioBuffer genutzt werden.

Pause speichert die aktuelle modulare Loop-Position. Resume plant ab genau dieser Position weiter. `loop_seek` ersetzt die lokale Session kontrolliert an der gewünschten Position innerhalb A→B.

## Auswahl und Bedienung

A und B bleiben Bestandteil des Cut-Projekt-Presets. Die Website berechnet daraus eine sichtbare Auswahlregion über dem Timeline-Range-Input. Ist B nicht mindestens 500 ms größer als A, bleibt der Loop-Button deaktiviert.

Während eine Loop-Session läuft, werden Scrub und ±5-Sekunden-Sprünge auf die A/B-Region begrenzt. Ein normaler `CONTINUOUS PLAY` startet weiterhin eine nicht geloopte Session. Finite Mix-/Stem-Vorschauen bleiben unverändert.

## Clock Sync

Die sanitiserte Audition-Runtime aus Pass 21.10.31 wurde um `loop_enabled`, `loop_start_ms` und `loop_end_ms` erweitert. Der Browser-Estimator behandelt eine laufende Loop-Clock modular: überschreitet die geschätzte Position B, wird sie auf A plus Restzeit zurückgeführt. Dadurch folgt der sichtbare Playhead auch zwischen zwei Server-Ankern korrekt über den B→A-Wrap.

In der Cloud werden weiterhin nur Transportmetadaten gespeichert. Es werden **kein Audio und keine lokalen Dateipfade** synchronisiert. Recording-Datei, Cache-WAVs, PCM-Daten, AudioBuffer, Streamkeys, RTMP-Adressen und Tokens bleiben außerhalb dieser Runtime.

## Datenbankmigration

Bestehende Installationen erhalten die drei Loop-Spalten über `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Eine Neuinstallation legt sie direkt in `creator_cut_audition_runtime` an.

## Repository-Abnahme

Der Pass-Test prüft die reine Loop-Mathematik im Browser-Clock-Helfer, WebAudio-Scheduling über B→A, Pause/Resume, Mehrfach-Wraps, lokale Segment-Byte-Grenze, Server-Validierung, Schema 11, Runtime-Migration, UI-Auswahl, Loop-Job-Payload sowie die bestehende Secret-/Pfadgrenze.

Die vorhandenen Audition-Pässe 21.10.25 bis 21.10.31 bleiben Regressionstests.

## Noch offen

Die reale Windows-Abnahme bleibt offen. Mit einer echten 6-Track-Aufnahme muss hörbar geprüft werden, ob die A/B-Grenze bei unterschiedlichen Audiotreibern, Systemlast und langen Loop-Regionen ohne Klick/Jitter wiederholt wird. Dieser Pass behauptet keine reale Hardware-Abnahme oder garantiert klickfreie Ausgabe auf jedem Windows-Audiosystem.
