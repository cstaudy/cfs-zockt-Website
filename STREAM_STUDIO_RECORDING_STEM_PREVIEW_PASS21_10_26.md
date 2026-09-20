# CFS Stream Studio – Pass 21.10.26

## Recording Stem Preview / Waveforms / Track Audition

**Stand:** 2026-09-18  
**Status:** Repository-Implementierung und Linux-/FFmpeg-Syntheseprüfung abgeschlossen. Echte Windows-Aufnahme mit Hardware-/WASAPI-Spuren bleibt als Real-Abnahme offen.

## Ziel

Pass 21.10.26 baut auf dem Recording → Cut Studio Handoff aus Pass 21.10.25 auf. Eingebettete Recording-Spuren können vor dem Export technisch analysiert und lokal vorgespielt werden. Gleichzeitig erhält Cut Studio eine reduzierte Waveform-Hüllkurve, damit Mic, Game, Discord, Music, Alerts und Stream Mix visuell unterscheidbar sind.

## Implementiert

- Recording-Handoff-Store auf Schema 2 / Pass 21.10.26 erweitert.
- Jede eingebettete Spur besitzt lokalen Analysis-Status und lokalen Preview-Status.
- FFmpeg kann einen einzelnen eingebetteten Stream `0:a:<index>` analysieren.
- Pro Stem werden Peak/Mean, eine lokale detaillierte PNG-Waveform und eine normalisierte 64-Bin-Hüllkurve erzeugt.
- Einzelspur-Audition erzeugt eine kurze lokale PCM-WAV und berücksichtigt den aktuell im Cut-Projekt gespeicherten Gain-/Pan-Wert.
- Current-Mix-Audition nutzt die im Cut-Projekt gespeicherten Aktiv/Mute/Solo/Gain/Pan-Einstellungen und dieselbe `sourceTrackAudioGraph`-Logik wie der spätere Export.
- Preview-Dauer ist auf maximal 30 Sekunden begrenzt; Standard sind 12 Sekunden.
- Launcher zeigt pro Handoff Stem-Waveform, Peak/Mean und lokale Audio-Controls.
- Launcher bietet `WAVEFORMS`, `SPUR HÖREN` und `MIX HÖREN`.
- Creator Bridge kann ein bestehendes Cut-Projekt aktualisieren, damit neue Waveform-Metadaten in Cut Studio sichtbar werden.
- Cut Studio rendert die 64-Bin-Waveform direkt am eingebetteten Recording-Track.
- Cut Studio bewahrt Waveform/Peak/Mean beim Speichern des Projekts.

## Datenschutz- und Sicherheitsgrenze

Die echte Recording-Datei bleibt ausschließlich lokal im Launcher. Ebenfalls lokal bleiben die detaillierte PNG-Waveform, die Preview-WAV und alle absoluten Dateipfade. An Website/API gehen ausschließlich:

- Track-Key und Label,
- eingebetteter Audio-Stream-Index,
- Aktiv/Gain/Mute/Solo/Pan,
- bis zu 64 normalisierte Waveform-Werte zwischen 0 und 1,
- Peak/Mean in dB,
- Analyse-Zeitstempel.

Es werden weder PCM-/BGRA-Rohdaten noch Preview-Audio, Recording-Dateien, Streamkeys, RTMP-/RTMPS-Adressen oder Tokens synchronisiert.

## Verhalten bei Solo/Mute

`SPUR HÖREN` dient der isolierten Kontrolle einer einzelnen Spur. Dabei werden Gain und Pan des aktuell gespeicherten Cut-Projekts berücksichtigt. `MIX HÖREN` bildet dagegen den aktuellen gespeicherten Stem-Mix inklusive Aktiv/Mute/Solo/Gain/Pan nach. Damit kann die spätere Exportmischung kontrolliert werden, bevor ein Export-Job gestartet wird.

## FFmpeg-Syntheseprüfung

Eine synthetische MKV mit Video und drei eingebetteten Audio-Streams wurde lokal erzeugt. Danach wurden erfolgreich geprüft:

- Analyse von `0:a:1`,
- Erzeugung einer 64-Bin-Waveform,
- lokale Einzelspur-Preview mit Gain/Pan,
- lokale Mix-Preview mit Solo-Logik,
- erzeugte Preview-WAV-Dateien vorhanden.

## Noch offen

- echte Windows-6-Track-Aufnahme mit Mic/Game/Discord/Music/Alerts analysieren,
- Preview-Latenz bei sehr langen realen Aufnahmen messen,
- mehrere echte MKV-/MP4-Encoderkombinationen abnehmen,
- optional Startposition der 12-Sekunden-Audition aus der Cut-Timeline wählbar machen,
- optional Cache-Retention/automatische Bereinigung alter Preview-Dateien als eigener Cleanup-Pass.

## Repository-Test

```powershell
npm.cmd run studio-recording-preview21:check
npm.cmd run stream-studio21:check
```
