[CmdletBinding()]
param(
    [string]$RepoUrl = "https://github.com/cstaudy/cfs-zockt-Website.git",
    [switch]$NoUpdate
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"
$script:ProjectRoot = $null
$script:OriginalEnv = @{}

function Write-Section { param([string]$Text) Write-Host ""; Write-Host ("=" * 78); Write-Host $Text; Write-Host ("=" * 78) }
function Write-Info { param([string]$Text) Write-Host "[INFO]  $Text" }
function Write-Ok { param([string]$Text) Write-Host "[PASS]  $Text" }
function Write-WarnLine { param([string]$Text) Write-Warning $Text }
function Test-CommandExists { param([string]$Name) return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue) }

function Test-CfsProjectRoot {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Container)) { return $false }
    foreach ($rel in @('package.json','package-lock.json','tools\database-recovery-drill-r60.mjs','tools\database-recovery-drill-pass60-test.mjs','tools\database-backup.mjs','tools\database-restore.mjs')) {
        if (-not (Test-Path -LiteralPath (Join-Path $Path $rel) -PathType Leaf)) { return $false }
    }
    try {
        $pkg = Get-Content -LiteralPath (Join-Path $Path 'package.json') -Raw | ConvertFrom-Json
        return $pkg.name -eq 'cfs-zockt-creator-suite-web' -and
            -not [string]::IsNullOrWhiteSpace([string]$pkg.scripts.'recovery:drill') -and
            -not [string]::IsNullOrWhiteSpace([string]$pkg.scripts.'security60:check')
    } catch { return $false }
}
function Get-GitOrigin { param([string]$Path) if (-not (Test-Path (Join-Path $Path '.git'))) { return '' }; Push-Location $Path; try { $v=& git remote get-url origin 2>$null; if($LASTEXITCODE -ne 0){return ''}; return ([string]($v|Select-Object -First 1)).Trim() } finally { Pop-Location } }
function Test-ExpectedOrigin { param([string]$Origin) return (-not [string]::IsNullOrWhiteSpace($Origin)) -and $Origin -match '(?i)(github\.com[:/])cstaudy/cfs-zockt-Website(?:\.git)?$' }
function Get-DesktopRoot { $od=Join-Path $env:USERPROFILE 'OneDrive\Desktop'; if(Test-Path $od){return $od}; $d=Join-Path $env:USERPROFILE 'Desktop'; if(Test-Path $d){return $d}; return $env:USERPROFILE }
function Get-ProjectCandidates {
    $items=New-Object 'System.Collections.Generic.List[string]'; $seen=New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $add={param($p) if([string]::IsNullOrWhiteSpace($p)){return}; try{$f=[IO.Path]::GetFullPath($p)}catch{return}; if($seen.Add($f)){[void]$items.Add($f)}}
    & $add (Get-Location).Path; & $add $PSScriptRoot; & $add (Split-Path -Parent $PSScriptRoot)
    foreach($base in @((Join-Path $env:USERPROFILE 'OneDrive\Desktop'),(Join-Path $env:USERPROFILE 'Desktop'),(Join-Path $env:USERPROFILE 'Downloads'),(Join-Path $env:USERPROFILE 'Documents'))){
        if(-not(Test-Path $base)){continue}; foreach($dir in Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue | Where-Object {$_.Name -like 'cfs-zockt*' -or $_.Name -like 'cfs_zockt*'}){ & $add $dir.FullName }
    }
    return $items
}
function New-FreshCheckout {
    $desktop=Get-DesktopRoot; $base=Join-Path $desktop 'cfs-zockt-recovery-drill'
    if(Test-Path $base){$base=Join-Path $desktop ("cfs-zockt-recovery-drill-"+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
    Write-Info "Klone sauberen GitHub-Stand nach: $base"; & git clone --depth 1 $RepoUrl $base
    if($LASTEXITCODE -ne 0){throw "Git-Clone fehlgeschlagen. ExitCode=$LASTEXITCODE"}; if(-not(Test-CfsProjectRoot $base)){throw "Geklonter Stand enthält R60 nicht vollständig."}; return $base
}
function Select-ProjectRoot {
    Write-Section 'Projekt automatisch suchen'
    foreach($candidate in Get-ProjectCandidates){ if(Test-CfsProjectRoot $candidate){$origin=Get-GitOrigin $candidate; if(Test-ExpectedOrigin $origin){Write-Ok "Projekt gefunden: $candidate"; return $candidate}} }
    return New-FreshCheckout
}
function Update-CheckoutIfSafe {
    param([string]$Path)
    if($NoUpdate){return}; if(-not(Test-ExpectedOrigin (Get-GitOrigin $Path))){return}
    Push-Location $Path
    try {
        $dirty=@(& git status --porcelain 2>$null)
        if($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0){Write-WarnLine 'Checkout hat lokale Änderungen; verwende frischen GitHub-Checkout.'; $script:ProjectRoot=New-FreshCheckout; return}
        Write-Info 'Aktualisiere sauberen Checkout per git pull --ff-only ...'; & git pull --ff-only
        if($LASTEXITCODE -ne 0){throw "git pull fehlgeschlagen. ExitCode=$LASTEXITCODE"}
    } finally { Pop-Location }
}
function Add-PostgresClientTools {
    if((Test-CommandExists 'pg_dump') -and (Test-CommandExists 'pg_restore') -and (Test-CommandExists 'psql')){Write-Ok 'PostgreSQL Clienttools im PATH gefunden.'; return}
    $roots=@('C:\Program Files\PostgreSQL','C:\Program Files (x86)\PostgreSQL')
    $bins=@()
    foreach($root in $roots){ if(Test-Path $root){$bins += Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {Join-Path $_.FullName 'bin'} | Where-Object {Test-Path (Join-Path $_ 'pg_dump.exe')}} }
    $bin=$bins | Sort-Object -Descending | Select-Object -First 1
    if($null -ne $bin){$env:Path="$bin;$env:Path"; Write-Info "PostgreSQL Clienttools gefunden: $bin"}
    if(-not((Test-CommandExists 'pg_dump') -and (Test-CommandExists 'pg_restore') -and (Test-CommandExists 'psql'))){throw 'PostgreSQL Clienttools (pg_dump, pg_restore, psql) fehlen. Installiere PostgreSQL Client Tools passend zur Render-PostgreSQL-Version.'}
    Write-Ok 'PostgreSQL Clienttools bereit.'
}
function Get-SecurePlainText {
    param([string]$EnvName,[string]$Prompt)
    $current=[Environment]::GetEnvironmentVariable($EnvName,'Process')
    if(-not [string]::IsNullOrWhiteSpace($current)){Write-Info "$EnvName ist bereits lokal gesetzt; Wert wird nicht angezeigt."; return $current}
    $secure=Read-Host $Prompt -AsSecureString
    $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
}
function Set-TempEnv { param([string]$Name,[string]$Value) if(-not $script:OriginalEnv.ContainsKey($Name)){$script:OriginalEnv[$Name]=[Environment]::GetEnvironmentVariable($Name,'Process')}; [Environment]::SetEnvironmentVariable($Name,$Value,'Process') }
function Restore-TempEnv { foreach($name in $script:OriginalEnv.Keys){[Environment]::SetEnvironmentVariable($name,$script:OriginalEnv[$name],'Process')} }
function Invoke-NpmStep { param([string]$Title,[string[]]$NpmArguments) Write-Section $Title; $npmCmd=(Get-Command 'npm.cmd' -CommandType Application -ErrorAction Stop).Source; & $npmCmd @NpmArguments; if($LASTEXITCODE -ne 0){throw "$Title fehlgeschlagen. ExitCode=$LASTEXITCODE"}; Write-Ok "$Title erfolgreich." }
function Show-Evidence {
    param([string]$Root)
    $file=Join-Path $Root 'reports\database-recovery-drill-evidence.json'
    if(-not(Test-Path $file)){Write-WarnLine "R60 Evidence fehlt: $file"; return $null}
    $ev=Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
    Write-Section 'R60 Evidence-Zusammenfassung'
    Write-Host "Status:              $($ev.status)"
    Write-Host "Verified at:         $($ev.verified_at)"
    Write-Host "Source DB:           $($ev.source.host)/$($ev.source.database)"
    Write-Host "Recovery DB:         $($ev.target.host)/$($ev.target.database)"
    Write-Host "Restored tables:     $($ev.restored_user_tables)"
    Write-Host "Critical tables:     $($ev.critical_tables_verified.Count)"
    Write-Host "Schema:              $($ev.schema_version)"
    Write-Host "Invalid indexes:     $($ev.invalid_indexes)"
    Write-Host "Invalid constraints: $($ev.unvalidated_constraints)"
    Write-Host "Write probe:         $($ev.write_probe_ok)"
    Write-Host "Evidence:            $file"
    return $ev
}

try {
    Write-Section 'CFS ZOCKT - automatischer Windows Database Recovery Drill R60'
    foreach($cmd in @('git','node','npm.cmd')){if(-not(Test-CommandExists $cmd)){throw "Benötigtes Programm fehlt: $cmd"}}
    $ProjectRoot=Select-ProjectRoot; Update-CheckoutIfSafe $ProjectRoot; if($script:ProjectRoot){$ProjectRoot=$script:ProjectRoot}; Set-Location -LiteralPath $ProjectRoot
    Write-Section 'Verwendeter Projektstand'; Write-Host "Pfad:       $ProjectRoot"; Write-Host "Node:       $(& node --version)"; $commit=& git rev-parse HEAD 2>$null; if($LASTEXITCODE -eq 0){Write-Host "Git commit: $commit"}
    Add-PostgresClientTools
    Invoke-NpmStep 'npm ci' @('ci')
    Invoke-NpmStep 'R60 statisches Security Gate' @('run','security60:check')

    Write-Section 'Lokale Zugangsdaten für den echten Recovery-Drill'
    Write-Host 'Die Eingaben werden nicht angezeigt und nur für diesen PowerShell-Prozess gesetzt.'
    $source=Get-SecurePlainText 'DATABASE_URL' 'Production DATABASE_URL aus Render eingeben'
    $target=Get-SecurePlainText 'CFS_RESTORE_TARGET_URL' 'DATABASE_URL der separaten LEEREN Render-Recovery-DB eingeben'
    $key=Get-SecurePlainText 'CFS_BACKUP_ENCRYPTION_KEY' 'CFS_BACKUP_ENCRYPTION_KEY aus Render eingeben'
    Set-TempEnv 'DATABASE_URL' $source; Set-TempEnv 'CFS_RESTORE_TARGET_URL' $target; Set-TempEnv 'CFS_BACKUP_ENCRYPTION_KEY' $key

    Invoke-NpmStep 'R60 Preflight (kein Restore)' @('run','recovery:drill','--','--preflight')
    Write-Section 'Sicherheitsbestätigung'
    Write-Warning 'Der nächste Schritt schreibt ausschließlich in die zuvor geprüfte separate LEERE Recovery-Datenbank. Production wird nur gelesen/gedumpt.'
    $confirm=Read-Host 'Tippe exakt LIVE_RESTORE um den echten Restore zu starten'
    if($confirm -cne 'LIVE_RESTORE'){throw 'Echter Restore nicht bestätigt. Abbruch ohne Restore.'}
    Set-TempEnv 'CFS_RESTORE_CONFIRM' 'RESTORE_TO_EMPTY_DATABASE'

    Write-Section 'R60 echter Backup-/Restore-Drill'
    $npmCmd=(Get-Command 'npm.cmd' -CommandType Application -ErrorAction Stop).Source
    & $npmCmd run recovery:drill -- --live
    $code=$LASTEXITCODE
    $evidence=Show-Evidence $ProjectRoot
    if($code -eq 0 -and $null -ne $evidence -and $evidence.status -eq 'LIVE_RESTORE_PASS'){
        Write-Section 'Endergebnis'; Write-Host 'LIVE_RESTORE_PASS'; Write-Ok 'Punkt 2 / echter Backup-/Restore-Drill ist erfolgreich abgeschlossen.'; exit 0
    }
    throw "R60 hat keinen LIVE_RESTORE_PASS erzeugt. ExitCode=$code"
}
catch { Write-Host ''; Write-Host 'AUTOMATISCHER RECOVERY DRILL ABGEBROCHEN'; Write-Host $_.Exception.Message; if($_.InvocationInfo.ScriptLineNumber){Write-Host ("Fehlerort: {0}:{1}" -f $_.InvocationInfo.ScriptName,$_.InvocationInfo.ScriptLineNumber)}; exit 10 }
finally { Restore-TempEnv }
