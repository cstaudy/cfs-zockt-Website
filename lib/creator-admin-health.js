"use strict";

function ageMs(value,now=Date.now()){
  if(!value)return null;
  const ts=new Date(value).getTime();
  return Number.isFinite(ts)?Math.max(0,now-ts):null;
}
function profileSyncStatus({connected=false,updated_at=null}={},now=Date.now()){
  if(!connected)return{key:"disconnected",label:"NICHT VERBUNDEN",ok:false,age_ms:null};
  const age=ageMs(updated_at,now);
  if(age===null)return{key:"unknown",label:"SYNC UNBEKANNT",ok:false,age_ms:null};
  if(age<=6*60*60*1000)return{key:"fresh",label:"SYNC OK",ok:true,age_ms:age};
  if(age<=24*60*60*1000)return{key:"aging",label:"SYNC ÄLTER",ok:true,age_ms:age};
  return{key:"stale",label:"SYNC VERALTET",ok:false,age_ms:age};
}
function bridgeConnectionStatus({status="",last_seen_at=null}={},now=Date.now()){
  if(status&&status!=="active")return{key:"revoked",label:"BRIDGE INAKTIV",ok:false,age_ms:ageMs(last_seen_at,now)};
  if(!last_seen_at)return{key:"not_configured",label:"NOCH NIE ONLINE",ok:false,age_ms:null};
  const age=ageMs(last_seen_at,now);
  if(age<=30*1000)return{key:"online",label:"ONLINE",ok:true,age_ms:age};
  if(age<=10*60*1000)return{key:"recent",label:"KÜRZLICH ONLINE",ok:true,age_ms:age};
  return{key:"offline",label:"OFFLINE",ok:false,age_ms:age};
}
function creatorReadiness(row={},now=Date.now()){
  const sync=profileSyncStatus({connected:Boolean(row.tiktok_connected),updated_at:row.tiktok_updated_at},now);
  const bridge=bridgeConnectionStatus({status:row.bridge_status,last_seen_at:row.bridge_last_seen_at},now);
  const hasWidget=Number(row.widgets_live||0)>0;
  const checks=[
    {key:"account",ok:row.status==="active"},
    {key:"tiktok",ok:sync.ok},
    {key:"widget",ok:hasWidget},
    {key:"launcher",ok:bridge.ok}
  ];
  const passed=checks.filter(x=>x.ok).length;
  return{score:Math.round(passed/checks.length*100),checks,sync,bridge};
}
module.exports={ageMs,profileSyncStatus,bridgeConnectionStatus,creatorReadiness};
