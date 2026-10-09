#requires -Version 5.1
# Lokales Windows-Startcenter, keine Admin-Credentials oder Bridge-Secrets enthalten.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$script:root = Split-Path -Parent $PSCommandPath
$script:cfgdir = Join-Path $env:LOCALAPPDATA 'cfs_zockt\Admin-PC'
$script:cfgfile = Join-Path $script:cfgdir 'ai-root.txt'
$script:dark = [System.Drawing.Color]::FromArgb(3,12,25)
$script:panelBg = [System.Drawing.Color]::FromArgb(7,27,48)
$script:cardBg = [System.Drawing.Color]::FromArgb(10,36,60)
$script:line = [System.Drawing.Color]::FromArgb(25,94,146)
$script:blue = [System.Drawing.Color]::FromArgb(19,138,243)
$script:cyan = [System.Drawing.Color]::FromArgb(34,204,247)
$script:white = [System.Drawing.Color]::FromArgb(230,244,255)
$script:muted = [System.Drawing.Color]::FromArgb(151,180,205)
$script:green = [System.Drawing.Color]::FromArgb(69,220,155)

function New-Font([single]$size, [bool]$bold=$false) {
    $style=if($bold){[System.Drawing.FontStyle]::Bold}else{[System.Drawing.FontStyle]::Regular}
    return New-Object System.Drawing.Font('Segoe UI',$size,$style)
}
function Add-Text($parent, [string]$text, [int]$x, [int]$y, [int]$w, [int]$h, [single]$size=11, $color=$script:white, [bool]$bold=$false) {
    $label=New-Object System.Windows.Forms.Label
    $label.Text=$text;$label.Location=New-Object System.Drawing.Point($x,$y)
    $label.Size=New-Object System.Drawing.Size($w,$h)
    $label.ForeColor=$color;$label.BackColor=[System.Drawing.Color]::Transparent
    $label.Font=New-Font $size $bold
    $parent.Controls.Add($label)
    return $label
}
function Add-Panel($parent,[int]$x,[int]$y,[int]$w,[int]$h) {
    $p=New-Object System.Windows.Forms.Panel
    $p.Location=New-Object System.Drawing.Point($x,$y);$p.Size=New-Object System.Drawing.Size($w,$h)
    $p.BackColor=$script:panelBg;$p.BorderStyle='FixedSingle'
    $parent.Controls.Add($p)
    return $p
}
function Add-Button($parent,[string]$text,[int]$x,[int]$y,[int]$w,[int]$h,[scriptblock]$action,[bool]$primary=$false) {
    $b=New-Object System.Windows.Forms.Button
    $b.Text=$text;$b.Location=New-Object System.Drawing.Point($x,$y);$b.Size=New-Object System.Drawing.Size($w,$h)
    $b.FlatStyle='Flat';$b.FlatAppearance.BorderSize=1
    $b.FlatAppearance.BorderColor=$script:line;$b.FlatAppearance.MouseOverBackColor=[System.Drawing.Color]::FromArgb(22,94,149)
    $b.BackColor=if($primary){$script:blue}else{$script:cardBg}
    $b.ForeColor=$script:white;$b.Font=New-Font 10 $true
    $b.Cursor=[System.Windows.Forms.Cursors]::Hand
    $b.Add_Click($action)
    $parent.Controls.Add($b)
    return $b
}
function Open-FixedUrl([string]$url) {
    $allowed = @(
      'https://cfs-zockt.de/pages/admin.html',
      'https://cfs-zockt.de/pages/admin-creators.html',
      'https://cfs-zockt.de/pages/admin-creators.html#adminFinancePanel',
      'https://cfs-zockt.de/pages/cfs-ai.html',
      'http://127.0.0.1:8000/',
      'http://127.0.0.1:8000/design-factory'
    )
    if($allowed -cnotcontains $url){throw 'Diese Zieladresse ist nicht freigegeben.'}
    Start-Process -FilePath $url | Out-Null
}
function Find-AiRoot {
    $candidates=New-Object 'System.Collections.Generic.List[string]'
    if(Test-Path -LiteralPath $script:cfgfile -PathType Leaf){
        $candidates.Add(([string](Get-Content -LiteralPath $script:cfgfile -Raw)).Trim().Trim([char]0xFEFF))
    }
    if($env:CFS_AI_LOCAL_SERVICE_ROOT){$candidates.Add($env:CFS_AI_LOCAL_SERVICE_ROOT)}
    $userHome=[Environment]::GetFolderPath('UserProfile')
    $desktop=[Environment]::GetFolderPath('Desktop')
    $candidates.Add((Join-Path $desktop 'CFS_AI_LOCAL_SERVICE_v20'))
    $candidates.Add((Join-Path $userHome 'OneDrive\Desktop\CFS_AI_LOCAL_SERVICE_v20'))
    foreach($c in $candidates){if(Test-AiRoot $c){return $c}}
    return $null
}
function Test-AiRoot([string]$p){
    if([string]::IsNullOrWhiteSpace($p)){return $false}
    if($p -match '["\r\n&|<>^%!]'){return $false}
    if(-not (Test-Path -LiteralPath (Join-Path $p 'app\main.py') -PathType Leaf)){return $false}
    return (Test-Path -LiteralPath (Join-Path $p 'start_headless_windows.bat') -PathType Leaf) -or
           (Test-Path -LiteralPath (Join-Path $p 'start_windows.bat') -PathType Leaf)
}
function Set-AiRoot {
    $picker=New-Object System.Windows.Forms.FolderBrowserDialog
    $picker.Description='CFS AI Dienstordner waehlen (mit app\main.py und start_windows.bat)'
    $picker.ShowNewFolderButton=$false
    if($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK){return}
    if(-not (Test-AiRoot $picker.SelectedPath)){
        [System.Windows.Forms.MessageBox]::Show('Das ist kein erkannter CFS-AI-v20-Dienstordner.','Ordner nicht passend','OK','Warning') | Out-Null
        return
    }
    New-Item -ItemType Directory -Path $script:cfgdir -Force | Out-Null
    [System.IO.File]::WriteAllText($script:cfgfile,$picker.SelectedPath,(New-Object System.Text.UTF8Encoding($false)))
    $script:aiRootLabel.Text='CFS AI Ordner: ' + $picker.SelectedPath
    Refresh-LocalStatus
}
function Test-LocalHttp([string]$url){
    try{
        $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return ([int]$r.StatusCode -ge 200 -and [int]$r.StatusCode -lt 300)
    } catch {
        if($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(401,403)){return $true}
        return $false
    }
}
function Refresh-LocalStatus {
    $ai=Test-LocalHttp 'http://127.0.0.1:8000/api/status'
    $ollama=Test-LocalHttp 'http://127.0.0.1:11434/api/tags'
    $script:aiStatus.Text='CFS AI: ' + $(if($ai){'ERREICHBAR'}else{'NICHT ERREICHBAR'})
    $script:aiStatus.ForeColor=$(if($ai){$script:green}else{$script:muted})
    $script:ollamaStatus.Text='Ollama: ' + $(if($ollama){'ERREICHBAR'}else{'NICHT ERREICHBAR'})
    $script:ollamaStatus.ForeColor=$(if($ollama){$script:green}else{$script:muted})
    $root=Find-AiRoot
    $script:aiRootLabel.Text='CFS AI Ordner: ' + $(if($root){$root}else{'nicht eingerichtet'})
}
function Start-Ai {
    if(Test-LocalHttp 'http://127.0.0.1:8000/api/status'){
        [System.Windows.Forms.MessageBox]::Show('CFS AI antwortet bereits lokal.','CFS AI') | Out-Null
        return
    }
    $root=Find-AiRoot
    if(-not $root){Set-AiRoot;$root=Find-AiRoot}
    if(-not $root){return}
    $venv=Join-Path $root '.venv\Scripts\python.exe'
    if(-not (Test-Path -LiteralPath $venv -PathType Leaf)){
        [System.Windows.Forms.MessageBox]::Show('Die Python-Umgebung fehlt. Bitte zuerst setup_windows.bat im lokalen CFS-AI-Ordner ausfuehren.','CFS AI Setup','OK','Warning') | Out-Null
        return
    }
    $start=Join-Path $root 'start_headless_windows.bat'
    if(-not (Test-Path -LiteralPath $start -PathType Leaf)){$start=Join-Path $root 'start_windows.bat'}
    Start-Process -FilePath $start -WorkingDirectory $root | Out-Null
    [System.Windows.Forms.MessageBox]::Show('CFS AI wurde gestartet. Warte kurz und klicke danach auf STATUS PRUEFEN.','CFS AI') | Out-Null
}
function Open-AiMonitor {
    $path=Join-Path $script:root 'CFS-AI-MONITOR.ps1'
    if(-not (Test-Path -LiteralPath $path -PathType Leaf)) {throw 'Bitte die aktuelle Admin-PC-Version installieren.'}
    $powershell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    Start-Process -FilePath $powershell -ArgumentList ('-NoProfile -STA -ExecutionPolicy Bypass -File "' + $path + '"') -WorkingDirectory $script:root | Out-Null
}
function Open-PaymentPlan {
    $path=Join-Path $script:root 'ZAHLUNGSPLAN-UND-WETTBEWERB.txt'
    if(-not (Test-Path -LiteralPath $path -PathType Leaf)) {throw 'Der Zahlungsplan ist nicht installiert.'}
    Start-Process -FilePath 'notepad.exe' -ArgumentList ('"' + $path + '"') | Out-Null
}
function Safe-Click([scriptblock]$callback){
    try{& $callback} catch{
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'cfs_zockt Admin PC','OK','Error') | Out-Null
    }
}

$form=New-Object System.Windows.Forms.Form
$form.Text='cfs_zockt  |  Admin Control Center PC'
$form.Size=New-Object System.Drawing.Size(1040,740)
$form.MinimumSize=New-Object System.Drawing.Size(1040,740)
$form.MaximumSize=New-Object System.Drawing.Size(1040,740)
$form.StartPosition='CenterScreen'
$form.BackColor=$script:dark
$form.ForeColor=$script:white
$form.FormBorderStyle='FixedSingle'
$form.MaximizeBox=$false
$form.Font=New-Font 10
$ico=Join-Path $script:root 'cfs-admin.ico'
if(Test-Path -LiteralPath $ico){$form.Icon=New-Object System.Drawing.Icon($ico)}

$header=Add-Panel $form 20 18 982 146
$logo=Join-Path $script:root 'cfs-zockt-logo.png'
if(Test-Path -LiteralPath $logo){
    $pic=New-Object System.Windows.Forms.PictureBox
    $pic.Location=New-Object System.Drawing.Point(20,7)
    $pic.Size=New-Object System.Drawing.Size(460,100)
    $pic.SizeMode='Zoom'
    $pic.Image=[System.Drawing.Image]::FromFile($logo)
    $header.Controls.Add($pic)
}
$null=Add-Text $header 'cfs_zockt   /   ADMIN PC' 525 28 430 34 18 $script:white $true
$null=Add-Text $header 'Deine private Verwaltungszentrale auf deinem Windows-PC.' 525 70 430 38 10 $script:muted
$null=Add-Text $form '01   WEBSITE & ADMIN' 24 181 460 32 14 $script:cyan $true
$left=Add-Panel $form 20 222 478 277
$null=Add-Text $left 'Deine Website sicher verwalten' 20 17 440 34 15 $script:white $true
$null=Add-Text $left 'Die echten Admin-Berechtigungen prueft weiterhin der Website-Server.' 20 57 437 35 9 $script:muted
$null=Add-Button $left 'ADMIN CONTROL CENTER' 20 109 435 43 {Safe-Click {Open-FixedUrl 'https://cfs-zockt.de/pages/admin.html'}} $true
$null=Add-Button $left 'CREATOR VERWALTUNG' 20 163 210 40 {Safe-Click {Open-FixedUrl 'https://cfs-zockt.de/pages/admin-creators.html'}}
$null=Add-Button $left 'FINANZEN & ABOS' 245 163 210 40 {Safe-Click {Open-FixedUrl 'https://cfs-zockt.de/pages/admin-creators.html#adminFinancePanel'}}
$null=Add-Button $left 'CFS AI (WEBSITE)' 20 217 435 37 {Safe-Click {Open-FixedUrl 'https://cfs-zockt.de/pages/cfs-ai.html'}}

$null=Add-Text $form '02   LOKALE CFS AI' 526 181 450 32 14 $script:cyan $true
$right=Add-Panel $form 522 222 480 277
$null=Add-Text $right 'Lokaler Service & Design Factory' 20 17 440 34 15 $script:white $true
$script:aiStatus=Add-Text $right 'CFS AI: pruefen ...' 20 62 208 27 11 $script:muted $true
$script:ollamaStatus=Add-Text $right 'Ollama: pruefen ...' 232 62 225 27 11 $script:muted $true
$null=Add-Button $right 'CFS AI STARTEN' 20 110 210 40 {Safe-Click {Start-Ai}} $true
$null=Add-Button $right 'ORDNER AUSWAEHLEN' 245 110 210 40 {Safe-Click {Set-AiRoot}}
$null=Add-Button $right 'DESIGN FACTORY' 20 163 210 40 {Safe-Click {Open-FixedUrl 'http://127.0.0.1:8000/design-factory'}}
$null=Add-Button $right 'CFS AI OBERFLAECHE' 245 163 210 40 {Safe-Click {Open-FixedUrl 'http://127.0.0.1:8000/'}}
$null=Add-Button $right 'STATUS PRUEFEN' 20 217 210 37 {Safe-Click {Refresh-LocalStatus}}
$null=Add-Button $right 'KI-AUFGABEN & BRIDGE' 245 217 210 37 {Safe-Click {Open-AiMonitor}}

$bottom=Add-Panel $form 20 520 982 150
$null=Add-Text $bottom '03   SICHERHEIT & BETA-STAND' 18 14 930 30 12 $script:cyan $true
$null=Add-Text $bottom 'Nur lokal installiert: keine Tokens und keine Passwoerter in dieser PC-App.' 18 49 938 25 11 $script:white
$null=Add-Text $bottom 'Website-Admin: Anmeldung + serverseitige Admin-E-Mail-Freigabe notwendig.' 18 76 938 25 10 $script:muted
$null=Add-Text $bottom 'Beta: HOLD / Keine Live-Zahlungen fuer Designpakete.' 18 102 638 25 10 $script:muted
$null=Add-Button $bottom 'ZAHLUNGSPLAN ANSEHEN' 683 96 275 39 {Safe-Click {Open-PaymentPlan}}
$script:aiRootLabel=Add-Text $form 'CFS AI Ordner: nicht eingerichtet' 26 679 966 22 9 $script:muted
$form.Add_Shown({Safe-Click {Refresh-LocalStatus}})
[void]$form.ShowDialog()
if($pic -and $pic.Image){$pic.Image.Dispose()}
$form.Dispose()
