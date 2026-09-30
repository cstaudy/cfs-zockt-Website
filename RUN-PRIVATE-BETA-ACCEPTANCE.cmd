@echo off
setlocal
cd /d "%~dp0"

echo ==============================================================
echo cfs_zockt PRIVATE BETA ACCEPTANCE v155
echo ==============================================================
echo.

where node.exe >nul 2>nul
if errorlevel 1 (
  echo BLOCKED / FAIL
  echo Node.js 22+ wurde nicht gefunden.
  pause
  exit /b 10
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%V"
if %NODE_MAJOR% LSS 22 (
  echo BLOCKED / FAIL
  echo Node.js 22+ ist erforderlich. Gefunden: %NODE_MAJOR%
  pause
  exit /b 10
)

if not exist "package.json" (
  echo BLOCKED / FAIL
  echo package.json fehlt. Bitte aus dem vollstaendigen Projektordner starten.
  pause
  exit /b 10
)

call npm run private-beta155:check
if errorlevel 1 (
  echo.
  echo PRIVATE BETA LOCAL PRECHECK: FAIL
  echo Erst die gemeldeten Fehler beheben. Keine LIVE-Provider-Tests starten.
  pause
  exit /b 1
)

echo.
echo PRIVATE BETA LOCAL PRECHECK: PASS
echo.
echo Naechste reale Schritte auf DIESEM Windows-PC:
echo   1. Launcher starten und Creator Account verbinden.
echo   2. Integriertes Beta-Test-Handbuch im Launcher der Reihe nach abarbeiten.
echo   3. Windows Capture/Audio und SafeStorage pruefen.
echo   4. OBS WebSocket + Browser Source real pruefen.
echo   5. Twitch LIVE pruefen.
echo   6. TikTok LIVE nur mit offiziell vorhandenem Encoder-Zugang pruefen.
echo   7. YouTube LIVE erst nach eingerichteter Google/YouTube OAuth-Konfiguration.
echo   8. Danach 2+ Ziele, Zielausfall, Netzwerkverlust, Reconnect und Soak testen.
echo.
echo WICHTIG: Keine Stream-Keys, Passwoerter oder Provider-Tokens in Chat,
echo Screenshots oder Support-Exports kopieren.
echo.
echo Der alte Production-R59-R67-Runner enthaelt einen Stripe-LIVE-Schritt.
echo Dieser gehoert NICHT zur kostenlosen privaten Beta und wird hier bewusst

echo nicht gestartet.
echo.
echo Details: PRIVATE-BETA-ACCEPTANCE-v155.md
pause
exit /b 0
