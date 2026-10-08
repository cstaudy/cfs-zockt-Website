import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(process.argv[2]||'.'),reports=path.join(root,'reports');fs.mkdirSync(reports,{recursive:true});
const ps=`$ErrorActionPreference = 'Stop'
$Root = Resolve-Path "$PSScriptRoot\\.."
$Evidence = Join-Path $Root 'evidence\\beta-3.20.57'
New-Item -ItemType Directory -Force -Path $Evidence | Out-Null
Write-Host 'CFS ZOCKT 3.20.57 · Windows Acceptance' -ForegroundColor Cyan
Write-Host '1/7 Preflight' -ForegroundColor Cyan
node tools/beta-preflight-v32057.mjs . --target-windows --probe-obs --strict
Write-Host '2/7 Voller Code-Gate' -ForegroundColor Cyan
npm run check:v32057
Write-Host '3/7 Launcher Release Build' -ForegroundColor Cyan
npm --prefix launcher run release:win
Write-Host '4/7 Application Audio' -ForegroundColor Cyan
npm --prefix launcher run audio-helper:acceptance
Write-Host '5/7 Game Capture' -ForegroundColor Cyan
npm --prefix launcher run game-capture:doctor
Write-Host '6/7 Cut Windows Acceptance' -ForegroundColor Cyan
if (npm --prefix launcher run | Select-String 'cut:windows-acceptance') { npm --prefix launcher run cut:windows-acceptance }
Write-Host '7/7 Artifact Hashes' -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $Root 'launcher\\dist') -File -ErrorAction SilentlyContinue | ForEach-Object { $h=Get-FileHash $_.FullName -Algorithm SHA256; "$($h.Hash)  $($_.Name)" } | Set-Content (Join-Path $Evidence 'windows-artifact-sha256.txt')
Get-ComputerInfo | Select-Object WindowsProductName,WindowsVersion,OsBuildNumber,OsArchitecture | Format-List | Out-File (Join-Path $Evidence 'windows-system.txt')
Write-Host 'Automatik abgeschlossen.' -ForegroundColor Green
Write-Host 'JETZT MANUELL: OBS One-Click, OBS Reconnect, Twitch/TikTok/YouTube LIVE, Browsermatrix, Multistream und 60-Minuten-Soak.' -ForegroundColor Yellow
Write-Host 'Keine OAuth-Tokens, Stream-Keys oder OBS-Passwoerter in Evidence speichern.' -ForegroundColor Yellow
`;
const md=`# Windows / Provider Operator Guide 3.20.57

## Vor dem Start
- Windows 11 Ziel-PC
- OBS installiert, WebSocket aktiviert
- Launcher-Ziel 0.47.31
- Testaccounts für die Provider, die abgenommen werden sollen
- keine echten Secrets in Screenshots oder Logs

## Automatische Vorbereitung
PowerShell als normaler Benutzer im Projekt starten:

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File reports/BETA-WINDOWS-ACCEPTANCE-3.20.57.ps1
\`\`\`

## Danach manuell in fester Reihenfolge
1. OBS One-Click Widget installieren, OBS neu starten, Reconnect bestätigen.
2. Application Audio und Game Capture mit realen Quellen prüfen.
3. Twitch OAuth → Chat → EventSub → Refresh → Reconnect.
4. TikTok LIVE Events über offiziellen Provider prüfen; Encoder-Ziel nur bei offiziellem Zugang.
5. YouTube OAuth → Broadcast → Live Chat → Refresh.
6. Zwei Streaming-Ziele parallel; Fehlerisolation und manuellen Stop prüfen.
7. Browsermatrix: Edge/Chrome, Firefox, Mobile, Keyboard/Fokus, Admin.
8. Creator E2E: Bild→Set, Widget→OBS, Sound→WAV, Recording→Cut, NEXUS Action.
9. 60-Minuten-Soak mit einem gezielten Netzwerk-/Provider-/Launcher-Recovery-Fall.
10. Evidence in \`evidence/beta-3.20.57/\` ablegen und danach \`npm run beta:evidence\`.

## Status erfassen
\`npm run beta:init\` initialisiert die Matrix. Danach z. B.:

\`node tools/beta-acceptance-v32057.mjs record --id twitch.oauth --status pass --reference evidence/beta-3.20.57/twitch-oauth.txt --notes "Testaccount real verbunden"\`

Abschluss: \`npm run beta:go-no-go\`. Das Ergebnis kann höchstens **READY_FOR_MANUAL_GO_NO_GO** sein; es gibt kein automatisches GO.
`;
fs.writeFileSync(path.join(reports,'BETA-WINDOWS-ACCEPTANCE-3.20.57.ps1'),ps);fs.writeFileSync(path.join(reports,'BETA-OPERATOR-GUIDE-3.20.57.md'),md);console.log('Beta Windows Operator Kit 3.20.57: CREATED');
