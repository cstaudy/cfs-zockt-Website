@echo off
setlocal
set "SCRIPT=%~dp0tools\windows-production-drill-r59.ps1"

if not exist "%SCRIPT%" (
  echo FEHLER: PowerShell-Skript nicht gefunden:
  echo %SCRIPT%
  pause
  exit /b 10
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXITCODE=%ERRORLEVEL%"

echo.
echo ==============================================================
if "%EXITCODE%"=="0" (
  echo R59 beendet: LIVE_PASS
) else if "%EXITCODE%"=="1" (
  echo R59 beendet: NO_GO / LIVE_FAIL
) else if "%EXITCODE%"=="2" (
  echo R59 beendet: EXTERNAL_BLOCKED
) else (
  echo R59 beendet: FEHLER ExitCode %EXITCODE%
)
echo ==============================================================
pause
exit /b %EXITCODE%
