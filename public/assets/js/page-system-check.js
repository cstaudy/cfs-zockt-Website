const EXPECTED = {backend:"3.20.57",schema:80,launcher:"0.47.31"};

const checks = [
  {name:"Backend / Schema",url:"/api/health",type:"health",group:"Code & Backend"},
  {name:"Account Session",url:"/api/account/me",type:"account",group:"Code & Backend"},
  {name:"Creator Suite Readiness",url:"/api/creator/suite-readiness",type:"protected",group:"Code & Backend"},
  {name:"Release Readiness",url:"/api/creator/release-readiness",type:"release",group:"Code & Backend"},
  {name:"Stream Startcheck",url:"/api/creator/stream-ready",type:"protected",group:"Stream & OBS"},
  {name:"Launcher Release Policy",url:"/api/creator/launcher/releases?channel=stable",type:"launcher",group:"Stream & OBS"},
  {name:"NEXUS Control Plane",url:"/api/nexus/status",type:"nexus",group:"Stream & OBS"},
  {name:"Integrations-Verträge",url:"/api/creator/integration-capabilities",type:"integrations",group:"Integrationen"},
  {name:"Twitch Runtime",url:"/api/creator/twitch/status",type:"twitch",group:"Integrationen"},
  {name:"TikTok Status",url:"/api/tiktok/status",type:"json",group:"Integrationen"}
];

const results=[];
const el=id=>document.getElementById(id);
const checksEl=el("checks"),runButton=el("runButton"),copyButton=el("copyButton");

function createRows(){
  checksEl.innerHTML="";
  let group="";
  checks.forEach((check,index)=>{
    if(check.group!==group){group=check.group;const h=document.createElement("div");h.className="check-group";h.textContent=group;checksEl.appendChild(h)}
    const row=document.createElement("div");row.className="check";row.id=`check-${index}`;
    row.innerHTML=`<div class="icon">•</div><div><div class="name">${check.name}</div><div class="detail">${check.url}</div></div><div class="status">WARTET</div>`;
    checksEl.appendChild(row);
  });
}
function setResult(index,state,status,detail){const row=el(`check-${index}`);row.className=`check ${state}`;row.querySelector(".icon").textContent=state==="ok"?"✓":state==="warn"?"!":"×";row.querySelector(".status").textContent=status;row.querySelector(".detail").textContent=detail;results[index]={...checks[index],state,status,detail};updateSummary();updateReadinessCards()}
function updateSummary(){const done=results.filter(Boolean);el("totalCount").textContent=checks.length;el("okCount").textContent=done.filter(x=>x.state==="ok").length;el("warnCount").textContent=done.filter(x=>x.state==="warn").length;el("badCount").textContent=done.filter(x=>x.state==="bad").length}
function card(id,state,title,meta){const node=el(id);if(!node)return;node.classList.remove("ok","warn","bad");if(state)node.classList.add(state);el(`${id}Title`).textContent=title;el(`${id}Meta`).textContent=meta}
function byName(name){return results.find(x=>x?.name===name)}
function updateReadinessCards(){
  const health=byName("Backend / Schema"),release=byName("Release Readiness"),stream=byName("Stream Startcheck"),launcher=byName("Launcher Release Policy"),integrations=byName("Integrations-Verträge"),twitch=byName("Twitch Runtime"),nexus=byName("NEXUS Control Plane");
  if(health)card("backendReadiness",health.state,health.state==="ok"?"CODE READY":"PRÜFEN",health.detail);
  if(stream||launcher){const rows=[stream,launcher].filter(Boolean),bad=rows.some(x=>x.state==="bad"),warn=rows.some(x=>x.state==="warn");card("launcherReadiness",bad?"bad":warn?"warn":"ok",bad?"BLOCKIERT":warn?"SETUP PRÜFEN":"CONTRACT READY",`${rows.filter(x=>x.state==="ok").length}/${rows.length} Stream-/Launcher-Checks bestätigt`)}
  if(release||nexus){const rows=[release,nexus].filter(Boolean),bad=rows.some(x=>x.state==="bad"),warn=rows.some(x=>x.state==="warn");card("creatorReadiness",bad?"bad":warn?"warn":"ok",bad?"FEHLER":warn?"SESSION / SETUP":"CODE READY",`${rows.filter(x=>x.state==="ok").length}/${rows.length} Suite-Gates bestätigt`)}
  if(integrations||twitch){const rows=[integrations,twitch].filter(Boolean),bad=rows.some(x=>x.state==="bad");const meta=bad?"Integrationsvertrag fehlerhaft":"Code/Contracts geprüft · echter Twitch-Testaccount bleibt Acceptance";const ext=el("externalReadiness");if(ext){ext.className="readiness-card warn";ext.querySelector("strong").textContent="ACCEPTANCE OFFEN";ext.querySelector("small").textContent=`Windows · OBS · Twitch LIVE · Browsermatrix · Soak · ${meta}`}}
}
async function request(check){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{return await fetch(check.url,{credentials:"same-origin",cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}})}finally{clearTimeout(timer)}}
async function testCheck(check,index){
  try{
    const response=await request(check);
    const data=await response.clone().json().catch(()=>null);
    if(check.type==="health"){
      if(!response.ok||!data)return setResult(index,"bad",`HTTP ${response.status}`,"Health-Check fehlgeschlagen.");
      const ok=String(data.version||"")===EXPECTED.backend&&Number(data.schema_version)===EXPECTED.schema;
      return setResult(index,ok?"ok":"bad",ok?"VERSION OK":"VERSION DRIFT",`Backend ${data.version||"?"} · Schema ${data.schema_version??"?"} · erwartet ${EXPECTED.backend}/${EXPECTED.schema}`);
    }
    if(response.status===401)return setResult(index,"warn","LOGIN NÖTIG",`${check.url} ist geschützt und erreichbar.`);
    if(response.status===403)return setResult(index,"warn","PLAN / RECHTE",data?.error||"Für diesen Account nicht freigeschaltet.");
    if(check.type==="launcher"){
      if(!response.ok||!data)return setResult(index,"bad",`HTTP ${response.status}`,"Launcher-Policy konnte nicht gelesen werden.");
      const target=String(data.policy?.build_target_version||"");const ok=!target||target===EXPECTED.launcher;
      return setResult(index,ok?"ok":"warn",ok?"POLICY OK":"TARGET DRIFT",`Launcher-Ziel ${target||"?"} · erwartet ${EXPECTED.launcher}`);
    }
    if(check.type==="release"){
      if(!data)return setResult(index,"bad","KEIN JSON","Release-Readiness antwortet nicht mit JSON.");
      const ready=data.release?.local_ready===true||data.ok===true;
      return setResult(index,ready?"ok":"warn",ready?"LOCAL READY":"LOCAL OFFEN",`Code-/DB-/Security-Readiness: ${ready?"bestätigt":"noch nicht vollständig"}.`);
    }
    if(check.type==="integrations"){
      if(!response.ok||!data)return setResult(index,"bad",`HTTP ${response.status}`,"Integrationsvertrag nicht verfügbar.");
      const obs=data.integrations?.obs_websocket?.code_status||"?";const twitch=(data.integrations?.oauth||[]).find(x=>x.provider==="twitch");
      return setResult(index,"ok","CONTRACTS OK",`OBS ${obs} · Twitch OAuth ${twitch?.oauth_implemented?"implementiert":"offen"} · echte Acceptance bleibt separat.`);
    }
    if(check.type==="nexus"){
      if(!response.ok||!data)return setResult(index,"bad",`HTTP ${response.status}`,data?.error||"NEXUS nicht verfügbar.");
      const state=String(data.status||"unknown");return setResult(index,["ready","launcher_offline","launcher_upgrade_required","locked"].includes(state)?"ok":"warn",state.toUpperCase(),`NEXUS v${data.version||"?"} · ${data.actions?.length||0} Actions · ${data.automations?.length||0} Automationen`);
    }
    if(check.type==="twitch"){
      if(!response.ok||!data)return setResult(index,"bad",`HTTP ${response.status}`,data?.error||"Twitch Runtime nicht verfügbar.");
      return setResult(index,"ok",data.connected?"VERBUNDEN":"RUNTIME OK",data.connected?"Twitch Account verbunden.":"Runtime-Endpunkt erreichbar; echter Provider-Login bleibt Acceptance.");
    }
    if(!response.ok)return setResult(index,"bad",`HTTP ${response.status}`,data?.error||`${check.url} antwortet mit Fehler.`);
    return setResult(index,"ok","API OK",`${check.url} erreichbar.`);
  }catch(error){return setResult(index,"bad",error?.name==="AbortError"?"TIMEOUT":"FEHLER",error?.name==="AbortError"?"Keine Antwort innerhalb von 10 Sekunden.":String(error?.message||error))}
}
async function runChecks(){runButton.disabled=true;runButton.textContent="PRÜFUNG LÄUFT …";results.length=0;createRows();updateSummary();for(let i=0;i<checks.length;i+=1)await testCheck(checks[i],i);el("lastRun").textContent="Letzter Test: "+new Date().toLocaleString("de-DE");runButton.disabled=false;runButton.textContent="SYSTEM CHECK ERNEUT STARTEN"}
async function copyResults(){if(!results.filter(Boolean).length)return alert("Bitte zuerst den System Check starten.");const text=["cfs_zockt Pre-Beta System Check",new Date().toLocaleString("de-DE"),`Erwartet: Backend ${EXPECTED.backend} · Schema ${EXPECTED.schema} · Launcher ${EXPECTED.launcher}`,"",...results.filter(Boolean).map(x=>`${x.state==="ok"?"✓":x.state==="warn"?"!":"✗"} ${x.name} — ${x.status}\n  ${x.detail}`),"","EXTERNE ACCEPTANCE: Windows · OBS · Twitch LIVE · Browsermatrix · Soak weiterhin separat abnehmen."].join("\n");try{await navigator.clipboard.writeText(text);const old=copyButton.textContent;copyButton.textContent="KOPIERT ✓";setTimeout(()=>copyButton.textContent=old,1800)}catch{window.prompt("Ergebnis kopieren:",text)}}
runButton?.addEventListener("click",runChecks);copyButton?.addEventListener("click",copyResults);createRows();updateSummary();
