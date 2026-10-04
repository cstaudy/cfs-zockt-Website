$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host '=== CFS ZOCKT v195 - Feste Acceptance-Basis ==='
npm run freeze195:verify; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run freeze195:secret; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run release:v195; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run acceptance191:preflight -- --target-windows --probe-obs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run acceptance190:status
npm run acceptance191:go-no-go
Write-Host ''
Write-Host 'Baseline unveraendert. Jetzt die 48 Realtests nach ABNAHME-ABLAUFPLAN-v195.md ausfuehren.'
Write-Host 'Ein automatisches GO ist absichtlich nicht moeglich.'
