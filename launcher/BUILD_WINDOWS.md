# Windows Build — cfs_zockt Creator Suite Launcher

Aktuelles Build-Ziel: **Launcher 0.47.30 · Windows x64**.

## Empfohlener öffentlicher Releaseweg

Für öffentliche Downloads ist `.github/workflows/launcher-release.yml` der maßgebliche Buildweg. Der Workflow läuft auf `windows-latest`, baut die nativen Windows-Helfer, führt QA und Release-Gate aus und erzeugt:

- `cfs_zockt-Creator-Suite-Setup-0.47.30-x64.exe`
- `cfs_zockt-Creator-Suite-Portable-0.47.30-x64.exe`
- `SHA256SUMS.txt`
- `release-manifest.json`
- Update-Metadaten / Blockmaps
- Windows Build Evidence

Ein manueller GitHub-Actions-Lauf kann interne Build-Artefakte erzeugen. Ein **öffentlicher Tag-Release** wird nur veröffentlicht, wenn die erzeugten EXE-Dateien eine gültige Authenticode-Signatur besitzen.

## Lokal auf echtem Windows

Voraussetzungen:

1. Windows x64
2. Node.js 22
3. Windows C++ Build Tools / MSVC für Audio-Loopback und Game-Capture
4. Für einen signierten Release: Code-Signing-Zertifikat

Vom Projektstamm aus:

```bat
BUILD-LAUNCHER-WINDOWS.cmd
```

Oder direkt im `launcher`-Ordner:

```bat
build-windows.bat
```

Der Buildstarter verwendet `npm ci` für den reproduzierbaren Lockfile-Stand, führt Launcher-QA aus und baut anschließend Setup + Portable. Die Dateien landen in `launcher/dist/`.

## Code Signing

Für electron-builder/GitHub Actions:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

Der Tag-Workflow prüft die erzeugten EXE-Dateien mit `Get-AuthenticodeSignature`. Für einen öffentlichen GitHub Release muss der Status **Valid** sein. Ein unsignierter manueller Build darf weiterhin nur als internes Actions-Artefakt dienen.

## Öffentlicher Website-Download

Die Website-Seite `/pages/launcher-download.html` lädt keine Datei aus einem versteckten Webordner. Sie fragt `/api/public/launcher/releases` ab und verlinkt nur tatsächlich veröffentlichte GitHub-Release-Artefakte.

Damit gilt:

- kein Release → Download bleibt deaktiviert
- veröffentlichter signierter Stable-Release → Setup/Portable erscheinen automatisch
- SHA-256 und Manifest werden separat angeboten, wenn sie im Release vorhanden sind

## FFmpeg

Der Launcher kann FFmpeg über `CFS_FFMPEG_PATH`, den System-PATH oder einen vorbereiteten Bundle-Ordner verwenden. Eine FFmpeg-Binary wird **nicht automatisch aus dem Internet geladen**. Vor einem öffentlichen Bundle müssen Herkunft, Lizenz und NOTICE-Dateien geprüft werden.

## Vor dem ersten öffentlichen EXE-Release real prüfen

- Installer auf echtem Windows
- Authenticode Signatur
- SmartScreen-Verhalten
- Startmenü/Desktop Shortcut
- erster Start
- Device-Link
- SafeStorage
- OBS-Verbindung
- Stream Studio Start/Stop
- Update/Rollback
- Reconnect/Netzwerkverlust
