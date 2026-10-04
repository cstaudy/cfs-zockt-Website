const EXPECTED = {backend:"3.20.38",schema:78,launcher:"0.47.30"};

const checks = [
  {name:"Startseite",url:"/",type:"page"},
  {name:"Login",url:"/pages/login.html",type:"page"},
  {name:"Dashboard",url:"/pages/dashboard.html",type:"page"},
  {name:"Stream Studio",url:"/pages/stream-studio.html",type:"page"},
  {name:"Creator Setup",url:"/pages/setup.html",type:"page"},
  {name:"Account",url:"/pages/account.html",type:"page"},
  {name:"Creator Editor",url:"/pages/editor.html",type:"page"},
  {name:"Widget Studio",url:"/pages/widget-studio.html",type:"page"},
  {name:"TikTok Hub",url:"/pages/tiktok.html",type:"page"},
  {name:"Launcher",url:"/pages/launcher.html",type:"page"},
  {name:"Cut Studio",url:"/pages/cut-studio.html",type:"page"},
  {name:"Interaktive Spiele",url:"/pages/games.html",type:"page"},
  {name:"Audio Studio",url:"/pages/audio-studio.html",type:"page"},
  {name:"Integrationen",url:"/pages/integrations.html",type:"page"},
  {name:"NEXUS",url:"/pages/nexus.html",type:"page"},
  {name:"Pläne",url:"/pages/plans.html",type:"page"},
  {name:"Einstellungen",url:"/pages/settings.html",type:"page"},
  {name:"Support",url:"/pages/support.html",type:"page"},
  {name:"Roadmap",url:"/pages/roadmap.html",type:"page"},
  {name:"Frontend CSS",url:"/assets/css/styles.css",type:"asset"},
  {name:"Frontend JavaScript",url:"/assets/js/app.js",type:"asset"},
  {name:"Backend Health / Version",url:"/api/health",type:"health"},
  {name:"Account API",url:"/api/account/me",type:"account"},
  {name:"Creator Settings API",url:"/api/creator/settings",type:"protected-json"},
  {name:"Creator Module Registry",url:"/api/creator/modules",type:"protected-json"},
  {name:"Launcher State API",url:"/api/creator/modules/launcher/state",type:"protected-json"},
  {name:"Launcher Release Policy",url:"/api/creator/launcher/releases?channel=stable",type:"release-policy"},
  {name:"Games Runtime API",url:"/api/creator/games/runtime",type:"protected-json"},
  {name:"Stream Runtime API",url:"/api/creator/stream-studio/runtime",type:"protected-json"},
  {name:"CUT Projects API",url:"/api/creator/cut-studio/projects",type:"protected-json"},
  {name:"NEXUS Status API",url:"/api/nexus/status",type:"protected-json"},
  {name:"TikTok Status API",url:"/api/tiktok/status",type:"json"}
];

const results = [];

function createRows(){
  checksEl.innerHTML="";
  checks.forEach((check,index)=>{
    const row=document.createElement("div");
    row.className="check";
    row.id=`check-${index}`;
    row.innerHTML=`<div class="icon">•</div><div><div class="name">${check.name}</div><div class="detail">${check.url}</div></div><div class="status">WARTET</div>`;
    checksEl.appendChild(row);
  });
}

function setResult(index,state,status,detail){
  const row=document.getElementById(`check-${index}`);
  row.className=`check ${state}`;
  row.querySelector(".icon").textContent=state==="ok"?"✓":state==="warn"?"!":"×";
  row.querySelector(".status").textContent=status;
  row.querySelector(".detail").textContent=detail;
  results[index]={...checks[index],state,status,detail};
  updateSummary();
  updateReadinessCards();
}

function updateSummary(){
  const done=results.filter(Boolean);
  totalCount.textContent=checks.length;
  okCount.textContent=done.filter(x=>x.state==="ok").length;
  warnCount.textContent=done.filter(x=>x.state==="warn").length;
  badCount.textContent=done.filter(x=>x.state==="bad").length;
}

async function testCheck(check,index){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);

  try{
    const response=await fetch(check.url,{method:"GET",credentials:"same-origin",cache:"no-store",signal:controller.signal});

    if(check.type==="health"){
      const data=await response.json().catch(()=>null);
      if(!response.ok || !data) return setResult(index,"bad",`HTTP ${response.status}`,`${check.url} · Health-Check fehlgeschlagen.`);
      const versionOk=String(data.version||"")===EXPECTED.backend;
      const schemaOk=Number(data.schema_version)===EXPECTED.schema;
      return setResult(index,versionOk&&schemaOk?"ok":"bad",versionOk&&schemaOk?"VERSION OK":"VERSION DRIFT",`${check.url} · Backend ${data.version||"?"} · Schema ${data.schema_version??"?"}`);
    }

    if(check.type==="release-policy"){
      if(response.status===401) return setResult(index,"warn","401 / AUSGELOGGT",`${check.url} · Release-Policy erreichbar; Login erforderlich.`);
      if(!response.ok) return setResult(index,"bad",`HTTP ${response.status}`,`${check.url} · Release-Policy nicht verfügbar.`);
      const data=await response.json().catch(()=>null);
      if(!data) return setResult(index,"bad","KEIN JSON",`${check.url} · Release-Policy ist kein JSON.`);
      const policy=data.policy||{};
      const target=String(policy.build_target_version||"");
      const drift=target && target!==EXPECTED.launcher;
      const installed=String(policy.current_version||data.bridge?.client_version||"");
      const blocked=policy.version_blocked===true || policy.update_required===true || policy.live_allowed===false;
      return setResult(index,drift||blocked?"warn":"ok",drift?"TARGET DRIFT":blocked?"UPDATE / BLOCK":"POLICY OK",`${check.url} · Ziel ${target||"?"}${installed?` · installiert ${installed}`:""}`);
    }

    if(check.type==="account"){
      if(response.status===401){
        return setResult(index,"warn","401 / AUSGELOGGT",`${check.url} · API erreichbar, aber keine aktive Creator-Session.`);
      }
      if(!response.ok){
        return setResult(index,"bad",`HTTP ${response.status}`,`${check.url} · Account API Fehler.`);
      }
      const data=await response.json().catch(()=>null);
      if(data?.authenticated===true && data?.account){
        return setResult(index,"ok","EINGELOGGT",`${check.url} · ${data.account.display_name || data.account.email || "Creator"} · Plan ${String(data.account.plan||"free").toUpperCase()}`);
      }
      return setResult(index,"warn","API OK",`${check.url} · API erreichbar, aber keine erwartete Account-Antwort.`);
    }

    if(check.type==="protected-json"){
      if(response.status===401){
        return setResult(index,"warn","401 / AUSGELOGGT",`${check.url} · Geschützte API erreichbar; Login erforderlich.`);
      }
      if(response.status===403){
        const data=await response.json().catch(()=>({}));
        return setResult(index,"warn","403 / PLAN-SPERRE",`${check.url} · ${data.error || "Für den aktuellen Plan nicht freigeschaltet."}`);
      }
      if(!response.ok){
        return setResult(index,"bad",`HTTP ${response.status}`,`${check.url} · Geschützte API antwortet mit Fehler.`);
      }
      const data=await response.json().catch(()=>null);
      if(!data){
        return setResult(index,"bad","KEIN JSON",`${check.url} · Antwort ist kein JSON.`);
      }
      return setResult(index,"ok","API OK",`${check.url} · geschützte JSON-Antwort erhalten.`);
    }

    if(check.type==="json"){
      if(!response.ok){
        return setResult(index,"bad",`HTTP ${response.status}`,`${check.url} · API antwortet mit Fehler.`);
      }
      const data=await response.json().catch(()=>null);
      if(!data){
        return setResult(index,"bad","KEIN JSON",`${check.url} · Antwort ist kein JSON.`);
      }
      if(check.url==="/api/tiktok/status"){
        return setResult(index,"ok",data.connected?"VERBUNDEN":"API OK",`${check.url} · TikTok ${data.connected?"ist verbunden.":"ist aktuell nicht verbunden."}`);
      }
      return setResult(index,"ok","API OK",`${check.url} · JSON-Antwort erhalten.`);
    }

    if(response.ok){
      return setResult(index,"ok",`HTTP ${response.status}`,`${check.url} · erreichbar`);
    }

    return setResult(index,"bad",`HTTP ${response.status}`,`${check.url} · nicht erfolgreich erreichbar`);
  }catch(error){
    const timedOut=error?.name==="AbortError";
    return setResult(index,"bad",timedOut?"TIMEOUT":"FEHLER",`${check.url} · ${timedOut?"Keine Antwort innerhalb von 10 Sekunden.":error.message}`);
  }finally{
    clearTimeout(timeout);
  }
}

function setReadinessCard(id,state,title,meta){
  const card=document.getElementById(id);
  if(!card)return;
  card.classList.remove("ok","warn","bad");
  if(state)card.classList.add(state);
  const titleEl=document.getElementById(`${id}Title`);
  const metaEl=document.getElementById(`${id}Meta`);
  if(titleEl)titleEl.textContent=title;
  if(metaEl)metaEl.textContent=meta;
}

function updateReadinessCards(){
  const byName=name=>results.find(item=>item?.name===name);
  const health=byName("Backend Health / Version");
  const launcher=byName("Launcher Release Policy");
  const creatorNames=["Games Runtime API","Stream Runtime API","CUT Projects API","NEXUS Status API"];
  const creator=creatorNames.map(byName).filter(Boolean);
  if(health) setReadinessCard("backendReadiness",health.state,health.state==="ok"?"BEREIT":"PRÜFEN",health.detail);
  if(launcher) setReadinessCard("launcherReadiness",launcher.state,launcher.state==="ok"?"KOMPATIBEL":launcher.status,launcher.detail);
  if(creator.length===creatorNames.length){
    const bad=creator.some(item=>item.state==="bad");
    const warn=creator.some(item=>item.state==="warn");
    setReadinessCard("creatorReadiness",bad?"bad":warn?"warn":"ok",bad?"FEHLER":warn?"SESSION / PLAN PRÜFEN":"BEREIT",`${creator.filter(item=>item.state==="ok").length}/${creator.length} Creator-APIs direkt bestätigt`);
  }
}

async function runChecks(){
  runButton.disabled=true;
  runButton.textContent="PRÜFUNG LÄUFT …";
  results.length=0;
  createRows();
  updateSummary();

  for(let index=0;index<checks.length;index++){
    await testCheck(checks[index],index);
  }

  lastRun.textContent="Letzter Test: "+new Date().toLocaleString("de-DE");
  runButton.disabled=false;
  runButton.textContent="SYSTEM CHECK ERNEUT STARTEN";
}

async function copyResults(){
  if(!results.filter(Boolean).length){
    alert("Bitte zuerst den System Check starten.");
    return;
  }

  const text=[
    "cfs_zockt System Check v3",
    new Date().toLocaleString("de-DE"),
    "",
    ...results.filter(Boolean).map(item=>{
      const symbol=item.state==="ok"?"✓":item.state==="warn"?"!":"✗";
      return `${symbol} ${item.name} — ${item.status}\n  ${item.detail}`;
    })
  ].join("\n");

  try{
    await navigator.clipboard.writeText(text);
    const old=copyButton.textContent;
    copyButton.textContent="KOPIERT ✓";
    setTimeout(()=>copyButton.textContent=old,1800);
  }catch{
    window.prompt("Ergebnis kopieren:",text);
  }
}

const checksEl=document.getElementById("checks");
runButton.addEventListener("click",runChecks);
copyButton.addEventListener("click",copyResults);
createRows();
updateSummary();
