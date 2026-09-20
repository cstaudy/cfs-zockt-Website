# Pass 21.10.19 – Scene Transition Runtime

## Ziel

Der in Pass 21.10.18 eingeführte stabile Scene Frame Bus soll Program-Scene-Wechsel nicht nur ohne Neustart der RTMP/RTMPS-Ziele durchführen, sondern die bereits im Stream Studio gespeicherte Transition auch im lokalen Launcher auswerten.

## Umsetzung

- `CUT` bleibt ein unmittelbarer Producer-Wechsel auf dem bestehenden Scene Frame Bus.
- Animierte Transitions verwenden den FFmpeg-Filter `xfade`.
- Unterstützte Studio-Typen und lokale Zuordnung:
  - `fade` → `fade`
  - `dissolve` → `dissolve`
  - `slide_left` → `slideleft`
  - `slide_right` → `slideright`
  - `slide_up` → `slideup`
  - `zoom` → `zoomin`
- Die im Studio gespeicherte `duration_ms` wird auf 120–2500 ms begrenzt und an den lokalen Transition-Compositor weitergegeben.
- Der letzte tatsächlich ausgespielte vollständige YUV420P-Frame des Profil-Busses wird als Startbild der Animation verwendet.
- Dieser Startframe wird nur temporär lokal abgelegt, mit restriktiven Dateirechten erzeugt und zusammen mit dem Transition-Producer wieder entfernt.
- Die neue Scene wird wie beim Hot Switch vollständig lokal aufgebaut. Erst wenn der Transition-Compositor einen vollständigen ersten Output-Frame liefert, wird er auf den bestehenden Frame Bus committed.
- Die laufenden Ziel-FFmpeg-Prozesse, RTMP/RTMPS-Verbindungen und Application-Audio-Pipes bleiben dabei bestehen.
- Ein schneller weiterer TAKE kann vom aktuell sichtbaren Bus-Frame aus starten, auch wenn die vorige Transition noch nicht lange zurückliegt.

## Fail-safe Verhalten

- Fehlt `xfade` im lokalen FFmpeg, wird eine angeforderte Animation als `CUT` ausgeführt.
- Dieser Fallback wird in der Runtime-Telemetrie gezählt und im Launcher sichtbar gemacht.
- Scheitert ein animierter Transition-Compositor vor seinem ersten vollständigen Frame, wird kein halbfertiger Wechsel committed; die bisherige Program-Scene bleibt aktiv.
- Streamkeys oder Provider-Credentials werden weder in den Transition-Compositor noch in die temporäre Snapshot-Datei übernommen.

## Runtime / Telemetrie

Der Launcher zeigt zusätzlich:

- den zuletzt effektiv verwendeten Transition-Typ,
- die angewendete Dauer,
- einen sichtbaren `FALLBACK`-Hinweis,
- Anzahl animierter Scene-Transitions,
- Anzahl Transition-Fallbacks,
- lokale `xfade`-Verfügbarkeit.

Die Cloud-/Bridge-Synchronisation reicht die bereits vorhandene `config.transition` zusammen mit der neuen Program-Scene an `StreamEngine.updateScene()` weiter. Es wird kein zweites Transition-Datenmodell eingeführt.

## Technische Grenze

Der alte Anteil einer animierten Transition ist der letzte live ausgespielte Bus-Frame und damit für die kurze Übergangsdauer ein eingefrorenes Startbild. Die neue Scene bleibt während der Animation live. Diese Architektur vermeidet einen zweiten dauerhaft parallel laufenden alten Scene-Compositor und hält die Ziel-FFmpeg-Prozesse stabil.

Ein späterer Performance-/Polish-Pass kann echtes Dual-Live-Compositing beider Scenes für die gesamte Transition-Dauer ergänzen, falls das auf realer Windows-Hardware einen sichtbaren Vorteil bringt.

## Automatisierte Abnahme

- Transition-Normalisierung und Dauer-Clamping.
- CUT ohne Animationsdauer.
- `xfade`-Mappings für Fade / Dissolve / Slide / Zoom.
- lokaler Snapshot mit korrekter YUV420P-Framegröße.
- sicherer CUT-Fallback ohne `xfade`.
- animierter End-to-End-Hot-Switch hält denselben Ziel-FFmpeg-Child-Prozess am Leben.
- alter Scene-Compositor wird erst nach erfolgreichem Commit beendet.
- Transition-Snapshot wird beim Beenden des Producers entfernt.
- Transition-Metriken und Launcher-Anzeige werden aktualisiert.
- Cloud-Runtime-Sync reicht die Stream-Studio-Transition weiter.

Repository-Test:

```text
npm.cmd run studio-scene-transition21:check
```

Gesamt:

```text
npm.cmd run stream-studio21:check
```

## Noch offen

- 🟡 echter Windows-Test mit realem Screen/Game/Camera + Widget-Offscreen-Compositor.
- 🟡 echter Windows Fade/Dissolve während YouTube + Twitch + TikTok gleichzeitig laufen.
- 🟡 sichtbare A/V-Sync- und Freeze-Messung bei 1080p60 auf echter Hardware.
- 🟡 Performance-Profiling des Transition-Compositors auf schwächeren GPUs/CPUs.
- 🟡 optionales echtes Dual-Live-Crossfade statt eingefrorenem letzten Alt-Frame.
- 🟡 Native Game-Capture-Hooks bleiben separat offen.
