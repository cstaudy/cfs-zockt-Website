# Pass 21.10.27 – Timeline Audition & Playback Head

## Ziel

Pass 21.10.27 verbindet den Recording-Multitrack-Handoff aus 21.10.25 und die Stem-Waveforms/-Previews aus 21.10.26 mit der Cut-Timeline. Recording-Stems können jetzt nicht nur ab Sekunde 0, sondern ab einer gewählten Timeline-Position lokal vorgehört werden.

Die Funktion ist bewusst als Audition und nicht als permanenter Browser-Media-Transport gebaut: Die Website steuert Position und Mix-Metadaten. Der Launcher besitzt die lokale Recording-Datei, rendert einen kurzen Preview-Ausschnitt und spielt die resultierende Preview-WAV lokal ab.

## Playback Head und Scrubbing

Cut Studio besitzt einen Playback Head für Recording-Handoff-Projekte. Während der Slider bewegt wird, ändert sich nur die Browser-Oberfläche. Erst beim Loslassen wird eine vier Sekunden lange Mix-Vorschau angefordert. Dadurch erzeugt Scrubbing keine fortlaufende Request-Flut.

Normale Mix- und Track-Auditions verwenden zwölf Sekunden. Die Media Engine begrenzt jede Preview weiterhin hart auf maximal 30 Sekunden und den Startpunkt auf maximal 24 Stunden.

Der FFmpeg-Seek wird vor der Eingabe gesetzt (`-ss` vor `-i`), damit auch lange Aufnahmen schnell angesprungen werden können.

## A/B-Marker

Cut Studio speichert drei harmlose Zeitwerte im Projekt:

- `audition_playhead_ms`
- `audition_a_ms`
- `audition_b_ms`

A und B können auf die aktuelle Position gesetzt und anschließend separat vorgehört werden. Die Marker enthalten keine Medien-, Credential- oder lokalen Pfaddaten.

## Recording-Stems

Jede Recording-Spur besitzt zusätzlich `SPUR AB PLAYHEAD`. Die Vorschau nutzt den lokal verifizierten eingebetteten Stream-Index aus dem Recording-Handoff, aber Gain und Pan aus dem aktuell gespeicherten Cut-Projekt.

Die Mix-Vorschau nutzt Aktiv, Mute, Solo, Gain und Pan des Cut-Projekts. Die authentischen Audio-Stream-Indizes werden vor dem Rendern erneut aus dem lokalen Recording-Handoff eingesetzt. Damit kann die Website keine beliebigen lokalen Stream-Indizes oder Dateien erzwingen.

## Bridge-Job `cut_audition`

Timeline-Auditions verwenden einen eigenen kurzlebigen Bridge-Job mit `kind: cut_audition` und Schema 8. Der Auftrag enthält nur:

- Projekt-/Handoff-Metadaten aus dem bereits gespeicherten Cut-Projekt,
- Modus `mix` oder `track`,
- Startzeit,
- Preview-Dauer,
- optional den Track-Key.

Normale Creator-Exportlisten und Export-Slot-Limits schließen Audition-Jobs aus. Die Bridge-Liste für den Launcher enthält sie dagegen, damit der lokale Renderer sie abarbeiten kann.

Ein neuer noch nicht gestarteter Audition-Auftrag desselben Projekts ersetzt einen älteren queued Auftrag. Bereits laufende Auditions sind auf zwei gleichzeitig begrenzt. Alte abgeschlossene Audition-Jobs werden nach einer Stunde bereinigt.

## Fehlerverhalten

Der Launcher reserviert einen queued Audition-Job zuerst. Danach verifiziert er den lokalen Recording-Handoff und FFmpeg. Fehlt die lokale Datei oder FFmpeg, wird der reservierte Auftrag als `failed` abgeschlossen. Dadurch bleibt kein queued Auftrag zurück, der alle 1,5 Sekunden erneut versucht würde.

## Sicherheitsgrenze

Die absolute Recording-Datei bleibt ausschließlich im Launcher. Ebenso bleibt die erzeugte Preview-WAV lokal.

Die Website/API erhält **keinen lokalen Dateipfad** und **keine Preview-WAV**. Beim erfolgreichen Bridge-Abschluss werden nur technische Metadaten wie Dauer, Bytezahl, Codec und der Status `cut_audition_ready` gemeldet. Erst über das lokale Electron-IPC-Ereignis `launcher:cut-audition` erhält die Launcher-Oberfläche den lokalen Preview-Pfad und spielt ihn dort ab.

Es werden keine Streamkeys, Tokens, RTMP-Adressen, PCM-/BGRA-Rohdaten oder Recording-Medien hochgeladen.

## Scope

Der Playback Head ist in diesem Pass auf Recording-Handoff-Projekte ausgerichtet. Diese Projekte starten mit dem von Pass 21.10.25 erzeugten Clip über die vollständige Aufnahme. Ein späterer Ausbau kann den Playhead auf zusammengesetzte Multi-Clip-Reels mit eigener Timeline-Zeitabbildung erweitern.

## Tests

Repository-Test:

```powershell
npm.cmd run studio-timeline-audition21:check
```

Gesamter Stream-Studio-Strang:

```powershell
npm.cmd run stream-studio21:check
```

Die reale Windows-Abnahme mit einer echten 6-Track-Aufnahme bleibt separat offen.
