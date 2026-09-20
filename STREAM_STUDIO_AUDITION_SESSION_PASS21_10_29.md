# Stream Studio Pass 21.10.29 – Continuous Audition Session / Prefetch

## Ziel

Pass 21.10.29 baut auf Timeline Audition und dem lokalen Audition Cache auf. `CONTINUOUS PLAY` soll längere Recording-Strecken lokal durchspielen, ohne für jedes 30-Sekunden-Segment einen neuen Web→Launcher-Bridge-Job zu erzeugen.

## Session-Ablauf

Cut Studio sendet `session_start` mit Projekt, Handoff-ID aus dem bereits gespeicherten Projekt und der aktuellen Playhead-Position. Der Launcher verifiziert den lokalen Recording-Handoff, übernimmt die gespeicherte Stem-Mischung und erzeugt eine zufällige lokale Session-ID. Das erste WAV-Segment wird aus dem bestehenden mixer-sensitiven Cache gelesen oder lokal mit FFmpeg erzeugt.

Sobald die lokale Wiedergabe startet, fordert der Electron-Renderer die nächsten Segmente ausschließlich über lokales IPC an. Der Main-Prozess rendert bzw. cached bis zu zwei Fenster voraus und sendet nur an den eigenen Renderer lokale Segmentpfade. Am Segmentende schaltet der Renderer auf das nächste bereits vorbereitete WAV. Danach wird erneut vorausgeladen. Dadurch braucht die Bridge keinen neuen Job pro Abschnitt.

`PAUSE` und `WEITER` steuern die aktuelle lokale Audioinstanz. `STOP` beendet die Session. Wird während einer aktiven Web-Session gescrubbt oder ±5 Sekunden gesprungen, sendet Cut Studio `session_seek`; der Launcher ersetzt daraufhin die lokale Session an der neuen Position. Eine normale finite Mix-/Stem-Vorschau beendet eine laufende Continuous Session, damit nie zwei Auditions gegeneinander spielen.

## Cache und Prefetch

Die vorhandenen 30-Sekunden-WAV-Segmente bleiben SHA-256-basiert und mixer-sensitiv. Prefetch nutzt denselben Cache-Key wie normale Audition. Ein Cache-Hit startet daher keinen zweiten FFmpeg-Render. Zusätzlich zählt die Media Engine Prefetch-Anfragen, Prefetch-Hits und Prefetch-Renderings.

Am Timeline-Ende wird kein volles Folgefenster mehr erzwungen: das letzte Segment wird nur bis zum verbleibenden Ende angefordert. Pro lokaler Prefetch-Anfrage werden höchstens vier, standardmäßig zwei Segmente vorbereitet.

## Sicherheitsgrenze

Recording-Datei, Cache-WAVs, Session-Segmentpfade und absolute lokale Pfade bleiben ausschließlich im Launcher. Die Website kann keinen lokalen Pfad vorgeben. Das lokale IPC akzeptiert nur eine aktive Session-ID plus Zeitposition/Anzahl; die eigentliche Source-Datei und Stem-Konfiguration werden ausschließlich aus dem im Main-Prozess gehaltenen, zuvor verifizierten Session-Kontext gelesen.

Streamkeys, RTMP-Adressen, Tokens und Credentials sind weder Session- noch Cache-Bestandteil.

## Abnahme und Grenze

Der Repository-Test prüft Prefetch-Ketten, Timeline-Ende, Cache-Hits, neue Schema-10-Aktionen, lokale Session-Verifikation, lokale IPC-Grenze, Renderer-Segmentwechsel, Pause/Resume/Stop sowie Session-Seek aus Cut Studio. Zusätzlich bleiben die Pässe 21.10.25–21.10.28 regressionsgeprüft.

Der Wechsel zwischen zwei HTML-Audio-Elementen ist nicht als sample-genau oder garantiert gapless zu verstehen. Die reale Windows-Abnahme mit einer 6-Track-Aufnahme sowie die Messung hörbarer Lücken/Jitter bei langen Sessions bleibt offen.
