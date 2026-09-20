# Pass 21.10.25 – Recording → Cut Studio Multitrack Handoff

## Ziel

Pass 21.10.25 verbindet die lokale Stream-Aufnahme des Launchers direkt mit Cut Studio. Nach Abschluss einer Aufnahme kann aus derselben lokalen MKV/MP4-Datei automatisch ein Cut-Projekt entstehen. Die eingebetteten Aufnahme-Audiospuren werden als editierbare Source-Tracks weitergereicht, ohne Rohmedia in die CFS-Cloud hochzuladen.

## Lokale Sicherheitsgrenze

Die echte Recording-Datei und ihr absoluter Dateipfad bleiben ausschließlich im Launcher (`RecordingHandoffStore` + `MediaSourceStore`). An Website/Bridge werden nur Projektmetadaten, Dateiname, Handoff-ID sowie die Audio-Track-Beschreibung übertragen. Streamkeys, RTMP-/RTMPS-Server, Tokens und andere Credentials sind kein Bestandteil eines Recording-Handoffs.

## Automatischer Ablauf

1. Die Stream Engine beendet die Recording-FFmpeg-Instanz und emittiert `recording-finalized` erst nach dem tatsächlichen Prozessende.
2. Der Launcher prüft die lokale Datei und ermittelt mit FFmpeg die Mediendauer.
3. `RecordingHandoffStore` legt einen lokalen Handoff mit Scene-, Encoder-, Profil- und Track-Metadaten an.
4. Bei verbundener Creator Bridge und Cut-Studio-Zugriff wird automatisch ein Cut-Projekt erstellt.
5. Der Launcher ordnet dem Projekt die lokale Recording-Datei zu.
6. Falls noch kein Clip existiert, wird `Gesamte Aufnahme` von 0 bis zur gemessenen Dauer angelegt.
7. Der Handoff wird als `ready` markiert und kann direkt in Cut Studio geöffnet werden.

Fehlt die Bridge oder schlägt die Verknüpfung fehl, bleibt der lokale Handoff erhalten und kann im Launcher erneut synchronisiert werden.

## Multitrack-Modell

Bis zu acht eingebettete Audio-Streams können als Source-Tracks beschrieben werden. Für Stream-Studio-Aufnahmen sind vorgesehen:

- Stream Mix
- Mic
- Game
- Discord
- Music
- Alerts

Jeder Track besitzt `stream_index`, `enabled`, `gain_db`, `mute`, `solo` und `pan`. Bei einer Aufnahme mit mehreren echten Stems ist der bereits vorgemischte `Stream Mix` standardmäßig deaktiviert; die Einzelspuren sind aktiviert. Dadurch wird das Signal nicht doppelt summiert.

Cut Studio speichert nur diese Track-Metadaten. Die lokale Cut Media Engine mappt sie beim Export direkt auf die eingebetteten FFmpeg-Streams (`0:a:<stream_index>`), normalisiert sie auf 48 kHz Stereo und mischt die aktiven Spuren mit `amix`. Solo filtert vor dem Mix; Gain und Pan werden pro Stem angewendet. Die bereits vorhandenen Clip-Audiofilter und der Source-Master greifen anschließend weiter.

## Schutz vor falscher Quelldatei

Die Track-Indizes gelten nur für die Recording-Datei, aus der der Handoff erzeugt wurde. Wird im Launcher später manuell eine andere Videodatei für dasselbe Cut-Projekt gewählt, entfernt der Runtime-Export die Recording-`source_tracks` aus dem effektiven Job. Dadurch versucht FFmpeg nicht, z. B. `0:a:5` aus einer fremden Datei mit nur einer Tonspur zu lesen.

## Launcher UX

Im Bereich Creator Tools zeigt der Launcher eine eigene Liste `STREAM RECORDING → CUT STUDIO` mit Dateiname, Dauer, Track-Zusammenfassung und Handoff-Status. Je nach Zustand stehen `ZU CUT STUDIO`, `CUT ÖFFNEN` oder erneute Synchronisierung zur Verfügung.

## Cut Studio UX

Projekte aus einem Recording-Handoff zeigen im Audio-Bereich einen separaten Mehrspurblock. Aktiv, Gain, Mute, Solo und Pan der eingebetteten Recording-Tracks können dort verändert und mit dem Projekt gespeichert werden. Der normale `Originalton`-Regler bleibt als Master-Stufe über dem Ergebnis erhalten.

## Tests / Acceptance

Automatisiert geprüft werden Store-Persistenz, Secret-Ausschluss, Track-Sanitizing, Cut-Job-Manifest, FFmpeg-Graph-Erzeugung, Solo/Mix-Verhalten, Bridge-Routen, Launcher-Handoff, UI-Bindings sowie der Schutz bei einer manuell ersetzten Quelldatei.

Repository-Test:

```powershell
npm.cmd run studio-recording-cut21:check
```

Noch offen bleibt die reale Windows-Abnahme mit einer tatsächlich aufgenommenen 6-Track-MKV/MP4 und hörbarer Kontrolle aller Stem-Kombinationen. Dieser Pass behauptet deshalb keine bereits erfolgte reale Audio-Abnahme.
