@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-production-live-tests.ps1" -Round R61
set "EC=%ERRORLEVEL%"
echo.
echo R61 beendet - ExitCode %EC%
pause
exit /b %EC%
