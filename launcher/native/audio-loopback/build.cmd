@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "OUTDIR=%~dp0..\..\vendor\audio"
set "OUT=%OUTDIR%\cfs-audio-loopback.exe"
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"

where cl.exe >nul 2>nul
if errorlevel 1 (
  if exist "%VSWHERE%" (
    for /f "usebackq tokens=*" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VSINSTALL=%%I"
    if defined VSINSTALL if exist "%VSINSTALL%\VC\Auxiliary\Build\vcvars64.bat" call "%VSINSTALL%\VC\Auxiliary\Build\vcvars64.bat" >nul
  )
)

where cl.exe >nul 2>nul || (
  echo [CFS] Visual C++ Build Tools wurden nicht gefunden.
  echo [CFS] Installiere Visual Studio Build Tools mit "Desktop development with C++" und Windows SDK.
  exit /b 1
)

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo [CFS] Baue Windows Process-Loopback Helper...
cl.exe /nologo /std:c++17 /EHsc /O2 /W4 /guard:cf /DUNICODE /D_UNICODE cfs-audio-loopback.cpp /Fe:"%OUT%" /link /NXCOMPAT /DYNAMICBASE Ole32.lib Mmdevapi.lib RuntimeObject.lib
if errorlevel 1 exit /b %errorlevel%

set "PROBE_OK="
for /f "delims=" %%P in ('"%OUT%" --probe 2^>nul') do if "%%P"=="CFS_AUDIO_LOOPBACK_V1" set "PROBE_OK=1"
if not defined PROBE_OK (
  echo [CFS] FEHLER: Der gebaute Helper hat den --probe Selbsttest nicht bestanden.
  del /q "%OUT%" >nul 2>nul
  exit /b 2
)

powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$h=(Get-FileHash -Algorithm SHA256 -LiteralPath '%OUT%').Hash.ToLower(); Set-Content -LiteralPath '%OUT%.sha256' -Encoding Ascii -Value ($h + '  cfs-audio-loopback.exe')"
if errorlevel 1 exit /b %errorlevel%

echo [CFS] Helper gebaut und geprueft: launcher\vendor\audio\cfs-audio-loopback.exe
echo [CFS] SHA-256: launcher\vendor\audio\cfs-audio-loopback.exe.sha256
exit /b 0
