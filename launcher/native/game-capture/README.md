# CFS Windows Game Capture Helper

`cfs-game-capture.exe` uses Windows.Graphics.Capture with D3D11 to capture the visible top-level window of a selected process. The helper emits a constant-rate BGRA raw-video stream to stdout for the local CFS Scene Graph.

Requirements: Windows 10 version 1903 / build 18362 or newer, Visual C++ Build Tools and a Windows 10/11 SDK. Build with `build.cmd` or `npm run game-capture:build` from `launcher`.

Runtime probe: `cfs-game-capture.exe --probe` must print `CFS_GAME_CAPTURE_WGC_V1`.

The helper does not inject code into the game process. Protected content and some exclusive-fullscreen/anti-cheat configurations can reject or blank capture; the Launcher keeps a GDI/window fallback for those cases.
