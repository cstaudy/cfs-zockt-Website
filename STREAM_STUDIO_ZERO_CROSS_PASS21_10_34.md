# Stream Studio Pass 21.10.34 – Auto Zero-Cross Snap / Loop Boundary Inspector

## Ziel

Pass 21.10.34 ergänzt die A/B-Audition aus Pass 21.10.32/33 um einen lokalen Boundary Inspector. Der Inspector soll harte Sample-Sprünge nicht nur mit dem vorhandenen Click Guard maskieren, sondern bereits die eigentlichen Marker auf nahe Nulldurchgänge verschieben können. Er bleibt bewusst beratend: Die Website zeigt Vorschläge, verändert A oder B aber niemals automatisch.

## Lokaler Analysepfad

Der Launcher verwendet die lokale Recording-Datei und exakt den im Cut-Projekt eingestellten Recording-Stem-Mix. Aktiv, Mute, Solo, Gain, Pan und die lokalen eingebetteten Stream-Indizes werden dabei genauso aufgelöst wie bei Timeline-Audition und Export. Für A und B wird getrennt ein kleines Audiofenster gelesen. Der Suchradius ist auf 5 bis 50 Millisekunden begrenzt; in der Oberfläche stehen 10, 20, 30 und 50 ms zur Wahl.

FFmpeg wandelt nur dieses kurze Fenster in 48-kHz-Mono-PCM S16LE um. Der PCM-Buffer bleibt ausschließlich im Launcher-Prozess. Der Analyzer sucht zuerst echte Vorzeichenwechsel zwischen zwei benachbarten Samples. Unter mehreren Treffern gewinnt der zeitlich nächstgelegene Crossing; bei identischer Distanz der leisere Grenzpegel. Falls im Suchfenster kein Vorzeichenwechsel vorkommt, wird kontrolliert das Sample mit dem kleinsten Absolutpegel als `LOWEST LEVEL` vorgeschlagen.

## Sichere Ergebnisform

Zur Website gelangen keine Sampledaten. Das persistierte Job-Ergebnis enthält pro Grenze nur:

- `original_ms`
- `suggested_ms`
- `delta_ms` mit maximal ±50 ms
- `level_dbfs` zwischen −96 und 0 dBFS
- `crossing` als Boolean

Zusätzlich werden nur Suchradius, Sample-Rate und Analysezeitpunkt geführt. Recording-Datei, absoluter Dateipfad, FFmpeg-Pipe, PCM-Buffer, Cache-WAV und AudioBuffer werden nicht in Job, API oder Projekt geschrieben.

## Cut-Studio UX

Im Timeline-Audition-Bereich gibt es jetzt `AUTO ZERO-CROSS SNAP`. `GRENZEN PRÜFEN` speichert zuerst die aktuellen Stem-Regler und A/B-Marker, erstellt dann einen kurzlebigen `cut_audition`-Job mit der Aktion `inspect_zero_cross` und pollt anschließend ausschließlich dessen konkrete Job-ID. A und B erhalten jeweils Uhrzeit, Verschiebung, dBFS-Pegel und die Kennzeichnung `ZERO CROSS` oder `LOWEST LEVEL`.

`A SNAP`, `B SNAP` und `BEIDE SNAP` übernehmen Vorschläge explizit. Wenn A/B oder ein Recording-Stem-Regler nach der Analyse verändert wurde, gilt der Vorschlag als veraltet und kann nicht mehr angewendet werden. Dadurch kann ein Ergebnis aus einem früheren Mixzustand nicht still auf eine neue Loop-Region übertragen werden.

## Protokoll

`cut_audition` verwendet ab diesem Pass Schema 13. Neu sind nur die Aktion `inspect_zero_cross` und `search_radius_ms`. Der Inspector nutzt dieselbe gesicherte Handoff-Verifikation wie andere Timeline-Auditions: Der Launcher akzeptiert nur einen lokalen Recording-Handoff, dessen Handoff-ID und Cut-Projekt-ID zum Job passen. Der Inspector bleibt ein Audition-Job und zählt nicht gegen reguläre Cut-Export-Slots.

## Zusammenspiel mit Click Guard

Zero-Cross Snap ersetzt den Click Guard aus Pass 21.10.33 nicht. Beide Funktionen ergänzen sich. Snap reduziert die Sample-Differenz an A/B, während der optionale 0–50-ms-Click-Guard die verbleibende B→A-Grenze lokal über GainNode-Rampen entschärft. Die Loop-Periode und die WebAudio-Clock bleiben unverändert.

## Repository-Abnahme

Der Pass-Test prüft unter anderem echte PCM-Vorzeichenwechsel, nächstgelegenen Crossing, Lowest-Level-Fallback, Radius-Clamps, Projekt-Sanitizer, Job-Result-Sanitizer, Schema 13, Launcher-Handoff-Verifikation, UI-Invalidierung, exaktes Job-ID-Polling und die Pfad-/PCM-Sicherheitsgrenze. Zusätzlich bleibt die komplette bestehende Stream-Studio-Testkette Bestandteil der Abnahme.

## Reale Windows-Abnahme bleibt offen

Im Linux-Testsystem kann der DSP-/FFmpeg-Pfad mit synthetischem Multi-Audio-Material validiert werden, aber eine reale Windows-6-Track-Aufnahme mit tatsächlicher Audiohardware wird dadurch nicht ersetzt. Noch offen sind insbesondere hörbare Vergleiche von Originalgrenze, Zero-Cross-Snap und Click Guard unter Last sowie bei Audio-Gerätewechseln. Es wird daher nicht behauptet, dass jeder vorgeschlagene Snap auf echter Windows-Hardware automatisch hörbar klickfrei ist.
