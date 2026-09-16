"use strict";

const PROTOCOLS=Object.freeze({
  windows_install:{
    label:"Windows 11 Installer Acceptance",
    steps:[
      ["setup_launch","Setup EXE startet ohne Blocker",true],
      ["install_complete","Installation auf Clean Windows 11 abgeschlossen",true],
      ["launcher_start","Launcher startet nach Installation",true],
      ["device_link","Creator Device-Link erfolgreich",true],
      ["safe_storage","Credentials/Device-Link über Windows safeStorage nach Neustart verfügbar",true],
      ["local_output","Lokales Scene/Output Window startet",true],
      ["cut_export","Lokaler Cut-Studio Export erfolgreich",true],
      ["restart","Windows-/Launcher-Neustart erfolgreich",true],
      ["uninstall","Deinstallation ohne kritische Rückstände",true],
      ["smartscreen_recorded","SmartScreen/Publisher-Verhalten dokumentiert",true]
    ]
  },
  updater_e2e:{
    label:"Installed Updater E2E Acceptance",
    steps:[
      ["installed_source","Test startet aus installierter Version, nicht Portable",true],
      ["update_detected","Neue Release-Version wird erkannt",true],
      ["download_complete","Update vollständig heruntergeladen",true],
      ["safe_gate","LIVE/Export Safety Gate verhindert unsichere Installation",true],
      ["install_restart","Update installiert und Launcher neu gestartet",true],
      ["version_updated","Neue Version nach Neustart aktiv",true],
      ["creator_state_preserved","Creator-Link und lokale Einstellungen erhalten",true],
      ["rollback_plan","Rollback-Pfad dokumentiert",true]
    ]
  },
  stripe_testmode:{
    label:"Stripe Testmode Billing Acceptance",
    steps:[
      ["checkout_creator","CREATOR Checkout im Stripe Testmode erfolgreich",true],
      ["checkout_pro","PRO Checkout im Stripe Testmode erfolgreich",true],
      ["webhook_verified","Signierte Stripe-Webhooks auf Zielumgebung verarbeitet",true],
      ["entitlement_applied","Effektiver Plan nach Payment korrekt",true],
      ["portal_opened","Customer Portal real geöffnet",true],
      ["plan_change","Upgrade/Downgrade über Portal geprüft",true],
      ["cancel_period_end","Kündigung zum Periodenende geprüft",true],
      ["payment_failure","Payment-Failure / Grace Period geprüft",true],
      ["payment_recovery","Invoice Paid beendet Grace Period",true]
    ]
  },
  obs_output:{
    label:"OBS Output Acceptance",
    steps:[
      ["browser_source","Cloud Browser Source real in OBS geladen",true],
      ["scene_source","Scene Runtime real in OBS geladen",true],
      ["alpha","Transparenz/Alpha geprüft",true],
      ["resolution","Auflösung/Scaling geprüft",true],
      ["framerate","Framerate unter Last geprüft",true],
      ["launcher_close","Cloud Source läuft nach Launcher-Schließen weiter",true]
    ]
  },
  tiktok_live:{
    label:"TikTok LIVE Acceptance",
    steps:[
      ["oauth_creator_1","Creator 1 TikTok-Verbindung real geprüft",true],
      ["oauth_creator_2","Creator 2 TikTok-Verbindung real geprüft",true],
      ["live_connect","LIVE Provider mit echtem Stream verbunden",true],
      ["follow","Follow Event real geprüft",true],
      ["like","Like Event real geprüft",true],
      ["gift","Gift Event real geprüft",true],
      ["share","Share Event real geprüft",true],
      ["reconnect","Reconnect real geprüft",true],
      ["vertical_output","9:16 TikTok Workflow real geprüft",true]
    ]
  }
});
const PROTOCOL_KEYS=Object.freeze(Object.keys(PROTOCOLS));
const ACCEPTANCE_STATUSES=new Set(["draft","passed","failed"]);

function text(value,max=4000){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function protocolDefinition(key){return PROTOCOLS[String(key||"").trim()]||null}
function stepMap(protocol){
  const def=protocolDefinition(protocol);
  return new Map((def?.steps||[]).map(([id,label,required])=>[id,{id,label,required:required!==false}]));
}
function sanitizeStepResults(protocol,value){
  const defs=stepMap(protocol),raw=Array.isArray(value)?value:[];
  const byId=new Map(raw.map(item=>[String(item?.id||""),item]));
  return[...defs.values()].map(def=>{
    const item=byId.get(def.id)||{};
    const status=["pass","fail","skip","pending"].includes(String(item.status||""))?String(item.status):"pending";
    return{
      id:def.id,label:def.label,required:def.required,status,
      notes:text(item.notes,1200),
      reference:text(item.reference,500),
      tested_at:item.tested_at||null
    };
  });
}
function evaluateAcceptance(protocol,stepResults=[]){
  const steps=sanitizeStepResults(protocol,stepResults);
  const required=steps.filter(step=>step.required);
  const failed=required.filter(step=>step.status==="fail");
  const pending=required.filter(step=>step.status!=="pass"&&step.status!=="fail");
  const passed=required.filter(step=>step.status==="pass").length;
  return{
    protocol,
    label:protocolDefinition(protocol)?.label||protocol,
    ready:required.length>0&&failed.length===0&&pending.length===0,
    passed,total:required.length,
    failed:failed.map(step=>step.id),
    pending:pending.map(step=>step.id),
    steps
  };
}
function sanitizeAcceptance(input={},options={}){
  const protocol=String(input.protocol||"").trim();
  if(!protocolDefinition(protocol))throw new Error("Unbekanntes Release-Acceptance-Protokoll.");
  const evaluation=evaluateAcceptance(protocol,input.step_results);
  let status=ACCEPTANCE_STATUSES.has(String(input.status||""))?String(input.status):"draft";
  if(status==="passed"&&!evaluation.ready)throw new Error("Acceptance kann nur PASSED sein, wenn alle Pflichtschritte bestanden sind.");
  if(evaluation.failed.length)status="failed";
  else if(evaluation.ready)status="passed";
  const releaseVersion=text(input.release_version||options.releaseVersion,80);
  const environment=text(input.environment,80)||"production";
  const target=text(input.target,500),reference=text(input.reference,500),notes=text(input.notes,4000);
  if(status==="passed"&&!reference&&notes.length<12)throw new Error("Bestandene Acceptance braucht eine Referenz oder nachvollziehbare Notiz.");
  return{
    protocol,status,
    release_version:releaseVersion,
    environment,target,reference,notes,
    step_results:evaluation.steps,
    evaluation
  };
}
function publicAcceptance(row={}){
  const protocol=String(row.protocol||"");
  const evaluation=evaluateAcceptance(protocol,row.step_results);
  return{
    id:String(row.id||""),protocol,status:String(row.status||"draft"),
    release_version:text(row.release_version,80),environment:text(row.environment,80),
    target:text(row.target,500),reference:text(row.reference,500),notes:text(row.notes,4000),
    step_results:evaluation.steps,evaluation,
    created_by:String(row.created_by||""),created_at:row.created_at||null,updated_at:row.updated_at||null
  };
}
function latestAcceptances(rows=[],releaseVersion=""){
  const out={};
  for(const protocol of PROTOCOL_KEYS){
    const matches=(Array.isArray(rows)?rows:[]).filter(row=>String(row.protocol)===protocol&&(!releaseVersion||String(row.release_version||"")===String(releaseVersion)));
    matches.sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0));
    out[protocol]=matches[0]?publicAcceptance(matches[0]):null;
  }
  return out;
}

module.exports={
  PROTOCOLS,PROTOCOL_KEYS,ACCEPTANCE_STATUSES,
  protocolDefinition,sanitizeStepResults,evaluateAcceptance,sanitizeAcceptance,publicAcceptance,latestAcceptances
};
