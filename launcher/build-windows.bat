@echo off
setlocal
cd /d "%~dp0"
echo.
echo =========================================
echo  cfs_zockt Creator Suite - Windows Build
echo =========================================
echo.
call npm install
if errorlevel 1 goto :fail
call npm run qa
if errorlevel 1 goto :fail
call npm run dist:win
if errorlevel 1 goto :fail
echo.
echo Build erfolgreich.
echo Ausgabe: %CD%\dist
pause
exit /b 0
:fail
echo.
echo Build fehlgeschlagen. Bitte die Ausgabe oben pruefen.
pause
exit /b 1
