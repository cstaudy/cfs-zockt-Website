#requires -Version 5.1
# Lokales, nur lesendes KI-Monitor-Fenster. Keine Bridge-Tokens, keine Cloud-Anmeldung.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$script:base='http://127.0.0.1:8000'
$script:nav=@('/api/status','/api/design-factory/status','/api/design-factory/drafts','/api/autonomous/status','/api/autonomous/runs','/api/agent/proposals')
$script:bg=[System.Drawing.Color]::FromArgb(3,12,25)
$script:card=[System.Drawing.Color]::FromArgb(8,30,52)
$script:ink=[System.Drawing.Color]::FromArgb(234,246,255)
$script:muted=[System.Drawing.Color]::FromArgb(153,185,212)
$script:blue=[System.Drawing.Color]::FromArgb(19,138,243)
$script:cyan=[System.Drawing.Color]::FromArgb(34,204,247)
$script:green=[System.Drawing.Color]::FromArgb(69,220,155)
$script:warn=[System.Drawing.Color]::FromArgb(246,187,88)

function Font([single]$size,[bool]$bold=$false) {
    $style=if($bold){[System.Drawing.FontStyle]::Bold}else{[System.Drawing.FontStyle]::Regular}
    New-Object System.Drawing.Font('Segoe UI',$size,$style)
}
function Text($parent,[string]$value,[int]$x,[int]$y,[int]$w,[int]$h,[single]$size=10,$color=$script:ink,[bool]$bold=$false) {
    $l=New-Object System.Windows.Forms.Label
    $l.Text=$value
    $l.Location=New-Object System.Drawing.Point($x,$y)
    $l.Size=New-Object System.Drawing.Size($w,$h)
    $l.ForeColor=$color
    $l.BackColor=[System.Drawing.Color]::Transparent
    $l.Font=Font $size $bold
    $parent.Controls.Add($l)
    return $l
}
function Box($parent,[int]$x,[int]$y,[int]$w,[int]$h) {
    $p=New-Object System.Windows.Forms.Panel
    $p.Location=New-Object System.Drawing.Point($x,$y)
    $p.Size=New-Object System.Drawing.Size($w,$h)
    $p.BackColor=$script:card
    $p.BorderStyle='FixedSingle'
    $parent.Controls.Add($p)
    return $p
}
function Button($parent,[string]$name,[int]$x,[int]$y,[int]$w,[int]$h,[scriptblock]$onClick) {
    $b=New-Object System.Windows.Forms.Button
    $b.Text=$name
    $b.Location=New-Object System.Drawing.Point($x,$y)
    $b.Size=New-Object System.Drawing.Size($w,$h)
    $b.BackColor=$script:blue
    $b.ForeColor=$script:ink
    $b.FlatStyle='Flat'
    $b.FlatAppearance.BorderSize=0
    $b.Font=Font 10 $true
    $b.Add_Click($onClick)
    $parent.Controls.Add($b)
    return $b
}
function OutputBox($parent,[int]$x,[int]$y,[int]$w,[int]$h) {
    $t=New-Object System.Windows.Forms.TextBox
    $t.Location=New-Object System.Drawing.Point($x,$y)
    $t.Size=New-Object System.Drawing.Size($w,$h)
    $t.Multiline=$true
    $t.ReadOnly=$true
    $t.ScrollBars='Vertical'
    $t.BorderStyle='FixedSingle'
    $t.BackColor=$script:card
    $t.ForeColor=$script:ink
    $t.Font=Font 10
    $parent.Controls.Add($t)
    return $t
}
function SafePart($value,[int]$max=145) {
    if($null -eq $value){return '-'}
    $s=([string]$value) -replace '[\r\n\t]+',' '
    if($s.Length -gt $max){return $s.Substring(0,$max) + ' ...'}
    if([string]::IsNullOrWhiteSpace($s)){return '-'}
    return $s
}
function LocalGet([string]$path) {
    if($script:nav -cnotcontains $path){throw 'API-Pfad nicht erlaubt.'}
    try {
        $value=Invoke-RestMethod -Uri ($script:base+$path) -TimeoutSec 3 -Method Get -MaximumRedirection 0 -ErrorAction Stop
        return @{kind='ok';value=$value}
    } catch {
        $resp=$_.Exception.Response
        if($null -ne $resp){
            $status=[int]$resp.StatusCode
            if($status -eq 401 -or $status -eq 403){return @{kind='protected';value=$null}}
            if($status -eq 404){return @{kind='missing';value=$null}}
            return @{kind='error';value="HTTP $status"}
        }
        return @{kind='offline';value=$null}
    }
}
function OllamaStatus {
    try {
        $r=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -Method Get -TimeoutSec 2 -MaximumRedirection 0 -ErrorAction Stop
        $models=@($r.models | ForEach-Object {SafePart $_.name 65})
        return @{ok=$true;models=$models}
    } catch {return @{ok=$false;models=@()}}
}
function StateText($value) {
    switch ($value) {
        'ok' {'VERBUNDEN'}
        'protected' {'ERREICHBAR - ZUGRIFF GESCHUETZT'}
        'offline' {'NICHT ERREICHBAR'}
        'missing' {'UPDATE FEHLT'}
        default {'ABRUF FEHLGESCHLAGEN'}
    }
}
function Fill-Monitor {
    $script:service.Text='VERBINDE ...'
    $script:ollama.Text='PRUEFE ...'
    $script:factory.Text='PRUEFE ...'
    $script:updated.Text='Abfrage laeuft ...'
    $script:overview.Text='Daten werden lokal abgerufen. Ein API-Fehler wird nicht als Aktivitaet gewertet.'
    [System.Windows.Forms.Application]::DoEvents()
    $s=LocalGet '/api/status'
    $o=OllamaStatus
    $f=if($s.kind -eq 'ok'){LocalGet '/api/design-factory/status'}else{@{kind=$s.kind;value=$null}}
    $a=if($s.kind -eq 'ok'){LocalGet '/api/autonomous/status'}else{@{kind=$s.kind;value=$null}}
    $runs=if($s.kind -eq 'ok'){LocalGet '/api/autonomous/runs'}else{@{kind=$s.kind;value=$null}}
    $drafts=if($s.kind -eq 'ok'){LocalGet '/api/design-factory/drafts'}else{@{kind=$s.kind;value=$null}}
    $proposals=if($s.kind -eq 'ok'){LocalGet '/api/agent/proposals'}else{@{kind=$s.kind;value=$null}}

    $script:service.Text=StateText $s.kind
    $script:service.ForeColor=if($s.kind -eq 'ok'){$script:green}else{$script:warn}
    $script:factory.Text=StateText $f.kind
    $script:factory.ForeColor=if($f.kind -eq 'ok'){$script:green}else{$script:warn}
    $script:ollama.Text=if($o.ok){'VERBUNDEN'}else{'NICHT ERREICHBAR'}
    $script:ollama.ForeColor=if($o.ok){$script:green}else{$script:warn}
    $script:bridge.Text='CLOUD-STATUS UNBESTAETIGT'
    $script:bridge.ForeColor=$script:warn
    $script:updated.Text='Letzte lokale Pruefung: ' + [DateTime]::Now.ToString('dd.MM.yyyy HH:mm:ss')

    $summary=New-Object 'System.Collections.Generic.List[string]'
    $summary.Add('CFS AI / VERBINDUNG')
    $summary.Add('Lokal: ' + (StateText $s.kind))
    if($s.kind -eq 'ok'){
        $summary.Add('Dienstversion: ' + (SafePart $s.value.version))
        $summary.Add('Chat-Modell: ' + (SafePart $s.value.chat_model))
    } elseif($s.kind -eq 'protected'){
        $summary.Add('Der API-Schutz verhindert das Lesen von Aufgaben. Keine Zugangsdaten werden ausgelesen.')
    }
    $summary.Add('Ollama: ' + $(if($o.ok){'online'}else{'offline'}))
    if($o.ok){$summary.Add('Verfuegbare Modelle: '+$(if($o.models.Count){$o.models -join ', '}else{'keine gemeldet'}))}
    $summary.Add('Website-Bridge: Nur auf der Website verifiziert. Oeffne WEBSITE ADMIN, dann CFS AI Designproduktion > BRIDGE ENDE-ZU-ENDE TESTEN.')
    $summary.Add('')
    $summary.Add('AUTONOMES STUDIO / AUFGABEN')
    if($a.kind -eq 'ok'){
        $av=$a.value
        $summary.Add('Automatik: ' + $(if($av.settings.enabled){'aktiv'}else{'deaktiviert'}))
        $summary.Add('Worker gestartet: ' + $(if($av.worker_running){'ja'}else{'nein'}))
        $summary.Add('Durchlaeufe heute: ' + (SafePart $av.runs_today))
        $summary.Add('Offene Codevorschlaege: ' + (SafePart $av.pending_proposals))
        $summary.Add('Naechster geplanter Lauf: ' + (SafePart $av.next_due))
        if($av.last_run){
            $summary.Add('Letzte Aufgabe: ' + (SafePart $av.last_run.title))
            $summary.Add('Letztes Ergebnis: ' + (SafePart $av.last_run.status))
        } else {$summary.Add('Noch keine protokollierte Aufgabe.')}
    }else{$summary.Add('Aufgabendaten: ' + (StateText $a.kind))}
    $summary.Add('')
    $summary.Add('DESIGN FACTORY')
    if($f.kind -eq 'ok'){
        $fv=$f.value
        $summary.Add('Design-Automatik: ' + $(if($fv.settings.enabled){'aktiv'}else{'deaktiviert'}))
        $summary.Add('Arbeitet gerade: ' + $(if($fv.running){'ja'}else{'nein'}))
        $summary.Add('Entwuerfe gesamt: ' + (SafePart $fv.total))
        $summary.Add('Zur Freigabe: ' + (SafePart $fv.pending))
        $summary.Add('Bereits freigegeben: ' + (SafePart $fv.approved))
        $summary.Add('Letzter Lauf: ' + (SafePart $fv.last_run_at))
        $summary.Add('Naechster Lauf: ' + (SafePart $fv.next_run_at))
        if($fv.last_result){$summary.Add('Letztes Ergebnis: ' + (SafePart ($fv.last_result | ConvertTo-Json -Compress -Depth 5) 260))}
    }else{$summary.Add('Design-Daten: ' + (StateText $f.kind))}
    $summary.Add('')
    $summary.Add('SICHERHEIT: Keine Live-Veroeffentlichung und keine automatische Codefreigabe.')
    $script:overview.Text=$summary -join [Environment]::NewLine

    $entries=New-Object 'System.Collections.Generic.List[string]'
    $entries.Add('NEUESTE AUTONOME AUFGABEN')
    if($runs.kind -eq 'ok'){
        $items=@($runs.value.items | Where-Object { $null -ne $_ } | Select-Object -First 10)
        if($items.Count -eq 0){$entries.Add('Keine Laeufe vorhanden.')}
        foreach($it in $items){$entries.Add('- '+(SafePart $it.title 110)+' | '+(SafePart $it.status 35)+' | '+(SafePart $it.created_at 40))}
    }else{$entries.Add('Nicht lesbar: '+(StateText $runs.kind))}
    $entries.Add('')
    $entries.Add('DESIGNENTWUERFE')
    if($drafts.kind -eq 'ok'){
        $items=@($drafts.value.items | Where-Object { $null -ne $_ } | Select-Object -First 12)
        if($items.Count -eq 0){$entries.Add('Noch keine Designs vorhanden.')}
        foreach($it in $items){
            $name=if($it.name){$it.name}elseif($it.blueprint.name){$it.blueprint.name}else{$it.id}
            $entries.Add('- '+(SafePart $name 115)+' | '+(SafePart $it.status 35))
        }
    }else{$entries.Add('Nicht lesbar: '+(StateText $drafts.kind))}
    $entries.Add('')
    $entries.Add('CODEVORSCHLAEGE (NUR ZUR PRUEFUNG)')
    if($proposals.kind -eq 'ok'){
        $items=@($proposals.value.items | Where-Object { $null -ne $_ } | Select-Object -First 12)
        if($items.Count -eq 0){$entries.Add('Keine Vorschlaege vorhanden.')}
        foreach($it in $items){$entries.Add('- '+(SafePart $it.title 115)+' | '+(SafePart $it.status 35))}
    }else{$entries.Add('Nicht lesbar: '+(StateText $proposals.kind))}
    $script:jobs.Text=$entries -join [Environment]::NewLine
}

$form=New-Object System.Windows.Forms.Form
$form.Text='cfs_zockt  |  CFS AI Verbindung und Aufgaben'
$form.Size=New-Object System.Drawing.Size(1140,815)
$form.MinimumSize=$form.Size
$form.MaximumSize=$form.Size
$form.StartPosition='CenterScreen'
$form.FormBorderStyle='FixedSingle'
$form.MaximizeBox=$false
$form.BackColor=$script:bg
$form.ForeColor=$script:ink
$logoPath=Join-Path $PSScriptRoot 'cfs-zockt-logo.png'
$iconPath=Join-Path $PSScriptRoot 'cfs-admin.ico'
if(Test-Path -LiteralPath $iconPath){$form.Icon=New-Object System.Drawing.Icon($iconPath)}
$head=Box $form 18 16 1084 120
if(Test-Path -LiteralPath $logoPath){
    $pic=New-Object System.Windows.Forms.PictureBox
    $pic.Location=New-Object System.Drawing.Point(18,8)
    $pic.Size=New-Object System.Drawing.Size(310,99)
    $pic.SizeMode='Zoom'
    $pic.Image=[System.Drawing.Image]::FromFile($logoPath)
    $head.Controls.Add($pic)
}
$null=Text $head 'cfs_zockt  /  KI-KONTROLLZENTRALE' 340 23 710 37 19 $script:ink $true
$null=Text $head 'Echte lokale Statusdaten. Keine erfundenen Aktivitaeten. Nur lesender Zugriff.' 340 72 715 26 10 $script:muted
$card1=Box $form 18 147 261 95
$card2=Box $form 292 147 261 95
$card3=Box $form 566 147 261 95
$card4=Box $form 840 147 262 95
$null=Text $card1 'CFS AI DIENST' 12 12 235 25 10 $script:muted $true
$null=Text $card2 'OLLAMA' 12 12 235 25 10 $script:muted $true
$null=Text $card3 'DESIGN FACTORY' 12 12 235 25 10 $script:muted $true
$null=Text $card4 'WEBSITE BRIDGE' 12 12 235 25 10 $script:muted $true
$script:service=Text $card1 'VERBINDE ...' 12 45 241 42 10 $script:warn $true
$script:ollama=Text $card2 'PRUEFE ...' 12 45 241 42 10 $script:warn $true
$script:factory=Text $card3 'PRUEFE ...' 12 45 241 42 10 $script:warn $true
$script:bridge=Text $card4 'UNBESTAETIGT' 12 45 245 42 10 $script:warn $true
$tabs=New-Object System.Windows.Forms.TabControl
$tabs.Location=New-Object System.Drawing.Point(18,255)
$tabs.Size=New-Object System.Drawing.Size(1084,454)
$tabs.Font=Font 11 $true
$form.Controls.Add($tabs)
$pageStatus=New-Object System.Windows.Forms.TabPage
$pageStatus.Text='Dienst / aktuelle Aufgabe'
$pageStatus.BackColor=$script:bg
$pageJobs=New-Object System.Windows.Forms.TabPage
$pageJobs.Text='Aufgaben / Entwuerfe'
$pageJobs.BackColor=$script:bg
$tabs.TabPages.Add($pageStatus)
$tabs.TabPages.Add($pageJobs)
$script:overview=OutputBox $pageStatus 12 12 1052 395
$script:jobs=OutputBox $pageJobs 12 12 1052 395
$null=Button $form 'JETZT AKTUALISIEREN' 18 720 250 39 {Fill-Monitor}
$null=Button $form 'LOKALE DESIGN FACTORY' 286 720 257 39 {Start-Process 'http://127.0.0.1:8000/design-factory'}
$null=Button $form 'CLOUD-BRIDGE PRUEFEN' 561 720 255 39 {Start-Process 'https://cfs-zockt.de/pages/admin-creators.html'}
$script:updated=Text $form 'Noch keine Pruefung.' 824 728 280 32 9 $script:muted
$form.Add_Shown({Fill-Monitor})
[void]$form.ShowDialog()
if($pic -and $pic.Image){$pic.Image.Dispose()}
$form.Dispose()
