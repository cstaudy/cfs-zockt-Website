[CmdletBinding()]
param(
    [ValidateSet('MENU','R59','R60','R61','R62','R63','R64','R65','R66','R67','CHECK')]
    [string]$Round = 'MENU',
    [string]$RepoUrl = 'https://github.com/cstaudy/cfs-zockt-Website.git',
    [switch]$NoUpdate
)
Set-StrictMode -Version 2.0
$ErrorActionPreference='Stop'
$script:OriginalEnv=@{}
$script:EvidenceStore=Join-Path $env:USERPROFILE 'Documents\cfs-zockt-production-evidence'
$script:EvidenceFiles=@(
 'reports\render-production-drill-r59.json',
 'reports\database-recovery-drill-evidence.json',
 'reports\account-mail-drill-evidence.json',
 'reports\account-auth-drill-evidence.json',
 'reports\production-monitor-drill-evidence.json',
 'reports\stripe-live-drill-evidence.json',
 'launcher\reports\windows-production-drill-evidence.json',
 'launcher\reports\live-soak-production-drill-evidence.json'
)
function Section([string]$t){Write-Host '';Write-Host ('='*78);Write-Host $t;Write-Host ('='*78)}
function Ok([string]$t){Write-Host "[PASS]  $t"} function Info([string]$t){Write-Host "[INFO]  $t"} function Warn([string]$t){Write-Warning $t}
function Has([string]$n){return $null-ne(Get-Command $n -ErrorAction SilentlyContinue)}
function ProjectOk([string]$p){if(-not(Test-Path $p -PathType Container)){return $false};foreach($r in @('package.json','package-lock.json','tools\render-production-drill-r59.mjs','tools\database-recovery-drill-r60.mjs','tools\account-mail-production-drill-r61.mjs','tools\account-auth-production-drill-r62.mjs','launcher\tools\windows-production-drill-r63.mjs','launcher\tools\live-soak-production-drill-r64.mjs','tools\production-monitor-drill-r65.mjs','tools\stripe-live-production-drill-r66.mjs','tools\launch-production-gate-r67.mjs','tools\windows-production-live-tests.ps1')){if(-not(Test-Path (Join-Path $p $r) -PathType Leaf)){return $false}};return $true}
function Desktop(){foreach($p in @((Join-Path $env:USERPROFILE 'OneDrive\Desktop'),(Join-Path $env:USERPROFILE 'Desktop'))){if(Test-Path $p){return $p}};return $env:USERPROFILE}
function FreshClone(){if(-not(Has 'git')){throw 'git fehlt.'};$dest=Join-Path (Desktop) 'cfs-zockt-production-final-tests';if(Test-Path $dest){if(ProjectOk $dest){return [string]$dest};$dest=Join-Path (Desktop) ('cfs-zockt-production-final-tests-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))};Info "Klone aktuellen GitHub-Stand nach $dest";& git clone --depth 1 $RepoUrl $dest | Out-Host;if($LASTEXITCODE-ne 0){throw "git clone fehlgeschlagen: $LASTEXITCODE"};if(-not(ProjectOk $dest)){throw 'GitHub-Stand enthält die R60-R67 Finalisierung noch nicht vollständig.'};return [string]$dest}
function FindRoot(){foreach($p in @((Split-Path -Parent $PSScriptRoot),(Get-Location).Path,(Join-Path (Desktop) 'cfs-zockt-production-final-tests'),(Join-Path (Desktop) 'cfs-zockt-production-test'))){if(ProjectOk $p){return [string]$p}};return [string](FreshClone)}
function UpdateRoot([string]$p){if($NoUpdate -or -not(Test-Path (Join-Path $p '.git'))){return [string]$p};Push-Location $p;try{$dirty=@(& git status --porcelain);if($dirty.Count-eq 0){& git pull --ff-only | Out-Host;if($LASTEXITCODE-ne 0){throw 'git pull fehlgeschlagen.'};return [string]$p}else{Warn 'Checkout hat lokale Änderungen; verwende für die Tests einen frischen GitHub-Checkout.'}}finally{Pop-Location};return [string](FreshClone)}
function SetEnv([string]$n,[string]$v){if(-not$script:OriginalEnv.ContainsKey($n)){$script:OriginalEnv[$n]=[Environment]::GetEnvironmentVariable($n,'Process')};[Environment]::SetEnvironmentVariable($n,$v,'Process')}
function RestoreEnv(){foreach($n in $script:OriginalEnv.Keys){[Environment]::SetEnvironmentVariable($n,$script:OriginalEnv[$n],'Process')}}
function Secret([string]$n,[string]$prompt){$v=[Environment]::GetEnvironmentVariable($n,'Process');if(-not[string]::IsNullOrWhiteSpace($v)){Info "$n bereits lokal gesetzt; Wert wird nicht angezeigt.";return $v};$s=Read-Host $prompt -AsSecureString;$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{return[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
function TextValue([string]$n,[string]$prompt,[string]$default=''){$v=[Environment]::GetEnvironmentVariable($n,'Process');if(-not[string]::IsNullOrWhiteSpace($v)){return $v};$label=$prompt;if($default){$label="$prompt [$default]"};$r=Read-Host $label;if([string]::IsNullOrWhiteSpace($r)){return $default};return $r}
function NeedPass([string]$prompt){$r=Read-Host "$prompt - tippe exakt PASS";return $r -ceq 'PASS'}
function PassText([string]$prompt){if(NeedPass $prompt){return 'true'};return 'false'}
function Invoke-NpmCommand([string]$title,[string[]]$npmArgs){Section $title;$npmCmd=(Get-Command 'npm.cmd' -CommandType Application -ErrorAction Stop).Source;& $npmCmd @npmArgs;if($LASTEXITCODE-ne 0){throw "$title fehlgeschlagen (ExitCode=$LASTEXITCODE)"};Ok $title}
function NodeStep([string]$title,[string[]]$nodeArgs){Section $title;& node @nodeArgs;if($LASTEXITCODE-ne 0){throw "$title fehlgeschlagen (ExitCode=$LASTEXITCODE)"};Ok $title}
function EvidenceDest([string]$rel){return Join-Path $script:EvidenceStore ($rel -replace '[\\/]','__')}
function SyncIn([string]$root){New-Item -ItemType Directory -Force -Path $script:EvidenceStore|Out-Null;foreach($rel in $script:EvidenceFiles){$src=EvidenceDest $rel;$dst=Join-Path $root $rel;if(Test-Path $src){New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst)|Out-Null;Copy-Item $src $dst -Force}}}
function Harvest([string]$root){New-Item -ItemType Directory -Force -Path $script:EvidenceStore|Out-Null;foreach($rel in $script:EvidenceFiles){$f=Join-Path $root $rel;if(Test-Path $f){Copy-Item $f (EvidenceDest $rel) -Force}}
  $desk=Desktop;$dirs=Get-ChildItem -LiteralPath $desk -Directory -ErrorAction SilentlyContinue|Where-Object{$_.Name -like 'cfs-zockt*'};foreach($rel in $script:EvidenceFiles){$best=$null;foreach($d in $dirs){$f=Join-Path $d.FullName $rel;if(Test-Path $f){$x=Get-Item $f;if($null-eq$best-or$x.LastWriteTimeUtc-gt$best.LastWriteTimeUtc){$best=$x}}};if($null-ne$best){Copy-Item $best.FullName (EvidenceDest $rel) -Force}}
}
function ShowEvidence(){Section 'Gesammelte Production-Evidence';foreach($rel in $script:EvidenceFiles){$f=EvidenceDest $rel;if(Test-Path $f){try{$j=Get-Content $f -Raw|ConvertFrom-Json;Write-Host ("PASS/FOUND  {0,-56} {1}" -f $rel,[string]$j.status)}catch{Write-Host ("FOUND       {0}" -f $rel)}}else{Write-Host ("OPEN        {0}" -f $rel)}};Write-Host "Evidence Store: $script:EvidenceStore"}
function R59([string]$root){Invoke-NpmCommand 'R59 Security Gate' @('run','security59:check');Invoke-NpmCommand 'R59 echter Production LIVE Drill' @('run','render:drill','--','--external-only','--live','--target','https://cfs-zockt.de');Harvest $root;Ok 'R59 LIVE_PASS'}
function R60([string]$root){Section 'R60 Backup / Restore LIVE';& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tools\windows-recovery-drill-r60.ps1');if($LASTEXITCODE-ne 0){throw "R60 BLOCKED/FAIL ($LASTEXITCODE)"};Harvest $root;Ok 'R60 LIVE_RESTORE_PASS'}
function R61([string]$root){SetEnv 'CFS_ACCOUNT_MAIL_MODE' 'webhook';SetEnv 'CFS_ACCOUNT_MAIL_WEBHOOK_URL' (TextValue 'CFS_ACCOUNT_MAIL_WEBHOOK_URL' 'Production Mail-Webhook HTTPS URL');SetEnv 'CFS_ACCOUNT_MAIL_WEBHOOK_SECRET' (Secret 'CFS_ACCOUNT_MAIL_WEBHOOK_SECRET' 'Production Mail-Webhook Secret');$to=TextValue 'CFS_MAIL_DRILL_RECIPIENT' 'Test-Postfach E-Mail';Invoke-NpmCommand 'R61 Security Gate' @('run','security61:check');NodeStep 'R61 Testmails senden' @('tools/account-mail-production-drill-r61.mjs','.','--prepare','--to',$to);Section 'R61 Inbox';Write-Host 'Öffne das Testpostfach. Es müssen drei R61-Mails angekommen sein.';$a=Read-Host 'Code aus email_verification';$b=Read-Host 'Code aus password_reset';$c=Read-Host 'Code aus security_alert';NodeStep 'R61 Inbox verifizieren' @('tools/account-mail-production-drill-r61.mjs','.','--verify','--codes',"$a,$b,$c");Harvest $root}
function R62([string]$root){SetEnv 'DATABASE_URL' (Secret 'DATABASE_URL' 'Production DATABASE_URL');SetEnv 'CFS_ACCOUNT_ELEVATION_SECRET' (Secret 'CFS_ACCOUNT_ELEVATION_SECRET' 'Production CFS_ACCOUNT_ELEVATION_SECRET');SetEnv 'APP_BASE_URL' 'https://cfs-zockt.de';$email=TextValue 'CFS_AUTH_DRILL_EMAIL' 'Production Testkonto E-Mail';Invoke-NpmCommand 'R62 Security Gate' @('run','security62:check');NodeStep 'R62 vorbereiten' @('tools/account-auth-production-drill-r62.mjs','.','--prepare','--email',$email,'--target','https://cfs-zockt.de');Start-Process 'https://cfs-zockt.de';Section 'R62 echter Browser-Test';Write-Host 'Führe die 7 Schritte aus, die der R62-Runner gerade ausgegeben hat. PostgreSQL wird sie anschließend unabhängig prüfen.';[void](Read-Host 'Drücke ENTER erst wenn alle echten Browser-Schritte abgeschlossen sind');NodeStep 'R62 Production Events verifizieren' @('tools/account-auth-production-drill-r62.mjs','.','--verify','--target','https://cfs-zockt.de');Harvest $root}
function R63([string]$root){Invoke-NpmCommand 'R63 Security Gate' @('run','security63:check');$artifact=TextValue 'CFS_WINDOWS_DRILL_ARTIFACT' 'Pfad zur signierten Release-EXE/Setup-Datei';$thumb=TextValue 'CFS_WINDOWS_SIGNER_THUMBPRINT' 'Erwarteter Code-Signing Zertifikat-Thumbprint';Section 'R63 reale Windows-Schritte';Write-Host 'Führe Clean Install, Launcher-Start, echten Device-Link und Updater-E2E mit diesem Release durch.';SetEnv 'CFS_WINDOWS_CLEAN_INSTALL_VERIFIED' (PassText 'Clean Install auf diesem Windows erfolgreich');SetEnv 'CFS_WINDOWS_LAUNCH_VERIFIED' (PassText 'Installierter Launcher startet erfolgreich');SetEnv 'CFS_WINDOWS_DEVICE_LINK_VERIFIED' (PassText 'Echter Device-Link gegen Production funktioniert');SetEnv 'CFS_WINDOWS_UPDATER_VERIFIED' (PassText 'Updater-E2E für signierten Release funktioniert');NodeStep 'R63 Windows/Signing/Hardware Drill' @('launcher/tools/windows-production-drill-r63.mjs','launcher','--artifact',$artifact,'--signer-thumbprint',$thumb);Harvest $root}
function R64([string]$root){Invoke-NpmCommand 'R64 Security Gate' @('run','security64:check');Section 'R64 2h OBS/LIVE Soak';Write-Host 'Starte jetzt OBS + echten LIVE-Provider + Launcher/Stream Studio in der zu prüfenden Konfiguration.';if(-not(NeedPass 'OBS und LIVE sind jetzt wirklich verbunden und bereit')){throw 'R64 nicht gestartet.'};NodeStep 'R64 Soak starten' @('launcher/tools/live-soak-production-drill-r64.mjs','launcher','--start');for($i=1;$i-le 120;$i++){Start-Sleep -Seconds 60;& node 'launcher/tools/live-soak-production-drill-r64.mjs' 'launcher' '--heartbeat'|Out-Host;if($LASTEXITCODE-ne 0){throw 'R64 Heartbeat fehlgeschlagen.'};Write-Host ("R64: {0}/120 Minuten" -f $i)};SetEnv 'CFS_SOAK_FATAL_ERRORS' '0';SetEnv 'CFS_SOAK_OBS_OK' (PassText 'OBS war am Ende verbunden');SetEnv 'CFS_SOAK_PROVIDER_OK' (PassText 'LIVE-Provider war am Ende verbunden');SetEnv 'CFS_SOAK_VISIBLE_OK' (PassText 'Während der 2h gab es keinen sichtbaren fatalen Fehler/Crash');NodeStep 'R64 Soak abschließen' @('launcher/tools/live-soak-production-drill-r64.mjs','launcher','--finish');Harvest $root}
function R65([string]$root){SetEnv 'CFS_MONITOR_MODE' 'webhook';SetEnv 'CFS_MONITOR_REQUIRED' 'true';SetEnv 'CFS_MONITOR_ALERT_WEBHOOK_URL' (TextValue 'CFS_MONITOR_ALERT_WEBHOOK_URL' 'Externer Monitoring-Webhook HTTPS URL');SetEnv 'CFS_MONITOR_ALERT_WEBHOOK_SECRET' (Secret 'CFS_MONITOR_ALERT_WEBHOOK_SECRET' 'Monitoring Webhook Secret');Invoke-NpmCommand 'R65 Security Gate' @('run','security65:check');NodeStep 'R65 Alert senden' @('tools/production-monitor-drill-r65.mjs','.','--prepare');$code=Read-Host 'Code aus dem EXTERNEN Alert-Ziel';NodeStep 'R65 externe Alert-Zustellung verifizieren' @('tools/production-monitor-drill-r65.mjs','.','--verify','--code',$code);Harvest $root}
function R66([string]$root){SetEnv 'DATABASE_URL' (Secret 'DATABASE_URL' 'Production DATABASE_URL');SetEnv 'APP_BASE_URL' 'https://cfs-zockt.de';SetEnv 'CFS_RELEASE_EVIDENCE_VERSION' '0.42.0';SetEnv 'CFS_STRIPE_SECRET_KEY' (Secret 'CFS_STRIPE_SECRET_KEY' 'Stripe sk_live_ Secret Key');SetEnv 'CFS_STRIPE_WEBHOOK_SECRET' (Secret 'CFS_STRIPE_WEBHOOK_SECRET' 'Stripe whsec_ Webhook Secret');SetEnv 'CFS_STRIPE_PRICE_CREATOR_MONTHLY' (TextValue 'CFS_STRIPE_PRICE_CREATOR_MONTHLY' 'LIVE Creator Price ID');SetEnv 'CFS_STRIPE_PRICE_PRO_MONTHLY' (TextValue 'CFS_STRIPE_PRICE_PRO_MONTHLY' 'LIVE Pro Price ID');$email=TextValue 'CFS_STRIPE_DRILL_EMAIL' 'Production Stripe-Testkonto E-Mail';Invoke-NpmCommand 'R66 Security Gate' @('run','security66:check');NodeStep 'R66 LIVE Preflight' @('tools/stripe-live-production-drill-r66.mjs','.','--prepare','--email',$email);Section 'R66 MANUELLE Finanzaktion';Write-Warning 'Der Runner führt absichtlich keine Zahlung aus. Führe den LIVE-Checkout selbst durch und danach cancel_at_period_end EIN und wieder AUS. Es können echte Kosten entstehen.';Start-Process 'https://cfs-zockt.de';[void](Read-Host 'ENTER nachdem Checkout, invoice.paid und der manuelle Cancel-Toggle vollständig verarbeitet wurden');NodeStep 'R66 LIVE Events/Subscription verifizieren' @('tools/stripe-live-production-drill-r66.mjs','.','--verify');Harvest $root}
function R67([string]$root){
    Harvest $root
    SyncIn $root
    Invoke-NpmCommand 'R67 Security Gate' @('run','security67:check')
    Section 'R67 lokale Evidence-Ingest-Vorbereitung'
    $required=@(
        'reports\database-recovery-drill-evidence.json',
        'reports\account-mail-drill-evidence.json',
        'reports\account-auth-drill-evidence.json',
        'launcher\reports\windows-production-drill-evidence.json',
        'launcher\reports\live-soak-production-drill-evidence.json',
        'reports\production-monitor-drill-evidence.json',
        'reports\stripe-live-drill-evidence.json'
    )
    $missing=@($required|Where-Object{-not(Test-Path (Join-Path $root $_))})
    if($missing.Count -gt 0){throw ('R67 benötigt zuerst echte R60-R66 Evidence. Offen: '+($missing -join ', '))}
    SetEnv 'NODE_ENV' 'production'
    SetEnv 'APP_BASE_URL' 'https://cfs-zockt.de'
    SetEnv 'CFS_RELEASE_EVIDENCE_VERSION' '0.42.0'
    SetEnv 'CFS_BILLING_LIVE_REQUIRED' 'true'
    SetEnv 'DATABASE_URL' (Secret 'DATABASE_URL' 'Production DATABASE_URL')
    SetEnv 'CFS_ADMIN_AUDIT_HMAC_SECRET' (Secret 'CFS_ADMIN_AUDIT_HMAC_SECRET' 'Production CFS_ADMIN_AUDIT_HMAC_SECRET')
    SetEnv 'CFS_BACKUP_ENCRYPTION_KEY' (Secret 'CFS_BACKUP_ENCRYPTION_KEY' 'Production CFS_BACKUP_ENCRYPTION_KEY')
    SetEnv 'CFS_ACCOUNT_MAIL_WEBHOOK_SECRET' (Secret 'CFS_ACCOUNT_MAIL_WEBHOOK_SECRET' 'Production CFS_ACCOUNT_MAIL_WEBHOOK_SECRET')
    SetEnv 'CFS_ACCOUNT_ELEVATION_SECRET' (Secret 'CFS_ACCOUNT_ELEVATION_SECRET' 'Production CFS_ACCOUNT_ELEVATION_SECRET')
    SetEnv 'CFS_MONITOR_MODE' 'webhook'
    SetEnv 'CFS_MONITOR_REQUIRED' 'true'
    SetEnv 'CFS_MONITOR_ALERT_WEBHOOK_URL' (TextValue 'CFS_MONITOR_ALERT_WEBHOOK_URL' 'Production Monitoring Webhook URL')
    SetEnv 'CFS_MONITOR_ALERT_WEBHOOK_SECRET' (Secret 'CFS_MONITOR_ALERT_WEBHOOK_SECRET' 'Production Monitoring Webhook Secret')
    SetEnv 'CFS_STRIPE_WEBHOOK_SECRET' (Secret 'CFS_STRIPE_WEBHOOK_SECRET' 'Production Stripe Webhook Secret')
    $nodeArgs=@('tools/launch-production-gate-r67.mjs','.')
    foreach($rel in $required){$nodeArgs+=@('--import',(Join-Path $root $rel))}
    & node @nodeArgs
    $code=$LASTEXITCODE
    if($code -eq 2){throw 'R67 Evidence-Import wurde wegen ungültiger/manipulierter Evidence blockiert.'}
    if($code -ne 0 -and $code -ne 3){throw "R67 Evidence-Import unerwartet fehlgeschlagen (ExitCode=$code)."}
    Ok 'R60-R66 Evidence kryptografisch geprüft und in Production-DB für R67 hinterlegt.'
    Section 'R67 letzter echter Render-Test'
    Write-Host 'Jetzt in der Render Shell des Production Web Service exakt diese zwei Befehle ausführen:'
    Write-Host ''
    Write-Host 'npm run render:drill -- --strict-env --live --target https://cfs-zockt.de'
    Write-Host 'npm run launch:gate -- --collect-defaults --verify'
    Write-Host ''
    Write-Host 'Ziel: Launch Production Gate R67: LIVE_LAUNCH_PASS'
    Write-Host 'Der lokale Schritt behauptet bewusst noch keinen LIVE_LAUNCH_PASS.'
}
function Check([string]$root){foreach($n in 59..67){$s="security$n`:check";Invoke-NpmCommand "R$n statisches Gate" @('run',$s)};Ok 'R59-R67 statische Gates vollständig.'}
try{foreach($cmd in @('git','node','npm.cmd')){if(-not(Has $cmd)){throw "Benötigtes Programm fehlt: $cmd"}};$root=[string](FindRoot);$root=[string](UpdateRoot $root);Set-Location -LiteralPath $root;Harvest $root;SyncIn $root;Section 'CFS ZOCKT Production LIVE Tests R59-R67';Write-Host "Repo: $root";Write-Host "Node: $(& node --version)";Invoke-NpmCommand 'npm ci' @('ci');if($Round-eq'MENU'){ShowEvidence;Write-Host '';Write-Host 'R59 Render | R60 Recovery | R61 Mail | R62 Passkey/MFA | R63 Windows | R64 2h OBS/LIVE | R65 Monitoring | R66 Stripe LIVE | R67 Launch Gate | CHECK';$Round=(Read-Host 'Welche Runde starten?').Trim().ToUpperInvariant()};switch($Round){'R59'{R59 $root};'R60'{R60 $root};'R61'{R61 $root};'R62'{R62 $root};'R63'{R63 $root};'R64'{R64 $root};'R65'{R65 $root};'R66'{R66 $root};'R67'{R67 $root};'CHECK'{Check $root};default{throw "Unbekannte Runde: $Round"}};Harvest $root;ShowEvidence;exit 0}catch{Write-Host '';Write-Host 'BLOCKED / FAIL';Write-Host $_.Exception.Message;exit 10}finally{RestoreEnv}
