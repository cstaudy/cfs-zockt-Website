@echo off
setlocal
cd /d "%~dp0"
if not exist "launcher\build-windows.bat" (
  echo [FEHLER] launcher\build-windows.bat wurde nicht gefunden.
  exit /b 1
)
call "launcher\build-windows.bat"
exit /b %errorlevel%
