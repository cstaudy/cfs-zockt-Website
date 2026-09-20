# CFS Windows Application Audio Loopback Helper

This native helper captures PCM audio from one Windows process tree using the Windows Process Loopback WASAPI API (`ActivateAudioInterfaceAsync` + `AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK`).

It writes signed 16-bit little-endian stereo PCM at 48 kHz to stdout. The Electron launcher fans that stream out to the FFmpeg processes that need the corresponding Game / Discord / Music / Alerts bus.

## Requirements

- Windows 10 build **20348** or newer.
- Visual Studio 2019/2022 Build Tools or Visual Studio with **Desktop development with C++**.
- A Windows SDK that contains `audioclientactivationparams.h`.

Microsoft documents Windows 10 build 20348 as the minimum supported client for the process-loopback activation structures. The helper intentionally checks the OS build in the Launcher before it is treated as ready.

## Build

From `launcher/` run:

```bat
npm.cmd run audio-helper:build
```

`build.cmd` first uses an already configured `cl.exe`. If that is not available, it tries to locate Visual Studio automatically through `vswhere.exe` and loads the x64 VC build environment.

A successful build:

1. creates `launcher/vendor/audio/cfs-audio-loopback.exe`,
2. runs `cfs-audio-loopback.exe --probe`,
3. requires the protocol response `CFS_AUDIO_LOOPBACK_V1`, and
4. writes `cfs-audio-loopback.exe.sha256` next to the binary.

The release package must not treat a merely present binary as healthy. The Launcher performs the same runtime probe before enabling Process Loopback.

## Windows acceptance

Probe helper + Windows build:

```bat
npm.cmd run audio-helper:doctor
```

For a real process capture smoke test, start audio playback in the target app, note its PID, then run:

```bat
npm.cmd run audio-helper:acceptance -- --pid 1234 --seconds 5
```

The acceptance command counts raw PCM bytes but does not write captured audio to disk. Its JSON evidence contains technical status only and no audio payload.

The repository intentionally does not contain an unreviewed prebuilt executable. Release builds build and stage the reviewed helper locally before Electron packaging.

## Recovery and soak

Pass 21.10.17 keeps the FFmpeg audio pipes alive if a helper exits or the target application restarts. The Electron-side `ApplicationAudioSourceManager` owns recovery: it rebinds by normalized process name, restarts the helper with bounded backoff, and injects local zero-sample continuity PCM while the real source is temporarily unavailable.

For a longer real Windows test with one or more application buses:

```bat
npm.cmd run audio-helper:soak -- --game-pid 1234 --discord-pid 5678 --seconds 300
```

During the soak, a target application may be closed and restarted to validate PID rebind. Evidence is written to `launcher/reports/application-audio-windows-soak.json`; it contains counters and status only, never raw audio samples.
