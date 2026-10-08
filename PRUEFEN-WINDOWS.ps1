# Offline pruefen: keine Programme installieren, kein Netzwerkzugriff.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifest = Get-Content -LiteralPath (Join-Path $root 'RELEASE-MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$allGood = $true
foreach ($item in $manifest.files) {
  $rel = $item.path -replace '/', [IO.Path]::DirectorySeparatorChar
  $file = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    Write-Host ('FEHLT: ' + $item.path) -ForegroundColor Red
    $allGood = $false
    continue
  }
  $size = (Get-Item -LiteralPath $file).Length
  $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if (($size -eq [long]$item.bytes) -and ($hash -eq $item.sha256)) {
    Write-Host ('OK: ' + $item.path) -ForegroundColor Green
  } else {
    Write-Host ('FEHLER: ' + $item.path) -ForegroundColor Red
    $allGood = $false
  }
}
if (-not $allGood) { throw 'Paketpruefung fehlgeschlagen. Nicht installieren.' }
Write-Host 'Beide Archive sind SHA-256-geprueft.' -ForegroundColor Green
