# Optional FFmpeg bundle

Dieser Ordner ist die Stage-Fläche für einen späteren Windows-Release.

Für einen gebündelten Windows-Build:

1. Lege eine geprüfte `ffmpeg.exe` hier ab.
2. Lege die zugehörigen Lizenz-/NOTICE-Dateien desselben Builds ebenfalls hier ab.
3. Starte `npm run ffmpeg:check`.
4. Baue anschließend den Windows-Installer.

`electron-builder` kopiert diesen Ordner nach `resources/ffmpeg/`.
Der Launcher sucht zuerst `CFS_FFMPEG_PATH`, danach die gebündelte
`resources/ffmpeg/ffmpeg.exe` und zuletzt den System-PATH.

In diesem Repository wird bewusst keine fremde FFmpeg-Binary automatisch
heruntergeladen oder eingebettet.
