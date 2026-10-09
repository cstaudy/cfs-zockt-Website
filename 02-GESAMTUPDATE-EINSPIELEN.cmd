@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo cfs_zockt WEBSITE R11 - GESAMTUPDATE
echo ==========================================
where py >nul 2>&1
if not errorlevel 1 (
  py -3 "%~dp0INSTALLIEREN.py" --apply --target "%~1"
) else (
  python "%~dp0INSTALLIEREN.py" --apply --target "%~1"
)
echo.
pause
