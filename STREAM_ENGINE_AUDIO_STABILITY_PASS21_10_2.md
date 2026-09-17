# CFS Stream Engine – Pass 21.10.2

## Audio Mixer, Monitor/Crop & Watchdog

**Stand:** 2026-09-17  
**Status:** Repository-Implementierung PASS. Reale Windows-Hardware-/Audio-/DPI-Abnahme bleibt offen.

## Ziel

Pass 21.10.2 erweitert die lokale Streaming Engine um die Funktionen, die für einen stabilen ersten echten Creator-Test notwendig sind, ohne lokale Media-Daten oder Stream-Secrets in die CFS Cloud zu verschieben.

## Umgesetzt

- zwei voneinander getrennte lokale Audio-Eingänge
- Lautstärke 0–200 % je Audio-Bus
- Mute je Audio-Bus
- Audio-Sync-Delay 0–2000 ms je Bus
- lokaler FFmpeg-Mix mit `aresample`, `volume`, optional `adelay` und `amix`
- Schutz gegen versehentliche Auswahl derselben Audioquelle für beide Busse
- Monitor-Auswahl aus Electron `screen.getAllDisplays()`
- DPI-Konvertierung über Electron `dipToScreenPoint()` mit kontrolliertem Fallback
- Screen-Capture-Region für einen ausgewählten Monitor
- optionaler Capture-Crop mit X/Y/Breite/Höhe
- Dropped- und Duplicated-Frame-Auswertung aus FFmpeg-Statuszeilen
- gedrosselte Live-Statusupdates an den Launcher statt ungebremster Renderer-Events
- Watchdog gegen festhängende FFmpeg-Prozesse
- konfigurierbarer Stall-Timeout
- Watchdog-Recovery läuft weiterhin zielbezogen, damit ein einzelnes Ziel die anderen Ausgaben nicht beendet

## Sicherheits- und Stabilitätsgrenzen

Stream-Key und RTMP/RTMPS-Server bleiben unverändert im lokalen, OS-verschlüsselten Credential Store. Audio-Gerätenamen, Monitor-ID, Crop-Werte, Lautstärke, Mute und Delay sind keine Secrets und werden als lokale Launcher-Einstellungen gespeichert.

Der Watchdog beendet nur einen Prozess, der über den konfigurierten Zeitraum keinen FFmpeg-Fortschritt mehr meldet. Für Streaming-Ziele greift anschließend der bereits vorhandene begrenzte Reconnect-Backoff. Recording wird nicht automatisch in eine Endlosschleife neu gestartet.

## Bewusst noch NICHT als fertig markiert

- natives OBS-artiges Game-Capture-Hooking
- natives Windows-Desktop-Audio ohne vorhandenes Loopback-/Mix-Gerät
- echtes Peak-Metering
- Audio-Monitoring auf ein lokales Wiedergabegerät
- Audio-Gerätewechsel während laufender Session
- verifizierte Multi-DPI-Koordinaten auf echter Windows-Hardware
- realer Watchdog-Stalltest

Fenster-/Borderless-Games laufen weiterhin über den bestehenden Window-Capture-Pfad. Das wird nicht als natives Game Capture bezeichnet.

## Repository-Test

```powershell
npm.cmd run stream-engine21:audio-check
```

Erwarteter Stand dieses Pakets:

```text
Stream Engine Audio & Stability Pass 21.10.2: 70/70 PASS
```

Der kombinierte Check lautet:

```powershell
npm.cmd run stream-engine21:check
```

und führt Pass 21.10.1 + 21.10.2 aus.

## Nächster technischer Block

**Pass 21.10.3 – Native Game Capture Backend + Desktop-Audio**. Dieser Block soll nicht als einfacher FFmpeg-Fenster-Capture verkleidet werden. Vor Umsetzung wird ein Windows-natives Capture-Backend sauber getrennt von der Cloud-Control-Plane und den bestehenden RTMP-Zielprozessen aufgebaut.
