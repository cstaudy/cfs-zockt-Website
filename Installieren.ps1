#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$from = Join-Path $PSScriptRoot 'Admin-PC'
$source = Join-Path $from 'CFS-Admin-PC.ps1'
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Bitte ZIP zuerst vollstaendig entpacken.' }
$home = Join-Path $env:LOCALAPPDATA 'cfs_zockt\Admin-App'
New-Item -ItemType Directory -Force -Path $home | Out-Null
Copy-Item -LiteralPath $source -Destination (Join-Path $home 'CFS-Admin-PC.ps1') -Force
foreach ($name in @('cfs-zockt-logo.png','cfs-admin.ico','CFS-AI-MONITOR.ps1','ZAHLUNGSPLAN-UND-WETTBEWERB.txt')) {
    Copy-Item -LiteralPath (Join-Path $from $name) -Destination (Join-Path $home $name) -Force
}
$exe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {throw 'Windows PowerShell 5.1 wurde nicht gefunden.'}
$arguments='-NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $home 'CFS-Admin-PC.ps1') + '"'
$shell=New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu=Join-Path ([Environment]::GetFolderPath('Programs')) 'cfs_zockt'
New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
foreach($file in @((Join-Path $desktop 'cfs_zockt Admin.lnk'),(Join-Path $startMenu 'cfs_zockt Admin.lnk'))){
    $lnk=$shell.CreateShortcut($file)
    $lnk.TargetPath=$exe
    $lnk.Arguments=$arguments
    $lnk.WorkingDirectory=$home
    $lnk.IconLocation=(Join-Path $home 'cfs-admin.ico')
    $lnk.Description='Privater cfs_zockt Website- und CFS-AI-Adminzugang'
    $lnk.Save()
}
Write-Host 'Installiert: cfs_zockt Admin PC' -ForegroundColor Green
Write-Host ('Programmordner: ' + $home)
Write-Host 'Desktop-Verknuepfung und Startmenue-Eintrag wurden erstellt.'
Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory $home
