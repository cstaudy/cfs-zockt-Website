@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-next-production-test.ps1"
set "EC=%ERRORLEVEL%"
echo.
echo Naechster Production-Test beendet - ExitCode %EC%
pause
exit /b %EC%
