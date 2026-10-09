/* cfs_zockt R10: opt-in read-only creator readiness + manually entered QA report. */
(function(root,factory){"use strict";const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root&&root.document)api.init(root.document,root);})(typeof window!=="undefined"?window:null,function(){"use strict";
const CASES=Object.freeze([
 ["OBS-01","Widget in Widget Studio veröffentlicht (LIVE-Status und URL)"],
 ["OBS-02","Öffentliche Widget-Ausgabe wird über den Quellencheck erreicht"],
 ["OBS-03","Widget ist als Browserquelle in OBS sichtbar und maßstabsgerecht"],
 ["OBS-04","Nicht veröffentlichte Änderung bleibt in OBS unsichtbar"],
 ["OBS-05","Neu veröffentlichte Version erscheint nach OBS-Aktualisierung"],
 ["OBS-06","Launcher + OBS WebSocket: Installationsauftrag bestätigt (acked)"],
 ["OBS-07","Das veröffentlichte Widget funktioniert auch in CFS Studio"],
 ["OBS-08","Stream-Maker-Element funktioniert mit eigenen Maßen in OBS"],
 ["OBS-09","LIVE-Daten/Alerts kommen aus einer echten verbundenen Plattform"],
 ["OBS-10","Rotation oder Widerruf des Tokens deaktiviert alte Ausgabe-URL"],
 ["OBS-11","Fremder Account erhält keinen unberechtigten Zugriff"],
 ["OBS-12","Neustart/Reconnect funktioniert ohne doppelte Quelle"]
]);
const STATUS=Object.freeze(["offen","bestanden","fehlgeschlagen","blockiert"]);
const READINESS_KEYS=Object.freeze(["account","provider","launcher","obs","widget"]);
function sanitizeSteps(payload){
 if(!payload||payload.ok!==true||!Array.isArray(payload.steps))return[];
 return READINESS_KEYS.map(key=>{
  const step=payload.steps.find(s=>s&&s.key===key);
  return{key,label:String(step?.label||key).slice(0,50),ready:step?.ready===true,detail:String(step?.detail||"Kein Status verfügbar").slice(0,180)};
 });
}
function createReport(statuses,now=new Date()){
 const date=now instanceof Date&&!Number.isNaN(now.getTime())?now.toISOString():new Date(0).toISOString();
 const rows=CASES.map(([id,label])=>({id,label,status:STATUS.includes(statuses?.[id])?statuses[id]:"offen"}));
 const counts={passed:rows.filter(r=>r.status==="bestanden").length,checked:rows.filter(r=>r.status!=="offen").length,failed:rows.filter(r=>r.status==="fehlgeschlagen").length,blocked:rows.filter(r=>r.status==="blockiert").length};
 const lines=["# cfs_zockt · OBS / CFS Studio Realtest (R10)","",`Datum (UTC): ${date}`,"Status: NICHT AUTOMATISCH ABGENOMMEN · Beta HOLD",`Manuell geprüft: ${counts.checked}/12 · Bestanden: ${counts.passed}/12 · Fehlgeschlagen: ${counts.failed} · Blockiert: ${counts.blocked}`,"","Ergebnis | Testfall", "--- | ---"];
 for(const row of rows)lines.push(`${row.status.toUpperCase()} | ${row.id} · ${row.label}`);
 lines.push("","Nur selbst eingetragene Ergebnisse. Keine Prüfung durch ChatGPT oder durch eine Website-Verbindung bestätigt.","Dieses Protokoll enthält keine Token, Quell-URLs, Kennwörter oder Accountdaten.");
 return{counts,text:lines.join("\n")+"\n"};
}
async function fetchReadiness(fetchFn){
 const res=await fetchFn("/api/creator/stream-ready",{method:"GET",credentials:"same-origin",cache:"no-store",redirect:"manual",headers:{Accept:"application/json"}});
 if(res.status===401||res.status===403)return{ok:false,reason:"Nicht angemeldet oder keine Creator-Berechtigung. Bitte anmelden und erneut prüfen."};
 if(res.type==="opaqueredirect"||res.status>=300&&res.status<400)return{ok:false,reason:"Anmeldung erforderlich. Die Statusabfrage wurde weitergeleitet."};
 if(!res.ok)return{ok:false,reason:`Statusdienst antwortet mit HTTP ${res.status}.`};
 let data;try{data=await res.json()}catch{return{ok:false,reason:"Keine gültige Statusantwort erhalten."}};
 if(data?.ok!==true)return{ok:false,reason:"Die Website hat keine bestätigten Bereitschaftsdaten geliefert."};
 return{ok:true,steps:sanitizeSteps(data),ready:data.ready===true};
}
function init(doc,win){const refresh=doc.getElementById("obsReadinessRefresh"),result=doc.getElementById("obsReadinessResult"),grid=doc.getElementById("obsReadinessSteps"),checks=doc.getElementById("obsBetaChecks"),progress=doc.getElementById("obsBetaProgress"),download=doc.getElementById("obsReportDownload");if(!refresh||!result||!grid||!checks||!download)return;
 const statuses=Object.create(null);
 const updateProgress=()=>{const r=createReport(statuses);progress.textContent=`${r.counts.checked}/12 manuell geprüft · ${r.counts.passed}/12 bestanden · Beta bleibt HOLD`;};
 CASES.forEach(([id,label])=>{const row=doc.createElement("label");row.className="obs-check-item";const title=doc.createElement("span");title.textContent=id+" · "+label;const select=doc.createElement("select");select.setAttribute("aria-label",`Testergebnis ${id}`);select.dataset.caseId=id;STATUS.forEach(status=>{const option=doc.createElement("option");option.value=status;option.textContent=status.charAt(0).toUpperCase()+status.slice(1);select.append(option)});select.addEventListener("change",()=>{statuses[id]=select.value;updateProgress()});row.append(title,select);checks.append(row)});
 updateProgress();
 refresh.addEventListener("click",async()=>{refresh.disabled=true;result.className="obs-result neutral";result.textContent="Creator-Bereitschaft wird abgerufen …";grid.replaceChildren();const ctl=typeof win.AbortController==="function"?new win.AbortController():null;const timeout=ctl?win.setTimeout(()=>ctl.abort(),10000):null;try{const response=await fetchReadiness((url,options)=>win.fetch(url,{...options,...(ctl?{signal:ctl.signal}:{})}));if(!response.ok){result.className="obs-result warn";result.textContent=response.reason;return;}const readyCount=response.steps.filter(s=>s.ready).length;result.className="obs-result "+(readyCount===5?"ok":"warn");result.textContent=`${readyCount}/5 Creator-Voraussetzungen laut Website-Status erfüllt. Das ist keine bestätigte OBS-Anzeige.`;response.steps.forEach(step=>{const item=doc.createElement("div");item.className="obs-readiness-item";item.dataset.ready=step.ready?"yes":"no";const heading=doc.createElement("strong");heading.textContent=`${step.ready?"✓":"–"} ${step.label}`;const detail=doc.createElement("span");detail.textContent=step.detail;item.append(heading,detail);grid.append(item)});}catch(error){result.className="obs-result warn";result.textContent=error?.name==="AbortError"?"Statusabfrage nach 10 Sekunden abgebrochen.":"Creator-Status aktuell nicht erreichbar.";}finally{if(timeout!==null)win.clearTimeout(timeout);refresh.disabled=false;}});
 download.addEventListener("click",()=>{const report=createReport(statuses);const blob=new win.Blob([report.text],{type:"text/markdown;charset=utf-8"});const url=win.URL.createObjectURL(blob);const link=doc.createElement("a");link.href=url;link.download="cfs_zockt-OBS-Beta-Pruefung-R10.md";link.hidden=true;doc.body.append(link);try{link.click()}finally{link.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000)}});
}
return{CASES,STATUS,sanitizeSteps,createReport,fetchReadiness,init};
});
