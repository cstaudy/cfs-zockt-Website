import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root=path.resolve(process.argv[2]||".");
const require=createRequire(import.meta.url);
const renderer=require(path.join(root,"public/assets/js/cfs-widget-renderer.js"));
const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
const studio=fs.readFileSync(path.join(root,"public/assets/js/widget-studio.js"),"utf8");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));

const checks=[];
function check(name,condition,detail=""){
  checks.push({name,ok:Boolean(condition),detail});
  if(!condition)process.exitCode=1;
}
function payload({definition,settings={},data={},events=[],creator={display_name:"Creator Account"}}){
  return {
    widget:{definition,config:{widgetType:definition.key||"test",settings,data,canvas:{width:600,height:120},elements:[]}},
    data:{profile:{connected:false,display_name:"TikTok Name",avatar_url:"https://example.test/avatar.jpg",followers:1284,likes_total:9000},live:{connected:false,stale:true},bridge:{}},
    events,
    creator
  };
}

// Goal: profile metric -> target math
{
  const p=payload({definition:{key:"follower_goal",mode:"goal",metric:"profile.followers",source_kind:"profile",default_goal:2000},settings:{goal:2000},data:{metric:"profile.followers"}});
  p.data.profile.connected=true;
  const d=renderer.runtimeData(p);
  check("Follower Goal liest Profilwert",d.current===1284,`current=${d.current}`);
  check("Follower Goal Restwert",d.remaining===716,`remaining=${d.remaining}`);
  check("Follower Goal Prozent",d.percent===64,`percent=${d.percent}`);
}

// Manual counter: no platform identity/data leakage
{
  const p=payload({definition:{key:"manual_counter",mode:"manual_counter",source_kind:"manual"},settings:{manualValue:42}});
  const d=renderer.runtimeData(p);
  check("Manueller Counter Wert",d.current===42,`current=${d.current}`);
  check("Manueller Counter ohne TikTok Avatar",d.avatar==="",`avatar=${d.avatar}`);
  check("Manueller Counter nutzt Creator-Identität",d.displayName==="Creator Account",`displayName=${d.displayName}`);
  check("Manueller Counter ohne Profilmetrik",d.profileFollowers===0&&d.profileLikes===0);
}

// Manual timer: stored base + elapsed
{
  const now=Date.now();
  const p=payload({definition:{key:"stream_timer",mode:"manual_timer",source_kind:"manual"},settings:{manualTimerSeconds:30,manualTimerRunning:true,manualTimerUpdatedAt:new Date(now-65000).toISOString()}});
  const d=renderer.runtimeData(p);
  check("Manueller Timer läuft weiter",d.current>=94&&d.current<=97,`current=${d.current}`);
  check("Manueller Timer Status",d.status==="LÄUFT",`status=${d.status}`);
}

// LIVE timer: online runs, stale/hold freezes at last known freshness, zero becomes zero
{
  const now=Date.now();
  const base=payload({definition:{key:"live_timer",mode:"timer",source_kind:"live_bridge"},settings:{offlineBehavior:"hold"}});
  base.data.live={connected:false,stale:true,started_at:new Date(now-300000).toISOString(),last_event_at:new Date(now-90000).toISOString(),bridge_heartbeat_at:new Date(now-45000).toISOString(),updated_at:new Date(now-60000).toISOString()};
  let d=renderer.runtimeData(base);
  check("LIVE Timer hold friert letzten Stand ein",d.current>=254&&d.current<=256,`current=${d.current}`);
  const zero=structuredClone(base);zero.widget.config.settings.offlineBehavior="zero";d=renderer.runtimeData(zero);
  check("LIVE Timer zero setzt 0",d.current===0,`current=${d.current}`);
  const online=structuredClone(base);online.data.live.connected=true;online.data.live.stale=false;d=renderer.runtimeData(online);
  check("LIVE Timer online läuft bis jetzt",d.current>=299&&d.current<=301,`current=${d.current}`);
}

// Chat: hold keeps last rows, zero clears stale rows
{
  const events=[{id:"chat-1",event_type:"chat",actor_name:"Viewer",actor_avatar:"",payload:{message:"Hallo"},created_at:new Date().toISOString()}];
  const p=payload({definition:{key:"chat_overlay",mode:"chat",event_type:"chat",source_kind:"live_bridge"},settings:{offlineBehavior:"hold"},events});
  let d=renderer.runtimeData(p);
  check("Chat hold behält letzte Nachricht",d.chatMessages.length===1);
  const zero=structuredClone(p);zero.widget.config.settings.offlineBehavior="zero";d=renderer.runtimeData(zero);
  check("Chat zero leert stale Chat",d.chatMessages.length===0);
}

// Camera/static: no external data dependency in renderer model
{
  const p=payload({definition:{key:"camera_frame",mode:"static",source_kind:"static"}});
  const d=renderer.runtimeData(p);
  check("Kamera Overlay bleibt statisch",d.status==="OBS OVERLAY"&&d.current===0);
  check("Kamera Overlay ohne Profilidentität",d.avatar===""&&d.profileFollowers===0);
}

// Server/source invariants for publish/control path
check("Unveröffentlichte Änderungen per Config-Vergleich",server.includes("function studioWidgetHasUnpublishedChanges(row)")&&server.includes("has_unpublished_changes: studioWidgetHasUnpublishedChanges(row)"));
check("Live-Steuerung verschiebt published_at nicht",!server.includes("published_at = CASE WHEN $4::text IS NULL THEN published_at ELSE NOW() END"));
check("Statische/manuelle Outputs ohne externe Snapshots",server.includes("const detachedData = staticObs || manualOnly")&&server.includes("const snapshot = detachedData"));
check("Manueller Standard-Start ohne Plattformavatar",server.includes('if(def.source_kind === "manual") return {...common'));
check("Studio Preview kennt LIVE-Freshness",studio.includes("bridge_heartbeat_at:state.live.bridge_heartbeat_at||null")&&studio.includes("updated_at:state.live.updated_at||null"));
check("Backend-Version bleibt 3.12.0",pkg.version==="3.12.0",pkg.version);

for(const item of checks)console.log(`${item.ok?"PASS":"FAIL"}  ${item.name}${item.detail?` · ${item.detail}`:""}`);
const passed=checks.filter(x=>x.ok).length;
console.log(`\n${passed}/${checks.length} Core-Flow Checks bestanden.`);
if(passed!==checks.length)process.exit(1);
