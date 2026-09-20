# Stream Studio – Pass 21.10.20 Native Windows Game Capture Hooks

## Ziel

Der bisherige Game-Capture-Foundation-Pfad wurde vom reinen Window/GDI-Binding gelöst. Der Launcher besitzt jetzt einen eigenen lokalen Windows-Capture-Helper auf Basis von **Windows.Graphics.Capture (WGC) + D3D11**. Der vorhandene Scene Graph, Dual Canvas, Routing, Filter, Recording, Hot Switch und Scene Transition verwenden weiterhin dieselbe Source-Struktur.

## Native Capture Engine

- `cfs-game-capture.exe` ist ein kleiner lokaler C++/WinRT-Helper.
- Auswahl erfolgt im Launcher über einen laufenden Spiel-Prozess.
- Der Helper sucht das sichtbare Top-Level-Hauptfenster der PID und erzeugt daraus über `IGraphicsCaptureItemInterop::CreateForWindow` ein `GraphicsCaptureItem`.
- Frames kommen über `Direct3D11CaptureFramePool::CreateFreeThreaded` und D3D11.
- Ausgabe an den bestehenden FFmpeg-Scene-Graph erfolgt lokal als konstante **BGRA Rawvideo Pipe**.
- Vor dem ersten echten WGC-Frame wird kein künstlicher schwarzer „Ready“-Frame ausgegeben; damit kann der Hot-Switch-Prewarm nicht fälschlich auf einen noch nicht gestarteten Game-Capture-Stream committen.
- Cursor-Capture kann entsprechend der vorhandenen Launcher-Einstellung ein-/ausgeschaltet werden.

## Runtime-Verifikation und Fallback

Der Helper besitzt das Protokoll:

```text
CFS_GAME_CAPTURE_WGC_V1
```

`--probe` prüft die lokale WGC-Unterstützung. Der Launcher unterscheidet Helper-Datei und runtime-verifizierten Helper. Windows 10 Version 1903 / Build 18362 ist die Mindestbasis für das verwendete Win32-HWND-Interop.

Wenn WGC nicht bereit ist, kann ein gespeicherter Fenstertitel weiterhin den bisherigen FFmpeg/GDI-Fallback verwenden. Der Preflight zeigt den Unterschied sichtbar an; Native Game Capture wird nicht stillschweigend als bereit behauptet.

## Scene Graph und Multi-Output

- Game-Sources werden wie Screen / Window / Camera im bestehenden nativen Scene Graph geroutet.
- LIVE / RECORDING sowie 16:9 / 9:16 bleiben erhalten.
- WGC-Game-Frames können mit Widgets und anderen nativen Sources im Hybrid-Compositor kombiniert werden.
- Auch eine Widget-only Scene über einer primären Game-Capture-Quelle verwendet den WGC-Basispfad.
- Mehrere Output-Profile dürfen parallel eigene Game-Pipe-Spezifikationen halten; der Source-Manager entfernt beim Aufbau eines zweiten Profils nicht mehr die Quelle des ersten Profils.
- Derselbe Helper-Stream kann mehrere lokale FFmpeg-Sinks bedienen, wenn deren Spezifikation identisch ist.

## Recovery / Telemetrie

Der lokale Game-Capture-Manager:

- bindet den gespeicherten Prozessnamen nach PID-Wechsel erneut,
- startet den Helper bei Crash mit begrenztem Backoff neu,
- hält Game-Capture-Fehler getrennt von den RTMP/RTMPS-Zielprozessen,
- veröffentlicht Helper-Restarts, Prozess-Rebinds, Bytezahlen und Source-Zustände im Launcher-State,
- wird beim Stoppen der Stream Engine vollständig freigegeben.

## Packaging / Acceptance

Build:

```text
npm.cmd run game-capture:build
```

Runtime-/Windows-Doctor:

```text
npm.cmd run game-capture:doctor
```

Optionaler echter Frame-Smoke gegen eine laufende Spiel-PID:

```text
npm.cmd run game-capture:doctor -- --pid 1234 --seconds 5 --width 640 --height 360 --fps 30
```

Die Acceptance-Evidence zählt nur vollständige BGRA-Frames/Bytes und speichert **keine Rohvideodaten**.

Repository-Test:

```text
npm.cmd run studio-game-capture21:check
```

Gesamt:

```text
npm.cmd run stream-studio21:check
```

## Noch offen

- echter Build des C++/WinRT-Helpers auf dem Windows-Zielsystem mit installiertem Visual C++ Toolset/Windows SDK,
- reale Capture-Abnahme mit mindestens einem DirectX-Spiel,
- Fullscreen-/Borderless-/Alt-Tab-Verhalten auf realer Hardware,
- Anti-Cheat-/geschützte Inhalte können WGC einschränken und müssen pro Spiel real geprüft werden,
- 1080p60 Performance-/GPU-/CPU-Messung zusammen mit Kamera, Widgets, Recording und drei Multistream-Zielen,
- Game-Prozess-Neustart während einer realen Live-Session,
- spätere optionale spezialisierte Capture-Hooks für Spiele, bei denen WGC nicht geeignet ist.
