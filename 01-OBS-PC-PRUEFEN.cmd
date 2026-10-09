@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where powershell.exe >nul 2>nul
if errorlevel 1 (echo [FEHLER] Windows PowerShell fehlt.&pause&exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0OBS-PC-PRUEFEN.ps1"
echo.
pause
