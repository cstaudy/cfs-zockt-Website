# cfs_zockt OBS R10 – No credentials, no log files, no source URLs. Diagnostic only.
$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '======================================='
Write-Host '  cfs_zockt – OBS PC Kurztest (R10)'
Write-Host '======================================='
Write-Host 'Nur lokale Signale. Es wird nichts installiert oder geschrieben.'
Write-Host ''
$obs = @(Get-Process -Name 'obs64','obs32' -ErrorAction SilentlyContinue)
if ($obs.Count -gt 0) {
 Write-Host '[PROZESS] OBS Studio läuft.' -ForegroundColor Green
} else {
 Write-Host '[HINWEIS] OBS Studio-Prozess nicht gefunden. Bitte OBS manuell starten.' -ForegroundColor Yellow
}
$client = New-Object System.Net.Sockets.TcpClient
try {
 $task = $client.ConnectAsync('127.0.0.1',4455)
 $opened = $task.Wait(1800) -and $client.Connected
 if ($opened) {
  Write-Host '[PORT] localhost:4455 erreichbar. Das bestätigt KEINE OBS-WebSocket-Anmeldung.' -ForegroundColor Green
 } else {
  Write-Host '[PORT] localhost:4455 nicht erreichbar. OBS-WebSocket v5 im OBS-Menü prüfen.' -ForegroundColor Yellow
 }
} catch {
 Write-Host '[PORT] OBS-WebSocket auf 127.0.0.1:4455 derzeit nicht nachgewiesen.' -ForegroundColor Yellow
} finally {
 $client.Dispose()
}
Write-Host ''
Write-Host 'Nächster Schritt: Im CFS Launcher OBS WebSocket verbinden.'
Write-Host 'Dann im Website-Assistenten /pages/obs-setup.html die Creator-Bereitschaft prüfen.'
Write-Host 'Danach Browserquelle in OBS sichtbar machen und das Abnahmeprotokoll ausfüllen.'
Write-Host ''
Write-Host 'ACHTUNG: Es werden keine Passwörter, Tokens oder privaten Browserquellen-URLs eingelesen.'
