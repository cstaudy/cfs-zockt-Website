# Stream Studio Pass 21.10.31 – Audition Clock Sync / Live Playhead Follow

## Ziel

Pass 21.10.31 verbindet die tatsächliche lokale WebAudio-Zeit aus dem Launcher mit dem Playback Head im browserbasierten Cut Studio. Während `CONTINUOUS PLAY` folgt der Playhead damit nicht mehr nur dem zuletzt angeforderten Startpunkt, sondern der vom lokalen `AudioContext` gemessenen Session-Position.

Die Synchronisierung überträgt ausdrücklich **kein Audio und keine lokalen Dateipfade**. Zwischen Launcher und Website werden nur Projekt-/Session-ID, Transportzustand, Start/Ende, aktuelle Millisekundenposition, Revision und Sample-Zeitpunkt synchronisiert.

## Clock-Quelle

Die autoritative Clock bleibt der lokale WebAudio-Transport aus Pass 21.10.30. Der Electron-Renderer liest `positionMs()` aus dem laufenden `AudioContext`-Anker. Während einer aktiven Session meldet er ungefähr alle 500 ms einen lokalen Snapshot an den Main-Prozess.

Der Main-Prozess verifiziert die Session-ID gegen die tatsächlich aktive lokale Audition-Session und drosselt Bridge-Updates auf ungefähr 850 ms. Pause, Resume, Stop und Timeline-Ende werden sofort übertragen.

## Cloud-Runtime

Der Server speichert den sanitisierten Audition-Zustand in `creator_cut_audition_runtime`. Die Tabelle enthält ausschließlich Transport-Metadaten. Recording-Pfad, Cache-WAV-Pfad, AudioBuffer, PCM-Daten, Streamkeys, RTMP-Adressen oder Tokens sind nicht Teil des Schemas.

Jedes Update enthält `revision` und `sampled_at_ms`. Ein verspätet eingetroffenes Paket mit älterem Sample-Zeitpunkt darf einen neueren Zustand nicht überschreiben. Ein laufender/pausierter Runtime-Eintrag gilt nach 12 Sekunden ohne Update als `stale`.

## Browser-Follow

Cut Studio lädt den aktuellen Audition-Runtime-Zustand ungefähr alle 900 ms. Zwischen zwei Server-Ankern läuft der sichtbare Playhead lokal mit `requestAnimationFrame` weiter. Für einen laufenden Zustand wird die Position aus `position_ms + (Date.now() - sampled_at_ms)` geschätzt und auf maximal fünf Sekunden Extrapolation sowie das Timeline-Ende begrenzt.

Während der Benutzer den Range-Slider zieht, ist Live-Follow temporär ausgesetzt. Beim Loslassen wird wie bisher ein `session_seek` ausgelöst, falls eine Continuous Session aktiv ist. Danach übernimmt die gemeldete lokale Audio-Clock wieder.

Ein kurzer Command-Grace-Zeitraum verhindert, dass ein unmittelbar nach `CONTINUOUS PLAY` eintreffender noch alter `idle`-Snapshot die lokal gerade gestartete Session wieder auf „nicht aktiv“ setzt.

## Pause / Resume / Seek / Ende

- `PAUSE`: WebAudio friert die tatsächliche Timeline-Position ein; diese Position wird sofort synchronisiert.
- `WEITER`: WebAudio schedult ab der gespeicherten Position neu und meldet direkt einen neuen Playing-Anker.
- `session_seek`: Der Launcher ersetzt die Session wie bisher; die neue Session-ID und Zielposition werden nach Start synchronisiert.
- Timeline-Ende: Der Renderer meldet `ended` mit der Endposition, bevor die lokale Session verworfen wird.
- `STOP`: Der letzte bekannte Sessionpunkt wird als `stopped` synchronisiert.

## Sicherheitsgrenzen

Der Renderer darf Clock-Updates nur für die aktuell aktive Session-ID melden. Der Main-Prozess konstruiert die Bridge-Nutzlast selbst aus seiner verifizierten lokalen Session. Die Website besitzt keinen API-Pfad, um einen lokalen Recording- oder Cache-Dateipfad in diese Runtime einzuschleusen.

Die neue Browser-Hilfsdatei `cut-audition-clock.js` ist reine Clock-Mathematik und enthält weder Netzwerk- noch Dateisystemzugriff.

## Repository-Abnahme

Der Pass-Test prüft Clock-Mathematik, Clamping, Pause/Playing-Verhalten, Statuslabels, Datenbankschema, stale protection, Bridge-Route, Mainprozess-Throttling, Session-ID-Prüfung, Renderer-Reporting, Website-Polling, `requestAnimationFrame`-Follow, Scrub-Sperre und die Pfad-/Secret-Grenzen.

Die bestehenden Pässe 21.10.25 bis 21.10.30 bleiben Regressionstests.

## Noch offen

Die reale Windows-Abnahme bleibt offen. Mit einer echten langen 6-Track-Aufnahme muss geprüft werden, wie genau der Browser-Playhead über mehrere Minuten/Stunden zur hörbaren Ausgabe folgt, insbesondere bei hoher Systemlast, Audio-Gerätewechsel, Suspend/Resume und Netzwerk-/Bridge-Latenz. Dieser Pass behauptet keine reale Hardware-Sync-Genauigkeit in Millisekunden.
