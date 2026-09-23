[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$controller = Join-Path $PSScriptRoot 'production-readiness.mjs'
if (-not (Test-Path -LiteralPath $controller -PathType Leaf)) {
    throw "Production Readiness Controller fehlt: $controller"
}

& node $controller --next
exit $LASTEXITCODE
