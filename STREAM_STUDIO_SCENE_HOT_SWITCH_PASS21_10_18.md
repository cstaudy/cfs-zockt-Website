# Pass 21.10.18 – Scene Hot Switch / Compositor Runtime Update

## Ziel

Program-Scene-Wechsel sollen die laufenden RTMP/RTMPS-Zielprozesse nicht mehr vollständig neu starten. Der lokale Scene-Compositor darf für eine neue Scene neu aufgebaut werden, aber YouTube/Twitch/TikTok/Kick/Facebook/Custom-RTMP-Ausgänge sollen an einer stabilen Videoquelle hängen bleiben.

## Umsetzung

- Neuer `SceneFrameBusManager` im Launcher.
- Pro Ausgabeprofil und Modus existiert ein stabiler Frame Bus, z. B. `live:1080p60` oder `recording:1080p60`.
- Die Ziel-FFmpeg-Prozesse lesen YUV420P-Rohframes über eine dauerhaft geöffnete lokale Pipe.
- Der eigentliche Scene-Compositor läuft als separater FFmpeg-Prozess und liefert Frames an diesen Bus.
- Der Bus hält immer den letzten vollständigen Frame und taktet ihn weiter an alle Subscriber. Dadurch bleibt die Ziel-Pipe während eines Compositor-Wechsels offen.
- Backpressure eines einzelnen Zielprozesses wird isoliert; ein blockierter Subscriber stoppt nicht die übrigen Subscriber.
- Scene-Compositoren werden zweiphasig gewechselt:
  1. neue Scene/Widgets vorbereiten,
  2. auf den ersten vollständigen Frame warten,
  3. erst dann den neuen Producer committen und den alten Compositor beenden.
- Wenn die Vorbereitung fehlschlägt, bleibt der bisherige Producer aktiv.
- Widget-Offscreen-Quellen können mit `ensure()` vorgewärmt werden, ohne die noch laufende alte Scene sofort zu zerstören.
- Nach erfolgreichem Commit werden nicht mehr benötigte Widget-Renderer bereinigt.
- Ein unerwartet beendeter Scene-Compositor besitzt einen lokalen Recovery-Pfad; der Frame Bus hält währenddessen den letzten Frame.

## Laufende Session

Die Launcher-Streamziele erhalten in Frame-Bus-Sessions keine direkte `gdigrab`-/Scene-Compositor-Pipeline mehr. Stattdessen lesen sie den Scene Frame Bus und behalten ihre eigene Encoding-/RTMP-Verbindung sowie ihre Audioquellen.

Damit gilt für unterstützte lokal komponierbare Scenes:

- Ziel-FFmpeg-Prozesse bleiben beim Scene-Hot-Switch bestehen.
- Application-Audio-Pipes bleiben bestehen.
- Streamkeys werden nicht erneut benötigt oder an den Compositor weitergereicht.
- Reconnect-Zähler der Ziele werden durch einen erfolgreichen Scene-Wechsel nicht absichtlich erhöht.
- Ein gestopptes Einzelziel kann später wieder an den bereits aktualisierten Bus gehängt werden.

## Studio-Synchronisation

Während die lokale Streaming Engine läuft, synchronisiert der Launcher die Stream-Studio-Konfiguration periodisch. Ändert sich die veröffentlichte Program-Scene, ruft der Launcher `StreamEngine.updateScene()` auf. Ein manueller `STUDIO SYNC` nutzt denselben Pfad.

Der Launcher zeigt:

- aktuelle Program-Scene,
- Anzahl erfolgreicher Scene Hot Switches,
- Anzahl fehlgeschlagener Scene Switches,
- Frame-Bus-Zustand und letzte Umschaltdauer,
- einen sichtbaren Fehler, wenn eine Scene nicht hot-switch-fähig ist.

## Fail-safe Grenzen

Ein Hot Switch wird nicht vorgetäuscht, wenn die neue Scene für ein laufendes Profil nicht vollständig lokal komponierbar ist. Eine Session, die für einen benötigten Ausgang ohne Scene Frame Bus gestartet wurde, meldet stattdessen, dass für diesen Wechsel ein kontrollierter Session-Neustart erforderlich ist.

Die Foundation ändert nicht rückwirkend den Legacy-Pfad für nicht lokal komponierbare Scenes.

## Performance

Der neue Bus verwendet aktuell unkomprimierte YUV420P-Rohframes. Das ist bewusst einfach und robust, aber bei mehreren 1080p60-Ausgängen speicher-/bandbreitenintensiv. Hardware- und Zero-Copy-Optimierungen bleiben ein eigener späterer Performance-Pass.

## Automatisierte Abnahme

- Framegröße / Black-Frame-Basis geprüft.
- Producer wird erst nach vollständigem Frame bereit.
- neuer Producer ersetzt den alten erst nach explizitem Commit.
- bestehender Subscriber bleibt über den Producer-Wechsel angehängt.
- Ziel-Build liest `pipe:3` statt direktem `gdigrab`, wenn Scene Bus aktiv ist.
- simuliertes End-to-End-Hot-Switching hält denselben Ziel-FFmpeg-Child-Prozess am Leben.
- alter Scene-Compositor wird nach erfolgreichem Commit beendet.
- Hot-Switch-Telemetrie wird aktualisiert.
- alte Pässe 21.10.13 bis 21.10.17 bleiben regressionsgrün.

Repository-Test:

```text
npm.cmd run studio-scene-hot-switch21:check
```

Gesamt:

```text
npm.cmd run stream-studio21:check
```

## Noch offen

- 🟡 echter Windows-Test mit realem `gdigrab`/dshow/Widget-Offscreen-Compositor.
- 🟡 echter Windows Scene-Wechsel während YouTube + Twitch + TikTok gleichzeitig laufen.
- 🟡 Bewertung von sichtbarer Freeze-Dauer beim Prewarming auf schwächerer Hardware.
- 🟡 Performance-Profiling des YUV420P-Frame-Bus bei 1080p60 / mehreren Profilen.
- 🟡 Übergangsanimationen zwischen zwei vollständig gerenderten Program-Scenes auf dem neuen Runtime-Bus.
- 🟡 Native Game-Capture-Hooks bleiben weiterhin separat offen.
