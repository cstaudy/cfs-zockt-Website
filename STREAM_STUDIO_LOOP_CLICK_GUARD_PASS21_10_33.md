# Stream Studio Pass 21.10.33 – Loop Boundary Crossfade / Click Guard

## Ziel

Pass 21.10.33 reduziert harte Sample-Sprünge an der B→A-Grenze der in Pass 21.10.32 eingeführten A/B-Audition. Der Click Guard bleibt vollständig lokal im Launcher-WebAudio-Pfad. Die Website speichert nur eine gewünschte Fade-Dauer in Millisekunden.

## Bedienung

Im Timeline-Audition-Bereich besitzt die A/B-Region jetzt `CLICK GUARD`. Unterstützt werden 0, 5, 10, 12, 20, 40 und 50 ms. 12 ms ist der Standard. `AUS` entspricht 0 ms. Die Auswahl wird im Cut-Projekt als `audition_loop_crossfade_ms` gespeichert.

## Laufzeitmodell

Der Click Guard verändert die A/B-Länge nicht. Beispiel: A=10,000 s, B=25,000 s, Click Guard=12 ms. Die WebAudio-Loop-Periode bleibt exakt 15,000 s. Die letzten 12 ms vor B werden über einen lokalen `GainNode` linear von 1 auf 0 ausgeblendet. Die nächste Runde startet exakt am normalen B-Zeitpunkt wieder bei A und blendet dort über 12 ms von 0 auf 1 ein. Dadurch gibt es weder einen vorgezogenen nächsten Loop noch kumulativen Clock-Drift.

Das ist bewusst eine Boundary-Crossfade-Hülle ohne zeitliche Überlappung zweier vollständiger Loop-Zyklen. Sie priorisiert stabile A/B-Zeitsemantik und Click-Reduktion. Ein späteres AudioWorklet könnte bei real messbarem Bedarf eine aufwendigere samplebasierte Überblendung übernehmen.

## Begrenzungen und Fallback

Die Website und der Server akzeptieren höchstens 50 ms. Der Launcher begrenzt zusätzlich auf höchstens ein Viertel der A/B-Länge. An einer lokalen Cache-Grenze wird die tatsächlich verwendete Fade-Dauer weiter auf das verfügbare Audio am Loop-Anfang und -Ende begrenzt. Fehlt WebAudio-`GainNode`-Unterstützung, bleibt die A/B-Wiedergabe funktionsfähig und fällt auf die harte Loop-Grenze zurück; dieser Fall wird nur lokal als Fallback gezählt.

## Protokoll und Sicherheit

`cut_audition` verwendet ab diesem Pass Schema 12 und ergänzt für `loop_start`/`loop_seek` ausschließlich `loop_crossfade_ms`. Es werden weiterhin keine Recording-Dateien, Cache-WAV-Pfade, PCM-Daten, AudioBuffer, Streamkeys, RTMP-Adressen oder Tokens in Cut-Projekt, Job oder Runtime transportiert. Die Audiodaten bleiben im Launcher und werden über die bereits bestehende Session-ID/Segment-Grenze geladen.

## Tests

Der Repository-Test prüft Sanitizing, 0–50-ms-Grenzen, Projektpersistenz, Schema 12, Launcher-Revalidierung, Renderer-Übergabe und den WebAudio-Scheduler mit Fake-`AudioContext`. Dabei wird insbesondere bestätigt, dass ein 15-s-Loop mit 12-ms Click Guard weiterhin bei 0,08 / 15,08 / 30,08 s startet und damit keinen Perioden-Drift erzeugt. Die Gain-Automation wird für Fade-out vor B und Fade-in ab A separat geprüft.

## Offene reale Abnahme

Die reale Windows-Abnahme bleibt offen. In dieser Linux-Umgebung kann nicht behauptet werden, dass eine echte 6-Track-Aufnahme auf konkreter Windows-Audiohardware bei allen Treibern, Lastzuständen und Audio-Gerätewechseln hörbar klickfrei ist. Zu prüfen sind insbesondere 0/5/12/20/50 ms, sehr kurze Loops und Device-Recovery.
