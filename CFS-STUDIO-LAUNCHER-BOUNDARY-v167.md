# CFS Studio / Launcher Product Boundary v167

## Entscheidung

CFS Studio ist der primäre Arbeitsplatz für LIVE-Produktion. Der Launcher ist der lokale Desktop-Begleiter und führt die sicherheitskritischen bzw. hardware-nahen Aufgaben aus. OBS bleibt kompatibel, ist aber nicht der Standardweg.

## CFS Studio

- Scenes, Preview/Program, Widgets, Audio-Zielwerte, Output-Profile und Multistream
- Browser-/Web-Session bleibt die Authentisierungsgrenze
- eigenes Manifest `/cfs-studio.webmanifest` mit `display: standalone`
- installierbar als eigene App-Oberfläche, wenn der Browser die Installation anbietet

## Launcher

- Device-Link / Creator-PC
- lokale Capture-/Encoding-Engine
- Windows SafeStorage für Stream-Credentials
- Provider-Bridges, lokale Telemetrie, Updates, Recovery und Diagnose
- CFS Studio ist im Einfach-Modus direkt erreichbar

## OBS

OBS WebSocket, Browser Sources und Doctor bleiben erhalten, sind aber im Profi-Modus als optionale Kompatibilität eingeordnet.

## Warum kein zweiter Native-Installer?

Ein zweites Electron-Programm bräuchte eine zusätzliche abgesicherte Authentisierung, Update-/Signing-Kette und lokale IPC-Grenze. Das würde die Beta unnötig verbreitern. v167 nutzt deshalb eine getrennte App-Oberfläche bei weiterhin nur einem nativen Launcher.
