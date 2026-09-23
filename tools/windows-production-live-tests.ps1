[CmdletBinding()]
param(
    [string]$Round = 'ALL',
    [string]$RepoUrl = 'https://github.com/cstaudy/cfs-zockt-Website.git',
    [switch]$NoUpdate
)

$ErrorActionPreference = 'Stop'
$controller = Join-Path $PSScriptRoot 'production-readiness.mjs'
if (-not (Test-Path -LiteralPath $controller -PathType Leaf)) {
    throw "Production Readiness Controller fehlt: $controller"
}

$mode = $Round.Trim().ToUpperInvariant()
$args = switch ($mode) {
    'CHECK' { @('--check') }
    'NEXT'  { @('--next') }
    'R67'   { @('--r67') }
    'R59'   { @('--round','R59') }
    'R60'   { @('--round','R60') }
    'R61'   { @('--round','R61') }
    'R62'   { @('--round','R62') }
    'R63'   { @('--round','R63') }
    'R64'   { @('--round','R64') }
    'R65'   { @('--round','R65') }
    'R66'   { @('--round','R66') }
    default { @('--all') }
}

& node $controller @args
exit $LASTEXITCODE
