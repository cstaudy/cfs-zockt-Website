# CFS Admin Desktop

Windows-Electron-App für den geschützten Admin-Bereich von `https://cfs-zockt.de`.

## Sicherheit

- Keine Render-Secrets, Bridge-Tokens oder Admin-Passwörter sind in der EXE eingebaut.
- Login und Admin-Berechtigung werden weiterhin serverseitig von cfs-zockt.de geprüft.
- Die Electron-Session wird in einem eigenen persistenten App-Profil gespeichert.
- Node Integration ist deaktiviert, Context Isolation und Sandbox sind aktiv.
- Externe Links werden im normalen Browser geöffnet.

## Lokale CFS AI

Die App prüft lokal:

- `http://127.0.0.1:8000/api/status`
- `http://127.0.0.1:11434/api/tags`

Der Button **CFS AI STARTEN** sucht `start_bridge_mode_windows.bat` in typischen lokalen Ordnern. Alternativ kann vor dem App-Start `CFS_AI_LOCAL_SERVICE_ROOT` auf den lokalen Service-Ordner gesetzt werden.

## Windows Build

Im Repository-Root `BUILD-CFS-ADMIN-WINDOWS.cmd` starten. Der Installer landet anschließend unter `admin-desktop\\dist`.
