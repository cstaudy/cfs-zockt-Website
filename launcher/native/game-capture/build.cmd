@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "OUTDIR=%~dp0..\..\vendor\game-capture"
set "OUT=%OUTDIR%\cfs-game-capture.exe"
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
  echo [CFS] Installiere Visual Studio Build Tools mit "Desktop development with C++" und Windows 10/11 SDK.
  exit /b 1
)

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo [CFS] Baue Windows.Graphics.Capture Helper...
cl.exe /nologo /std:c++17 /EHsc /O2 /W4 /guard:cf /DUNICODE /D_UNICODE cfs-game-capture.cpp /Fe:"%OUT%" /link /NXCOMPAT /DYNAMICBASE D3D11.lib DXGI.lib Dwmapi.lib RuntimeObject.lib WindowsApp.lib
if errorlevel 1 exit /b %errorlevel%

set "PROBE_OK="
for /f "delims=" %%P in ('"%OUT%" --probe 2^>nul') do if "%%P"=="CFS_GAME_CAPTURE_WGC_V1" set "PROBE_OK=1"
if not defined PROBE_OK (
  echo [CFS] FEHLER: Der gebaute Game-Capture Helper hat den --probe Selbsttest nicht bestanden.
  del /q "%OUT%" >nul 2>nul
  exit /b 2
)

powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$h=(Get-FileHash -Algorithm SHA256 -LiteralPath '%OUT%').Hash.ToLower(); Set-Content -LiteralPath '%OUT%.sha256' -Encoding Ascii -Value ($h + '  cfs-game-capture.exe')"
if errorlevel 1 exit /b %errorlevel%

echo [CFS] Game-Capture Helper gebaut und geprueft: launcher\vendor\game-capture\cfs-game-capture.exe
exit /b 0
