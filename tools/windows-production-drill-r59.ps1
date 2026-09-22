[CmdletBinding()]
param(
    [string]$Target = "https://cfs-zockt.de",
    [string]$RepoUrl = "https://github.com/cstaudy/cfs-zockt-Website.git",
    [switch]$NoUpdate
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"
$script:ProjectRoot = $null

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 78)
    Write-Host $Text
    Write-Host ("=" * 78)
}

function Write-Info {
    param([string]$Text)
    Write-Host "[INFO]  $Text"
}

function Write-Ok {
    param([string]$Text)
    Write-Host "[PASS]  $Text"
}

function Write-WarnLine {
    param([string]$Text)
    Write-Warning $Text
}

function Test-CommandExists {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-CfsProjectRoot {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Container)) {
        return $false
    }

    $packagePath = Join-Path $Path "package.json"
    $lockPath = Join-Path $Path "package-lock.json"
    $drillPath = Join-Path $Path "tools\render-production-drill-r59.mjs"
    $doctorPath = Join-Path $Path "tools\predeploy-production-doctor-r68.mjs"

    if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) { return $false }
    if (-not (Test-Path -LiteralPath $lockPath -PathType Leaf)) { return $false }
    if (-not (Test-Path -LiteralPath $drillPath -PathType Leaf)) { return $false }
    if (-not (Test-Path -LiteralPath $doctorPath -PathType Leaf)) { return $false }

    try {
        $pkg = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
        if ($pkg.name -ne "cfs-zockt-creator-suite-web") { return $false }
        if ($null -eq $pkg.scripts) { return $false }
        if ([string]::IsNullOrWhiteSpace([string]$pkg.scripts.'predeploy:doctor')) { return $false }
        if ([string]::IsNullOrWhiteSpace([string]$pkg.scripts.'security59:check')) { return $false }
        if ([string]::IsNullOrWhiteSpace([string]$pkg.scripts.'render:drill')) { return $false }
        return $true
    }
    catch {
        return $false
    }
}

function Get-GitOrigin {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath (Join-Path $Path ".git") -PathType Container)) {
        return ""
    }

    Push-Location $Path
    try {
        $value = & git remote get-url origin 2>$null
        if ($LASTEXITCODE -ne 0 -or $null -eq $value) { return "" }
        return ([string]($value | Select-Object -First 1)).Trim()
    }
    finally {
        Pop-Location
    }
}

function Test-ExpectedOrigin {
    param([string]$Origin)
    if ([string]::IsNullOrWhiteSpace($Origin)) { return $false }
    return $Origin -match '(?i)(github\.com[:/])cstaudy/cfs-zockt-Website(?:\.git)?$'
}

function Add-Candidate {
    param(
        [System.Collections.Generic.List[string]]$List,
        [System.Collections.Generic.HashSet[string]]$Seen,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    try {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    catch {
        return
    }

    if ($Seen.Add($full)) {
        [void]$List.Add($full)
    }
}

function Get-ProjectCandidates {
    $list = New-Object 'System.Collections.Generic.List[string]'
    $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)

    Add-Candidate $list $seen (Get-Location).Path
    Add-Candidate $list $seen $PSScriptRoot
    Add-Candidate $list $seen (Split-Path -Parent $PSScriptRoot)

    $bases = @(
        (Join-Path $env:USERPROFILE "OneDrive\Desktop"),
        (Join-Path $env:USERPROFILE "Desktop"),
        (Join-Path $env:USERPROFILE "Downloads"),
        (Join-Path $env:USERPROFILE "Documents")
    )

    foreach ($base in $bases) {
        if (-not (Test-Path -LiteralPath $base -PathType Container)) { continue }
        Add-Candidate $list $seen $base

        $level1 = Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like 'cfs-zockt*' -or $_.Name -like 'cfs_zockt*' }

        foreach ($dir in $level1) {
            Add-Candidate $list $seen $dir.FullName

            $level2 = Get-ChildItem -LiteralPath $dir.FullName -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -like 'cfs-zockt*' -or $_.Name -like 'cfs_zockt*' }

            foreach ($sub in $level2) {
                Add-Candidate $list $seen $sub.FullName
            }
        }
    }

    return $list
}

function Get-DesktopRoot {
    $oneDriveDesktop = Join-Path $env:USERPROFILE "OneDrive\Desktop"
    if (Test-Path -LiteralPath $oneDriveDesktop -PathType Container) {
        return $oneDriveDesktop
    }

    $desktop = Join-Path $env:USERPROFILE "Desktop"
    if (Test-Path -LiteralPath $desktop -PathType Container) {
        return $desktop
    }

    return $env:USERPROFILE
}

function New-FreshCheckout {
    param([string]$Repo)

    $desktop = Get-DesktopRoot
    $baseName = "cfs-zockt-production-drill"
    $targetPath = Join-Path $desktop $baseName

    if (Test-Path -LiteralPath $targetPath) {
        $canReuse = $false
        if (Test-CfsProjectRoot $targetPath) {
            $origin = Get-GitOrigin $targetPath
            if (Test-ExpectedOrigin $origin) {
                Push-Location $targetPath
                try {
                    $dirty = @(& git status --porcelain 2>$null)
                    if ($LASTEXITCODE -eq 0 -and $dirty.Count -eq 0) {
                        $canReuse = $true
                    }
                }
                finally {
                    Pop-Location
                }
            }
        }

        if ($canReuse) {
            return $targetPath
        }

        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $targetPath = Join-Path $desktop "$baseName-$stamp"
    }

    Write-Info "Kein geeigneter aktueller Checkout gefunden. Klone GitHub nach: $targetPath"
    & git clone --depth 1 $Repo $targetPath
    if ($LASTEXITCODE -ne 0) {
        throw "Git-Clone fehlgeschlagen. ExitCode=$LASTEXITCODE"
    }

    if (-not (Test-CfsProjectRoot $targetPath)) {
        throw "Der geklonte Ordner ist kein gültiger cfs-zockt-Projektroot: $targetPath"
    }

    return $targetPath
}

function Select-ProjectRoot {
    Write-Section "Projekt automatisch suchen"

    $valid = @()
    foreach ($candidate in (Get-ProjectCandidates)) {
        if (-not (Test-CfsProjectRoot $candidate)) { continue }

        $origin = Get-GitOrigin $candidate
        $originOk = Test-ExpectedOrigin $origin
        $valid += [pscustomobject]@{
            Path = $candidate
            Origin = $origin
            OriginOk = $originOk
            IsGit = -not [string]::IsNullOrWhiteSpace($origin)
        }
    }

    $preferred = $valid |
        Sort-Object @{ Expression = { if ($_.OriginOk) { 0 } else { 1 } } }, @{ Expression = { if ($_.IsGit) { 0 } else { 1 } } }, Path |
        Select-Object -First 1

    if ($null -ne $preferred -and $preferred.OriginOk) {
        Write-Ok "Projekt gefunden: $($preferred.Path)"
        return $preferred.Path
    }

    if ($null -ne $preferred) {
        Write-WarnLine "Lokaler Projektordner gefunden, aber ohne erwartetes GitHub-Origin. Für den Production-Nachweis wird ein sauberer GitHub-Checkout verwendet."
    }

    return New-FreshCheckout $RepoUrl
}

function Update-CheckoutIfSafe {
    param([string]$Path)

    if ($NoUpdate) {
        Write-Info "Git-Update durch -NoUpdate übersprungen."
        return
    }

    $origin = Get-GitOrigin $Path
    if (-not (Test-ExpectedOrigin $origin)) {
        Write-WarnLine "GitHub-Origin passt nicht; kein automatisches Update."
        return
    }

    Push-Location $Path
    try {
        $dirty = @(& git status --porcelain 2>$null)
        if ($LASTEXITCODE -ne 0) {
            Write-WarnLine "Git-Status konnte nicht gelesen werden; kein automatisches Update."
            return
        }

        if ($dirty.Count -gt 0) {
            Write-WarnLine "Der gefundene Checkout hat lokale Änderungen. Er wird nicht verändert."
            $fresh = New-FreshCheckout $RepoUrl
            if ($fresh -ne $Path) {
                $script:ProjectRoot = $fresh
            }
            return
        }

        Write-Info "Aktualisiere den sauberen Checkout per git pull --ff-only ..."
        & git pull --ff-only
        if ($LASTEXITCODE -ne 0) {
            throw "git pull --ff-only fehlgeschlagen. ExitCode=$LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-NpmStep {
    param(
        [string]$Title,
        [string[]]$Arguments
    )

    Write-Section $Title
    & npm @Arguments
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        throw "$Title fehlgeschlagen. ExitCode=$code"
    }
    Write-Ok "$Title erfolgreich."
}

function Show-R59Report {
    param([string]$Root)

    $reportPath = Join-Path $Root "reports\render-production-drill-r59.json"
    if (-not (Test-Path -LiteralPath $reportPath -PathType Leaf)) {
        Write-WarnLine "R59-Report wurde nicht gefunden: $reportPath"
        return $null
    }

    Write-Section "R59 Report-Zusammenfassung"
    try {
        $report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
        Write-Host "Status:          $($report.status)"
        Write-Host "Target:          $($report.target)"
        Write-Host "Generated at:    $($report.generated_at)"
        Write-Host "Passed:          $($report.summary.passed)"
        Write-Host "Failed:          $($report.summary.failed)"
        Write-Host "Skipped:         $($report.summary.skipped)"
        Write-Host "Blocked:         $($report.summary.blocked)"
        Write-Host "Live failed:     $($report.summary.live_failed)"

        $problems = @($report.checks | Where-Object { $_.status -eq 'FAIL' -or $_.status -eq 'BLOCKED' })
        if ($problems.Count -gt 0) {
            Write-Host ""
            Write-Host "Fehlgeschlagene/blockierte Checks:"
            foreach ($problem in $problems) {
                Write-Host (" - [{0}] {1}: {2} ({3})" -f $problem.scope, $problem.status, $problem.label, $problem.detail)
            }
        }

        Write-Host ""
        Write-Host "Vollständiger Report: $reportPath"
        return $report
    }
    catch {
        Write-WarnLine "R59-Report konnte nicht gelesen werden: $($_.Exception.Message)"
        return $null
    }
}

try {
    Write-Section "CFS ZOCKT - automatischer Windows Production Drill R59"
    Write-Host "Target: $Target"

    foreach ($required in @('git', 'node', 'npm')) {
        if (-not (Test-CommandExists $required)) {
            throw "Benötigtes Programm fehlt oder ist nicht im PATH: $required"
        }
    }

    $ProjectRoot = Select-ProjectRoot
    Update-CheckoutIfSafe $ProjectRoot
    if ($script:ProjectRoot) {
        $ProjectRoot = $script:ProjectRoot
    }

    if (-not (Test-CfsProjectRoot $ProjectRoot)) {
        throw "Kein gültiger cfs-zockt-Projektroot verfügbar."
    }

    Set-Location $ProjectRoot

    Write-Section "Verwendeter Projektstand"
    Write-Host "Pfad:            $ProjectRoot"
    Write-Host "Node:            $(& node --version)"
    Write-Host "npm:             $(& npm --version)"
    $commit = & git rev-parse HEAD 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Git commit:      $commit"
    }
    Write-Host "package.json:    $(Test-Path -LiteralPath '.\package.json')"
    Write-Host "package-lock:    $(Test-Path -LiteralPath '.\package-lock.json')"

    Invoke-NpmStep "npm ci" @('ci')
    Invoke-NpmStep "R68 Pre-Deploy Doctor" @('run', 'predeploy:doctor')
    Invoke-NpmStep "R59 statisches Security Gate" @('run', 'security59:check')

    Write-Section "R59 echter Production LIVE Drill"
    & npm run render:drill -- --external-only --live --target $Target
    $drillExit = $LASTEXITCODE

    $report = Show-R59Report $ProjectRoot

    Write-Section "Endergebnis"
    switch ($drillExit) {
        0 {
            if ($null -ne $report -and $report.status -eq 'LIVE_PASS') {
                Write-Host "LIVE_PASS"
                Write-Ok "Punkt 1 / Render Production Drill ist erfolgreich abgeschlossen."
                exit 0
            }

            Write-WarnLine "Der Prozess meldete ExitCode 0, aber der Report enthält nicht LIVE_PASS. Bitte Report prüfen."
            exit 3
        }
        1 {
            Write-Host "NO_GO / LIVE_FAIL"
            Write-WarnLine "Mindestens ein blockierender R59-Check ist fehlgeschlagen."
            exit 1
        }
        2 {
            Write-Host "EXTERNAL_BLOCKED"
            Write-WarnLine "Mindestens ein externer LIVE-Check konnte nicht zuverlässig ausgeführt werden."
            exit 2
        }
        default {
            Write-Host "UNEXPECTED_EXIT_$drillExit"
            throw "R59 lieferte einen unerwarteten ExitCode=$drillExit"
        }
    }
}
catch {
    Write-Host ""
    Write-Host "AUTOMATISCHER PRODUCTION DRILL ABGEBROCHEN"
    Write-Host $_.Exception.Message
    exit 10
}
