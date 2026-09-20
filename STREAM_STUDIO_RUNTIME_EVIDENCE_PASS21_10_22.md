# Stream Studio – Pass 21.10.22 – Runtime Evidence & Soak Layer

## Ziel

Pass 21.10.22 verbindet die bisher getrennt getesteten Runtime-Bausteine zu einer lokalen technischen Evidence-Schicht für echte Windows-Soak-Tests. Die Evidence soll einen späteren 10–15-Minuten-Multistream mit Game Capture, Camera, Widgets, getrennten Audioquellen, Recording, Scene-Wechseln und mehreren Streaming-Zielen nachvollziehbar machen, ohne Rohmedien oder Zugangsdaten zu speichern.

## Runtime Evidence

Beim erfolgreichen Start der lokalen Streaming Engine beginnt automatisch eine Evidence-Session. Standardmäßig wird alle zwei Sekunden ein technischer Snapshot aufgenommen; zusätzliche Engine-State-Änderungen werden ebenfalls erfasst. Die Session wird beim normalen Stream-Stop, beim Device-Logout oder beim Graceful Shutdown finalisiert.

Erfasst werden unter anderem Zielstatus, FPS, Bitrate, Encoder-Speed, Dropped/Duplicated Frames, Reconnects, Watchdog-Restarts, Scene Hot Switches, Transition-Fallbacks, Recording-Metriken sowie Recovery-Zähler des Game-Capture- und Application-Audio-Managers.

## Datenschutz / lokale Grenze

Die Evidence bleibt lokal im Launcher-UserData-Verzeichnis. Sie enthält keine Streamkeys, Tokens oder RTMP-Zugangsdaten. Audio-, Video-, BGRA- oder PCM-Payloads werden nicht persistiert. Die Dateien kennzeichnen dies explizit mit `rawMediaPersisted: false` und `secretsPersisted: false`.

## Abschluss und Integrität

Beim Finalisieren wird eine formatierte JSON-Datei atomar geschrieben. Daneben wird eine SHA-256-Datei erzeugt. Die Summary enthält unter anderem Dauer, Anzahl der beobachteten Ziele, Recording-Beobachtung, Peak-Upload, minimale Encoder-Speed, durchschnittliche FPS, Dropped Frames, Reconnects, Scene-Switches und Recovery-Zähler.

Automatische Hinweise markieren auffällige Messwerte, sind aber bewusst **keine reale Plattform-Abnahme**. Ein realer Windows-Test muss weiterhin durch den Nutzer durchgeführt und bewertet werden.

## Launcher UI

Im Streaming-Bereich zeigt der Launcher:

- ob gerade eine Evidence-Session läuft,
- wie viele Samples vorhanden sind,
- die laufende beziehungsweise letzte Dauer,
- Warnungsanzahl der letzten abgeschlossenen Session,
- eine kompakte Summary,
- einen Button zum Öffnen des lokalen Evidence-Ordners.

## Summary Tool

Eine abgeschlossene Evidence-Datei kann lokal zusammengefasst werden:

```powershell
npm.cmd run stream-evidence:summary -- --file "PFAD_ZUR_EVIDENCE.json"
```

Das Tool zeigt die wichtigsten Runtime-Metriken und Hinweise, ohne die Evidence automatisch als bestandene reale Abnahme zu deklarieren.

## Reale Abnahme bleibt offen

Noch nicht als real bestanden markieren:

- 10–15 Minuten Windows-Soak,
- Game + Camera + Widgets,
- Mic + Game + Discord und optional Music/Alerts,
- Recording mit getrennten Tracks,
- YouTube + Twitch + TikTok gleichzeitig,
- Scene-Wechsel plus animierte Transition,
- einzelnes Ziel stoppen/reconnecten,
- Alt-Tab / Window-Rebind,
- Application-Audio-PID-Rebind,
- Evidence danach manuell auswerten.
