@echo off
chcp 65001 >nul
title cfs_zockt Admin PC - Entfernen
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deinstallieren.ps1"
if errorlevel 1 (echo [FEHLER] Siehe Meldung oben. & pause & exit /b 1)
pause
