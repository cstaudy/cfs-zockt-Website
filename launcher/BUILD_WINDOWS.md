# Windows Build — cfs_zockt Creator Suite

## Lokal auf Windows

1. Node.js 22 installieren.
2. `launcher` Ordner öffnen.
3. `build-windows.bat` starten.

Oder im Terminal:

```powershell
npm install
npm run qa
npm run dist:win
```

Die fertigen Dateien landen in `launcher/dist/`.

## Installer

V11 erzeugt:

- NSIS Setup (`cfs_zockt-Creator-Suite-0.12.0-x64.exe`)
- Portable Windows Build
- Update-Metadaten für `electron-updater`

## Code Signing

`electron-builder` unterstützt Windows-Code-Signing über die üblichen
Umgebungsvariablen `CSC_LINK` und `CSC_KEY_PASSWORD`. Ohne Signatur kann
Windows SmartScreen bei neuen Downloads warnen.

## Auto Update

Der Launcher ist auf GitHub Releases des Repositories
`cstaudy/CFS-TikTok-Backend` vorbereitet. Für einen Release wird die
GitHub Action `.github/workflows/launcher-release.yml` verwendet.

Auto-Update funktioniert erst, wenn eine installierte Version und ein
passender veröffentlichter GitHub Release vorhanden sind.


## Production-Hardening V12

Der Launcher speichert unge-sendete LIVE-Events jetzt zusätzlich lokal unter
dem Electron `userData`-Verzeichnis. Ein kurzer Backend-Ausfall oder
Launcher-Neustart verliert die wartenden Events dadurch nicht automatisch.

Vor `LIVE STARTEN` läuft ein Preflight über:

- lokale Verschlüsselung
- Backend URL
- Bridge-Key
- Creator-Cloud-Verbindung
- Provider-Konfiguration
- persistente Event-Recovery

Bei einem unerwarteten Neustart kann eine noch aktive Cloud-Session
automatisch fortgesetzt werden.

## Code Signing in GitHub Actions

Optional folgende Repository-Secrets setzen:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

Ohne diese Secrets wird weiterhin ein unsignierter Test-Build erstellt.
Vor einem öffentlichen Production-Release sollte Windows Code Signing
eingerichtet sein.


## V16 Release Manifest

Nach dem Windows-Build:

```powershell
npm run manifest:release
```

erzeugt `dist/release-manifest.json` mit SHA-256 und Dateigrößen aller
Release-Artefakte. GitHub Actions führt diesen Schritt automatisch aus.


## V32 — Optional FFmpeg Bundle

Der Launcher kann FFmpeg weiterhin über `CFS_FFMPEG_PATH` oder den
System-PATH verwenden. Für einen späteren vollständig gebündelten Windows-
Release ist zusätzlich `launcher/vendor/ffmpeg/` vorbereitet.

Vor einem Build mit gebündeltem FFmpeg:

```powershell
$env:CFS_FFMPEG_SOURCE="C:\Pfad\zu\ffmpeg.exe"
$env:CFS_FFMPEG_LICENSE_SOURCE="C:\Pfad\zu\LICENSE.txt"
npm run ffmpeg:stage
npm run ffmpeg:check
npm run dist:win
```

`electron-builder` kopiert den Stage-Ordner nach `resources/ffmpeg/`.
Die Binary wird **nicht automatisch aus dem Internet heruntergeladen**.
Vor einem öffentlichen Release müssen Herkunft und Lizenz des verwendeten
FFmpeg-Builds geprüft und die zugehörigen Lizenz-/NOTICE-Dateien mitgeliefert
werden.

## V32 — Hardware Encoder Vorbereitung

Der Launcher erkennt in FFmpeg vorhandene Encoder:

- NVIDIA `h264_nvenc`
- Intel `h264_qsv`
- AMD `h264_amf`

Ein im FFmpeg-Build gelisteter Encoder bedeutet noch nicht, dass auf dem
konkreten Windows-PC ein kompatibler Treiber/GPU-Pfad funktioniert.
Hardware-Encoding bleibt deshalb bis zum echten Windows-Realtest eine
explizite Creator-Auswahl und kein automatischer Default.
