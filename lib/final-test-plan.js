"use strict";

const AREAS=Object.freeze([
  {
    id:"website_account",label:"Website / Creator Account",required:true,
    checks:[
      ["login","Login/Logout funktioniert"],
      ["register","Registrierung funktioniert"],
      ["security","Security-/Account-Seite lädt"],
      ["plan_view","FREE/CREATOR/PRO wird korrekt angezeigt"],
      ["admin_access","Admin-Zugriff nur für berechtigte Creator"]
    ]
  },
  {
    id:"tiktok_account",label:"TikTok Account / OAuth",required:true,
    checks:[
      ["oauth_creator_1","Creator 1 verbindet TikTok real"],
      ["oauth_creator_2","Creator 2 verbindet TikTok real"],
      ["profile_sync","Profil/Avatar/Follower-Daten werden korrekt synchronisiert"],
      ["disconnect","Disconnect entfernt Creator-Verknüpfung korrekt"],
      ["reconnect_account","Reconnect funktioniert erneut"]
    ]
  },
  {
    id:"widget_studio",label:"Widget Studio",required:true,
    checks:[
      ["create_widget","Widget erstellen"],
      ["edit_widget","Text/Counter/Progress/Shape/Image bearbeiten"],
      ["publish_widget","Widget veröffentlichen"],
      ["obs_url","stabile OBS URL funktioniert"],
      ["output_vertical","TikTok Vertical Output korrekt"],
      ["output_landscape","Landscape Output korrekt"],
      ["alert_test","lokaler Alert-Test sichtbar"],
      ["creator_isolation","Widget eines anderen Creators nicht zugreifbar"]
    ]
  },
  {
    id:"scene_studio",label:"Scene Studio",required:true,
    checks:[
      ["scene_create","Scene erstellen"],
      ["scene_layout","Widget Position/Scale/Rotation/Opacity bearbeiten"],
      ["scene_publish","Scene veröffentlichen"],
      ["scene_obs","Scene Runtime als Browser Source"],
      ["scene_launcher","Scene im Launcher laden"],
      ["scene_creator_isolation","Scene Creator Isolation"]
    ]
  },
  {
    id:"launcher",label:"Desktop Launcher",required:true,
    checks:[
      ["install","Setup auf Clean Windows 11"],
      ["device_link","Device-Link"],
      ["restart_login","Login bleibt nach Neustart erhalten"],
      ["tray","Tray / Hide / Restore"],
      ["autostart","Autostart falls aktiviert"],
      ["update_check","Update Check"],
      ["diagnostics","Diagnostics / Preflight"],
      ["obs_doctor","OBS Doctor"],
      ["support_bundle","Support Bundle"],
      ["logout","Logout / Device Revoke"]
    ]
  },
  {
    id:"live_provider",label:"TikTok LIVE Provider",required:true,
    checks:[
      ["connect","echter LIVE Connect"],
      ["follow","echtes Follow Event"],
      ["like","echtes Like Event"],
      ["gift","echtes Gift Event"],
      ["share","echtes Share Event"],
      ["viewer","Viewer Snapshot/Update"],
      ["gift_streak","Gift Streak"],
      ["reconnect","Reconnect nach Unterbrechung"],
      ["restart_recovery","Launcher Restart + Session Recovery"],
      ["no_duplicates","keine doppelten Event Deliveries"]
    ]
  },
  {
    id:"stream_deck",label:"CFS Stream Deck",required:true,
    checks:[
      ["layout","12-Button Layout"],
      ["widget_toggle","Widget On/Off"],
      ["alert_test","Follow/Gift/Share Test"],
      ["autothanks","AutoThanks Toggle"],
      ["game_actions","Game Start/Stop/Score/Reset"],
      ["cut_open","Cut Projekt öffnen"],
      ["persistence","Layout nach Neustart erhalten"]
    ]
  },
  {
    id:"games",label:"Creator Games",required:true,
    checks:[
      ["game_create","Game Runtime vorhanden"],
      ["game_overlay","Overlay URL funktioniert"],
      ["game_start_stop","Start/Stop"],
      ["rule_follow","Follow Regel real"],
      ["rule_like","Like Regel real"],
      ["rule_gift","Gift Regel real"],
      ["rule_share","Share Regel real"],
      ["dedupe","Rule Hit Dedupe"],
      ["scene_integration","Game Runtime in Scene"]
    ]
  },
  {
    id:"cut_studio",label:"Cut Studio",required:true,
    checks:[
      ["source_pick","lokale Videoquelle zuordnen"],
      ["metadata","ffprobe/Metadaten falls vorhanden"],
      ["timeline","Timeline/Reihenfolge"],
      ["caption","Caption Burn-in"],
      ["keyframes","Keyframes / Bezier"],
      ["transition","Transition"],
      ["music","mehrere Musikspuren"],
      ["voice","mehrere Voice-Spuren"],
      ["sfx","SFX"],
      ["ducking","Voice Ducking"],
      ["waveform","Waveform/Peak Analyse"],
      ["clip_export","Clip Export"],
      ["reel_export","Reel Export"],
      ["cancel","Export Cancel falls vorhanden"],
      ["output_folder","Exportordner öffnen"],
      ["large_file","größeres reales Creator-Video"]
    ]
  },
  {
    id:"obs",label:"OBS",required:true,
    checks:[
      ["browser_widget","Widget Browser Source"],
      ["browser_scene","Scene Browser Source"],
      ["alpha","Transparenz"],
      ["resolution","1080x1920 / 1920x1080"],
      ["framerate","Framerate unter Last"],
      ["launcher_closed","Cloud Sources laufen nach Launcher-Schließen"],
      ["simultaneous","mehrere Sources gleichzeitig"]
    ]
  },
  {
    id:"tiktok_output",label:"TikTok LIVE Studio / Output",required:true,
    checks:[
      ["vertical_capture","9:16 Output real sichtbar"],
      ["capture_route","gewählter Capture-/Output-Pfad funktioniert"],
      ["alpha_or_bg","Alpha/Hintergrund Verhalten geprüft"],
      ["simultaneous_obs","gleichzeitig OBS + TikTok"],
      ["load_30m","30 Minuten Stabilität"]
    ]
  },
  {
    id:"billing",label:"Billing / Stripe Testmode",required:true,
    checks:[
      ["creator_checkout","CREATOR Checkout"],
      ["pro_checkout","PRO Checkout"],
      ["webhooks","signierte Webhooks"],
      ["entitlement","Plan wird korrekt angewendet"],
      ["portal","Customer Portal"],
      ["upgrade","Upgrade"],
      ["downgrade","Downgrade"],
      ["cancel","Kündigung Periodenende"],
      ["failure","Payment Failure / Grace"],
      ["recovery","Invoice Paid / Recovery"]
    ]
  },
  {
    id:"release",label:"Release / Windows / Production",required:true,
    checks:[
      ["github_quality","GitHub Quality Gate PASS"],
      ["windows_build","GitHub Windows Build PASS"],
      ["signed","Authenticode VALID oder bewusst als offen dokumentiert"],
      ["installer","Setup EXE installiert"],
      ["portable","Portable EXE startet"],
      ["updater","Installed Updater E2E"],
      ["pilot_5","Pilot Beta 5 Creator"],
      ["expanded_20","Expanded Beta 20 Creator"],
      ["canary","Production Canary"],
      ["rollback","Production Rollback"],
      ["go_no_go","Finales Go/No-Go dokumentiert"]
    ]
  }
]);

function createPlan({backendVersion="3.12.0",launcherVersion="0.42.0"}={}){
  return{
    schema:1,
    generated_at:new Date().toISOString(),
    backend_version:String(backendVersion),
    launcher_version:String(launcherVersion),
    status:"pending_real_world_tests",
    areas:AREAS.map(area=>({
      id:area.id,label:area.label,required:area.required,
      checks:area.checks.map(([id,label])=>({id,label,status:"pending",notes:"",reference:""}))
    }))
  };
}
function summarize(plan={}){
  const checks=(plan.areas||[]).flatMap(a=>a.checks||[]);
  const passed=checks.filter(c=>c.status==="pass").length;
  const failed=checks.filter(c=>c.status==="fail").length;
  const pending=checks.filter(c=>!["pass","fail"].includes(c.status)).length;
  return{passed,failed,pending,total:checks.length,ready:checks.length>0&&failed===0&&pending===0};
}
function markdown(plan={}){
  const lines=[
    "# CFS Creator Suite — Final Test Matrix",
    "",
    `Backend: \`${plan.backend_version}\`  `,
    `Launcher: \`${plan.launcher_version}\``,
    ""
  ];
  for(const area of plan.areas||[]){
    lines.push(`## ${area.label}`,"");
    for(const c of area.checks||[]) lines.push(`- [ ] ${c.label}`);
    lines.push("");
  }
  return lines.join("\n");
}
function csv(plan={}){
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const rows=[["Bereich","Check-ID","Prüfung","Status","Notizen","Referenz"]];
  for(const a of plan.areas||[])for(const c of a.checks||[])rows.push([a.label,c.id,c.label,c.status,c.notes,c.reference]);
  return rows.map(r=>r.map(esc).join(",")).join("\n")+"\n";
}

module.exports={AREAS,createPlan,summarize,markdown,csv};
