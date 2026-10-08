@echo off
setlocal
cd /d "%~dp0"
echo.
echo CFS Zockt Website 3.20.71 - nur fehlende/veraenderte Dateien
set /p "ZIEL=Pfad zum ENTPACKTEN cfs-zockt-Website-main Ordner: "
if "%ZIEL%"=="" (echo Kein Pfad angegeben.&pause&exit /b 2)
py -3 "%~dp0PATCH_INSTALLIEREN.py" --check "%ZIEL%"
if errorlevel 1 (echo Vorpruefung gescheitert. Keine Dateien geaendert.&pause&exit /b 1)
choice /C JN /M "Jetzt mit Backup ergaenzen?"
if errorlevel 2 (echo Abgebrochen.&pause&exit /b 0)
py -3 "%~dp0PATCH_INSTALLIEREN.py" --apply "%ZIEL%"
echo.
echo Denk an das grosse Originaldesign-ZIP im resources/original-designs Ordner.
pause
