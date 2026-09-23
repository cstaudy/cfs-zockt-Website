@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-production-live-tests.ps1" -Round R67
set "EC=%ERRORLEVEL%"
echo.
echo R67 beendet - ExitCode %EC%
pause
exit /b %EC%
