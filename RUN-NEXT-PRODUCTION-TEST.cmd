@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo BLOCKED / FAIL
  echo Node.js wurde nicht gefunden. Node 22+ ist erforderlich.
  pause
  exit /b 10
)
node "%~dp0tools\production-readiness.mjs" --next
set "EC=%ERRORLEVEL%"
echo.
echo Production Readiness NEXT beendet - ExitCode %EC%
pause
exit /b %EC%
