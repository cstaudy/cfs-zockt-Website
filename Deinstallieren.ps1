#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$home=Join-Path $env:LOCALAPPDATA 'cfs_zockt\Admin-App'
$desktop=Join-Path ([Environment]::GetFolderPath('Desktop')) 'cfs_zockt Admin.lnk'
$menu=Join-Path ([Environment]::GetFolderPath('Programs')) 'cfs_zockt\cfs_zockt Admin.lnk'
Remove-Item -LiteralPath $desktop,$menu -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $home -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'PC-App entfernt. CFS AI, Website und gespeicherte Dienst-Einstellungen blieben unveraendert.'
