@echo off
setlocal
cd /d "%~dp0"
echo === CFS ZOCKT v195 - Feste Acceptance-Basis ===
call npm run freeze195:verify || exit /b 1
call npm run freeze195:secret || exit /b 1
call npm run release:v195 || exit /b 1
call npm run acceptance191:preflight -- --target-windows --probe-obs || exit /b 1
call npm run acceptance190:status
call npm run acceptance191:go-no-go

echo.
echo Baseline ist unveraendert. Jetzt die 48 Realtests nach ABNAHME-ABLAUFPLAN-v195.md ausfuehren.
echo Ein automatisches GO ist absichtlich nicht moeglich.
endlocal
