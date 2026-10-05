@echo off
setlocal
cd /d "%~dp0admin-desktop"
echo ========================================
echo       CFS ADMIN - WINDOWS BUILD
echo ========================================
where node >nul 2>nul || (echo [FEHLT] Node.js wurde nicht gefunden.& pause & exit /b 1)
call npm install || (echo [FEHLER] npm install fehlgeschlagen.& pause & exit /b 1)
call npm run check || (echo [FEHLER] Syntax-Check fehlgeschlagen.& pause & exit /b 1)
call npm run dist:win || (echo [FEHLER] Windows-Build fehlgeschlagen.& pause & exit /b 1)
echo.
echo [FERTIG] Installer liegt in admin-desktop\dist
pause
