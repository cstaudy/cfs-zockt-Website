@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-production-live-tests.ps1" -Round MENU
set "EC=%ERRORLEVEL%"
echo.
echo Production LIVE Tests beendet - ExitCode %EC%
pause
exit /b %EC%
