# Stream Studio Pass 21.10.30 – Gapless Audition Transport / WebAudio Buffer Queue

## Ziel

Pass 21.10.30 ersetzt bei `CONTINUOUS PLAY` den bisherigen Wechsel zwischen einzelnen HTML-`Audio`-Elementen durch eine lokale WebAudio-Buffer-Queue. Der vorhandene 30-Sekunden-Audition-Cache und das Prefetch aus 21.10.28/29 bleiben bestehen; geändert wird ausschließlich der lokale Wiedergabetransport im Launcher.

Das Ziel ist ein sample-genau geplanter Segmentübergang auf derselben `AudioContext`-Zeitachse. Das ist eine Transport-Eigenschaft des Renderers und keine Behauptung, dass jede reale Windows-Audioausgabe oder jede Quellaufnahme bereits hörbar artefaktfrei abgenommen wurde.

## WebAudio-Transport

Der Launcher lädt Continuous-Segmente in einen gemeinsamen `AudioContext`. Jede lokale WAV wird mit `decodeAudioData()` in einen `AudioBuffer` dekodiert. Für die Wiedergabe wird pro Segment ein `AudioBufferSourceNode` erzeugt und mit `start(when, offset, duration)` auf einen festen Context-Zeitpunkt gelegt.

Wenn Segment A bei Context-Zeit 0,08 Sekunden für 30 Sekunden startet, wird Segment B auf exakt 30,08 Sekunden und Segment C entsprechend auf 60,08 Sekunden geplant. Damit entsteht kein JavaScript-`ended`→`play()`-Startabstand zwischen zwei HTML-Audioelementen. Der Scheduler kann bereits dekodierte Folgesegmente lange vor der eigentlichen Grenze in die Queue stellen.

Der erste Sessionabschnitt darf mitten in einem Cache-Fenster beginnen. In diesem Fall wird der passende `offset` innerhalb des `AudioBuffer` verwendet. Am Timeline-Ende begrenzt der Main-Prozess die nutzbare Segmentdauer weiterhin auf die reale Restdauer, auch wenn die physische Cache-WAV länger ist.

## Pause / Resume / Stop

`PAUSE` berechnet aus `AudioContext.currentTime` und dem Session-Anker die aktuelle Timeline-Position und stoppt die bereits geplanten BufferSource-Nodes. `WEITER` baut von genau dieser Millisekundenposition einen neuen lokalen Zeitplan auf. Das ist notwendig, weil `AudioBufferSourceNode` selbst nicht pausierbar ist.

`STOP` verwirft Session, geplante Nodes und dekodierte Buffer. Ein `session_seek` aus Cut Studio ersetzt wie bisher die lokale Session durch eine neue verifizierte Session ab der Zielposition.

## Prefetch und RAM

Die WAV-Erzeugung bleibt unverändert im mixer-sensitiven lokalen Cache. Fehlende zukünftige Segmente werden ausschließlich über `launcher:cut-audition-prefetch` im Launcher nachgeladen; dafür entsteht kein neuer Web→Launcher-Bridge-Job.

Im Renderer werden standardmäßig höchstens fünf dekodierte Segmente gehalten. Ältere `AudioBuffer` können aus dem RAM fallen, ohne die WAV aus dem lokalen Disk-Cache zu löschen. Damit bleibt der Speicherverbrauch bei langen Sessions begrenzt.

## Gehärtete lokale Pfadgrenze

Continuous-Session-Events enthalten ab Pass 21.10.30 keinen lokalen WAV-Pfad mehr. Der Main-Prozess speichert intern eine Zuordnung aus aktiver Session-ID, Segmentstart und dem tatsächlich von der Media Engine erzeugten Cache-Pfad.

Der Renderer fordert ein Segment ausschließlich mit **Session-ID + Segmentstart** über lokales Electron-IPC an. Der Main-Prozess prüft, dass die Session noch aktiv ist, dass genau dieses Segment zur Session gehört, dass die Datei direkt im lokalen Audition-Cache liegt, dass ihr Name einer SHA-256-WAV entspricht und dass sie höchstens 8 MiB groß ist. Erst danach werden die WAV-Bytes als `Uint8Array` an den lokalen Renderer übergeben.

Es gibt keine allgemeine Dateilesefunktion. Die Website kann weiterhin weder Recording-Pfad noch Cache-Pfad noch Preview-Pfad vorgeben. Streamkeys, RTMP-Adressen, Tokens und Credentials sind nicht Bestandteil dieses Pfads.

## Finite Audition

Kurze 4-/12-Sekunden-Scrub-, A/B- und Einzelstem-Vorschauen bleiben bewusst auf dem bestehenden einfachen lokalen Audio-Pfad. Die WebAudio-Queue ist für die fortlaufende Continuous Session zuständig, bei der Segmentübergänge relevant sind.

## Repository-Abnahme

Der Pass-Test verwendet einen kontrollierten Fake-`AudioContext`. Geprüft werden unter anderem drei Segmente auf derselben Context-Timeline, exakte Back-to-back-Startzeiten, Timeline-Restdauer, Start mitten im Buffer, Pause/Resume mit Offset, Prefetch bei fehlendem Segment, Dekodier-RAM-Limit und die neue Session-ID/Segmentstart-Byte-Grenze.

Die bestehenden Pässe 21.10.25 bis 21.10.29 bleiben Regressionstests.

## Noch offen

Die reale Windows-Abnahme bleibt offen. Mit einer echten 6-Track-Aufnahme müssen hörbare Lücken oder Klicks an Segmentgrenzen, AudioContext-Suspend/Resume, Gerätwechsel sowie lange 1–4-Stunden-Sessions gemessen werden. Falls dabei trotz WebAudio-Buffer-Queue messbare Artefakte auftreten, wäre ein AudioWorklet-/Ringbuffer-Pfad der nächste technische Schritt. Eine bestandene Windows-Hardware-Abnahme wird in diesem Pass ausdrücklich nicht behauptet.
