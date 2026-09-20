# Stream Studio – Pass 21.10.21

## Game Capture Runtime Recovery / Fullscreen / Alt-Tab / D3D Device-Loss Foundation

Pass 21.10.21 härtet den in Pass 21.10.20 eingeführten Windows.Graphics.Capture-Pfad für reale Laufzeitwechsel. Streaming-Ziele, Scene Frame Bus, Widgets und Audio bleiben dabei von Game-Capture-Recovery getrennt.

### Runtime-Recovery

- Der native Helper überwacht den tatsächlichen WGC-Framefluss.
- Vor dem ersten Frame gilt ein eigener Start-Timeout; nach erfolgreichem Start gilt ein Frame-Stall-Timeout.
- Ein verlorenes/geschlossenes Capture-Fenster, Frame-Stall, D3D Device Loss und sonstige Capture-Fehler besitzen getrennte Exit-Klassen.
- `ID3D11Device::GetDeviceRemovedReason()` wird während der Session geprüft.
- Der Launcher-Manager klassifiziert Helper-Exits und startet nur die betroffene Game-Capture-Quelle mit begrenztem Backoff neu.
- FFmpeg-Sinks und der Scene Frame Bus bleiben während der Recovery bestehen; der zuletzt gültige Scene-Frame kann dadurch weiter ausgespielt werden.

### Fenster- / Fullscreen-Wechsel

- Die Prozessauflösung liefert zusätzlich `MainWindowHandle` und `Responding`.
- Ändert sich bei gleicher PID das Hauptfenster-Handle, wird die lokale WGC-Quelle gezielt neu gebunden.
- Der Helper wählt nicht mehr das erste passende Fenster, sondern das größte sichtbare, nicht gecloakete Top-Level-Fenster des Zielprozesses.
- Minimierte Fenster werden bei der Auswahl niedriger priorisiert.

### Telemetrie

Zusätzlich zu Bytes / Helper-Restarts / Prozess-Rebinds werden erfasst:

- Window-Rebinds
- Frame-Stalls
- D3D-Device-Loss-Restarts
- Capture-Fehler
- letzter Recovery-Grund
- letzter Helper-Exit-Code
- erstes / letztes empfangenes Frame-Zeitfenster

### Windows-Soak

`npm.cmd run game-capture:soak -- --pid <PID> --seconds 120`

Der Soak verwirft die BGRA-Payload und speichert nur Evidence zu Framezahlen, Bytes, Helper-Exits und Recovery-Gründen. Während des Laufs können Alt-Tab, Minimieren und Fullscreen/Windowed-Wechsel manuell provoziert werden. Rohvideo wird nicht persistiert.

### Bewusst offen

- echter Build des C++/WinRT-Headers gegen Visual C++ / Windows SDK
- reale Fullscreen / Borderless / Alt-Tab-Abnahme mit mehreren Spielen
- reale GPU-Treiber-Reset-/Device-Loss-Abnahme
- Anti-Cheat / geschützte Inhalte pro Spiel
- 1080p60 Game + Camera + Widgets + Multi-Audio + Recording + Multistream Soak

## Repository-Test

`npm.cmd run studio-game-recovery21:check`
