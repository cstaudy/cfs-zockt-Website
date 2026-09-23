@echo off
setlocal
set "SCRIPT=%~dp0tools\windows-recovery-drill-r60.ps1"

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
  echo R60 beendet: LIVE_RESTORE_PASS
) else (
  echo R60 beendet: BLOCKED / FAIL - ExitCode %EXITCODE%
)
echo ==============================================================
pause
exit /b %EXITCODE%
