@echo off
chcp 65001 >nul
title cfs_zockt Admin PC
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Admin-PC\CFS-Admin-PC.ps1"
if errorlevel 1 (echo [FEHLER] Das PC-Startcenter konnte nicht gestartet werden. & pause & exit /b 1)
