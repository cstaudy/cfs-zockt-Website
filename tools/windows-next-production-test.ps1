[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$master = Join-Path $PSScriptRoot 'windows-production-live-tests.ps1'
$store = Join-Path $env:USERPROFILE 'Documents\cfs-zockt-production-evidence'

$tests = @(
    [pscustomobject]@{ Round='R59'; Name='Render Production'; Path='reports\render-production-drill-r59.json'; Status='LIVE_PASS' },
    [pscustomobject]@{ Round='R60'; Name='Database Recovery'; Path='reports\database-recovery-drill-evidence.json'; Status='LIVE_RESTORE_PASS' },
    [pscustomobject]@{ Round='R61'; Name='Mail / Recovery'; Path='reports\account-mail-drill-evidence.json'; Status='LIVE_MAIL_PASS' },
    [pscustomobject]@{ Round='R62'; Name='Passkey / MFA'; Path='reports\account-auth-drill-evidence.json'; Status='LIVE_AUTH_PASS' },
    [pscustomobject]@{ Round='R63'; Name='Windows Launcher'; Path='launcher\reports\windows-production-drill-evidence.json'; Status='LIVE_WINDOWS_PASS' },
    [pscustomobject]@{ Round='R64'; Name='OBS / LIVE 2h Soak'; Path='launcher\reports\live-soak-production-drill-evidence.json'; Status='LIVE_SOAK_PASS' },
    [pscustomobject]@{ Round='R65'; Name='Monitoring / Alerting'; Path='reports\production-monitor-drill-evidence.json'; Status='LIVE_MONITOR_PASS' },
    [pscustomobject]@{ Round='R66'; Name='Stripe LIVE'; Path='reports\stripe-live-drill-evidence.json'; Status='LIVE_BILLING_PASS' }
)

function Section([string]$title) {
    Write-Host ''
    Write-Host ('=' * 78)
    Write-Host $title
    Write-Host ('=' * 78)
}

function EvidenceStorePath([string]$relativePath) {
    return Join-Path $store ($relativePath -replace '[\\/]', '__')
}

function ReadEvidence([string]$relativePath) {
    $candidates = @(
        (EvidenceStorePath $relativePath),
        (Join-Path $root $relativePath)
    )
    foreach ($file in $candidates) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
        try {
            $json = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
            return [pscustomobject]@{
                File = $file
                Status = [string]$json.status
                Json = $json
            }
        } catch {
            return [pscustomobject]@{
                File = $file
                Status = 'INVALID_JSON'
                Json = $null
            }
        }
    }
    return $null
}

function IsPassed($test) {
    $evidence = ReadEvidence $test.Path
    if ($null -eq $evidence) { return $false }
    return $evidence.Status -eq $test.Status
}

function ShowProgress {
    Section 'CFS ZOCKT - Production LIVE Fortschritt'
    foreach ($test in $tests) {
        $evidence = ReadEvidence $test.Path
        if ($null -eq $evidence) {
            Write-Host ("OPEN  {0,-4} {1}" -f $test.Round, $test.Name)
        } elseif ($evidence.Status -eq $test.Status) {
            Write-Host ("PASS  {0,-4} {1} - {2}" -f $test.Round, $test.Name, $evidence.Status)
        } else {
            Write-Host ("OPEN  {0,-4} {1} - vorhandener Status: {2}" -f $test.Round, $test.Name, $evidence.Status)
        }
    }
}

try {
    if (-not (Test-Path -LiteralPath $master -PathType Leaf)) {
        throw "Master-Runner fehlt: $master"
    }

    if (Get-Command git -ErrorAction SilentlyContinue) {
        if (Test-Path -LiteralPath (Join-Path $root '.git')) {
            Push-Location $root
            try {
                $dirty = @(& git status --porcelain)
                if ($dirty.Count -eq 0) {
                    Write-Host '[INFO] Aktualisiere GitHub-Stand ...'
                    & git pull --ff-only | Out-Host
                    if ($LASTEXITCODE -ne 0) {
                        throw "git pull fehlgeschlagen (ExitCode=$LASTEXITCODE)."
                    }
                } else {
                    Write-Warning 'Lokale Änderungen gefunden; automatisches git pull wird übersprungen.'
                }
            } finally {
                Pop-Location
            }
        }
    }

    ShowProgress

    $next = $null
    foreach ($test in $tests) {
        if (-not (IsPassed $test)) {
            $next = $test
            break
        }
    }

    if ($null -eq $next) {
        Section 'R59-R66 vollständig'
        Write-Host '[PASS] Alle erforderlichen R59-R66 LIVE-Evidence-Dateien haben den erwarteten PASS-Status.'
        Write-Host '[INFO] Starte jetzt automatisch R67 Evidence-Import / Launch-Gate-Vorbereitung.'
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $master -Round R67
        exit $LASTEXITCODE
    }

    Section ("Naechster offener Test: {0} - {1}" -f $next.Round, $next.Name)
    Write-Host ("Erwarteter Abschlussstatus: {0}" -f $next.Status)
    Write-Host ''
    Write-Host 'ENTER = diesen Test jetzt starten'
    Write-Host 'SKIP  = nur fuer jetzt ueberspringen und den danach offenen Test suchen'
    Write-Host 'QUIT  = beenden'
    Write-Host ''

    $startIndex = [array]::IndexOf($tests, $next)
    for ($i = $startIndex; $i -lt $tests.Count; $i++) {
        $test = $tests[$i]
        if (IsPassed $test) { continue }

        if ($i -ne $startIndex) {
            Section ("Weiterer offener Test: {0} - {1}" -f $test.Round, $test.Name)
            Write-Host ("Erwarteter Abschlussstatus: {0}" -f $test.Status)
        }

        $choice = Read-Host 'ENTER=starten / SKIP=weiter / QUIT=beenden'
        $choice = if ($null -eq $choice) { '' } else { $choice.Trim().ToUpperInvariant() }

        if ($choice -eq 'QUIT' -or $choice -eq 'Q') {
            exit 0
        }
        if ($choice -eq 'SKIP' -or $choice -eq 'S') {
            Write-Host ("[OPEN] {0} bleibt offen; suche naechsten Test." -f $test.Round)
            continue
        }
        if ($choice -ne '') {
            Write-Warning "Unbekannte Eingabe '$choice'. Beende ohne Statusaenderung."
            exit 0
        }

        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $master -Round $test.Round
        $code = $LASTEXITCODE

        Write-Host ''
        if ($code -eq 0) {
            Write-Host ("[INFO] {0} wurde ausgefuehrt. Beim naechsten Start wird die Evidence erneut geprueft." -f $test.Round)
        } else {
            Write-Warning ("{0} ist noch nicht abgeschlossen (ExitCode={1}). Evidence bleibt OPEN." -f $test.Round, $code)
        }
        exit $code
    }

    Section 'Keine weitere Runde in diesem Durchlauf gestartet'
    Write-Host 'Alle uebersprungenen Tests bleiben OPEN. Starte diese Datei spaeter einfach erneut.'
    exit 0
}
catch {
    Write-Host ''
    Write-Host 'BLOCKED / FAIL'
    Write-Host $_.Exception.Message
    exit 10
}
