@echo off
setlocal
cd /d "%~dp0"
echo.
echo ================================================
echo  cfs_zockt Creator Suite - Windows Release Build
echo ================================================
echo.
echo Version: 0.47.30
echo Ziel:    NSIS Setup + Portable (Windows x64)
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Node.js 22 ist nicht im PATH.
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] npm ist nicht im PATH.
  goto :fail
)
echo [1/4] Reproduzierbare Abhaengigkeiten installieren...
call npm ci --ignore-scripts --no-audit --no-fund
if errorlevel 1 goto :fail
echo.
echo [2/4] Launcher QA und Release-Vertraege pruefen...
call npm run qa
if errorlevel 1 goto :fail
echo.
echo [3/4] Windows Setup + Portable bauen...
call npm run dist:win
if errorlevel 1 goto :fail
echo.
echo [4/4] Release Manifest erzeugen...
call npm run manifest:release
if errorlevel 1 goto :fail
echo.
echo Build erfolgreich.
echo Ausgabe: %CD%\dist
echo.
echo Erwartete EXE-Dateien:
echo   cfs_zockt-Creator-Suite-Setup-0.47.30-x64.exe
echo   cfs_zockt-Creator-Suite-Portable-0.47.30-x64.exe
echo.
echo HINWEIS: Fuer einen oeffentlichen Release muss die Authenticode-
echo Signatur gueltig sein. Der GitHub Tag-Workflow erzwingt das.
pause
exit /b 0
:fail
echo.
echo Build fehlgeschlagen. Bitte die Ausgabe oben pruefen.
pause
exit /b 1
