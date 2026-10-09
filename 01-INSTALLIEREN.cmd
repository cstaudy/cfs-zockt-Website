@echo off
chcp 65001 >nul
title cfs_zockt Admin PC - Einrichtung
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Installieren.ps1"
if errorlevel 1 (echo [FEHLER] Siehe Meldung oben. & pause & exit /b 1)
echo Fertig. Starte ab jetzt cfs_zockt Admin auf dem Desktop.
pause
