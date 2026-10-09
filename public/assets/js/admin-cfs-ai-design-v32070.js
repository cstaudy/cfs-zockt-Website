(()=>{"use strict";
const $=id=>document.getElementById(id); const base="/api/admin/cfs-ai/design-factory";
const state={gateway:null,status:null,items:[],busy:false,connected:false};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validId=id=>/^[a-f0-9]{32}$/.test(String(id||""));
const announce=(message,bad=false)=>{const el=$("aiAdminNotice");if(el){el.textContent=String(message);el.dataset.level=bad?"bad":"ok";}};
const text=(id,value)=>{const el=$(id);if(el)el.textContent=String(value??"–")};
const date=value=>{if(!value)return "–";const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString("de-DE"):"–";};
const call=async(path,opts={})=>{const data=await CFS.json(`${base}${path}`,opts);if(data?.ok===false)throw Error(data.error||"CFS AI antwortet nicht.");return data;};
const post=(path,body={})=>call(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
function displayStatus(value){
 const gateway=value?.gateway||{};const status=value?.design_factory||null;
 state.status=status;state.gateway=gateway;state.connected=Boolean(status);
 const name=!gateway.enabled?"DEAKTIVIERT":gateway.transport==="bridge"&&value?.worker_online===false?"WORKER OFFLINE":status?"VERBUNDEN":"NICHT ERREICHBAR";
 text("aiAdminConnection",name);text("aiAdminPending",status?.pending);text("aiAdminApproved",status?.approved);text("aiAdminLastRun",date(status?.last_run_at));
 for(const id of ["aiAdminSave","aiAdminRun","aiAdminExport"]){const el=$(id);if(el)el.disabled=!state.connected;}
 if(status?.settings){const s=status.settings;$("aiAdminEnabled").checked=s.enabled===true;$("aiAdminHint").value=s.hint||"";$("aiAdminInterval").value=s.interval_hours??12;$("aiAdminMaxDay").value=s.max_per_day??2;$("aiAdminMaxPending").value=s.max_pending??12;}
 announce(!gateway.enabled?"Die Website hat CFS AI noch nicht aktiviert (CFS_AI_ENABLED).":!status?"CFS AI ist nicht erreichbar. Bitte lokalen Dienst und Bridge prüfen.":`CFS AI ist erreichbar. Hintergrundproduktion ${status.settings?.enabled?"AKTIV":"AUS"}. Keine automatische Shop-Veröffentlichung.`,!status);
}
function gallery(){const host=$("aiAdminGallery"),filter=$("aiAdminFilter")?.value||"all";if(!host)return;
 const rows=state.items.filter(i=>filter==="all"||i.status===filter).filter(i=>validId(i.id));
 if(!rows.length){host.innerHTML='<p class="cfs-ai-empty">Keine Designentwürfe in dieser Auswahl.</p>';return;}
 host.innerHTML=rows.map(i=>{const id=i.id,name=esc(i.blueprint?.name||i.name||"Unbenannter Entwurf"),cat=esc(i.blueprint?.category||i.category||"Design"),descr=esc(i.blueprint?.description||"");const status=i.status||"draft";
 return `<article class="cfs-ai-draft"><img loading="lazy" alt="Vorschau ${name}" src="${base}/drafts/${id}/preview"><div class="cfs-ai-draft-body"><div class="cfs-ai-draft-title"><strong>${name}</strong><span>${esc(status)}</span></div><small>${cat} · ${esc(date(i.created_at))}</small><p>${descr}</p>${status==="draft"?`<div class="cfs-ai-actions"><button class="btn primary" data-ai-action="approve" data-ai-id="${id}">FREIGEBEN</button><button class="btn" data-ai-action="reject" data-ai-id="${id}">ABLEHNEN</button></div>`:'<small>Kein automatischer Live-Upload.</small>'}</div></article>`;}).join("");
 host.querySelectorAll("[data-ai-action]").forEach(b=>b.addEventListener("click",()=>act(b.dataset.aiAction,b.dataset.aiId)));
}
const bridgeBase="/api/creator/cfs-ai/bridge";
async function bridgeRefresh(){
 try{
   const r=await CFS.json(bridgeBase);
   if(r?.ok===false)throw Error(r.error||"Bridge nicht erreichbar");
   const labels={verified:"ENDE-ZU-ENDE BESTÄTIGT",heartbeat_only:"WORKER VERBUNDEN – RPC UNBESTÄTIGT",offline:"WORKER OFFLINE",disabled:"CFS AI DEAKTIVIERT",not_configured:"BRIDGE NICHT KONFIGURIERT",direct:"DIREKT-MODUS"};
   text("aiBridgeProof",labels[r.mode]||"STATUS UNBEKANNT");
   text("aiBridgeHeartbeat",date(r.last_heartbeat_at));
   text("aiBridgeDetails",`Lokaler Dienst: ${r.local_service_online?"erreichbar":"nicht bestätigt"} · Ollama: ${r.ollama_online?"online":"nicht bestätigt"} · Letzte erfolgreiche RPC-Antwort: ${date(r.last_successful_rpc_at)}.`);
 }catch(error){text("aiBridgeProof","STATUS NICHT LESBAR");text("aiBridgeDetails",String(error.message||error));}
}
async function bridgeVerify(){
 const b=$("aiBridgeVerify");if(!b||b.disabled)return;
 b.disabled=true;text("aiBridgeProof","TEST LÄUFT ...");
 try{
   const r=await CFS.json(`${bridgeBase}/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
   if(!r?.verified)throw Error(r?.error||"Kein erfolgreicher Ende-zu-Ende-Nachweis");
   announce("Cloud-Bridge: Ende-zu-Ende-Test über die Website erfolgreich.");
 }catch(error){announce(`Bridge-Test fehlgeschlagen: ${error.message||error}`,true);}
 finally{b.disabled=false;await bridgeRefresh();}
}
async function refresh(){if(state.busy)return;state.busy=true;try{const status=await call("/status");displayStatus(status);await bridgeRefresh();if(state.connected){const data=await call("/drafts");state.items=Array.isArray(data.items)?data.items:[];gallery();}else{state.items=[];gallery();}}catch(e){state.connected=false;state.items=[];gallery();announce(e.message,true);text("aiAdminConnection","FEHLER");}finally{state.busy=false;}}
async function act(action,id){if(state.busy||!validId(id)||!["approve","reject"].includes(action))return;
 if(!confirm(action==="approve"?"Diesen Entwurf für den LOKALEN Shop-Export freigeben? Es erfolgt kein Live-Upload.":"Entwurf ablehnen?"))return;
 state.busy=true;try{await post(`/drafts/${id}/${action}`);announce(action==="approve"?"Für lokalen Shop-Export freigegeben.":"Entwurf abgelehnt.");}catch(e){announce(e.status===428?"Admin-Schutz oben zuerst entsperren.":e.message,true);}finally{state.busy=false;await refresh();}}
async function save(){if(state.busy)return;const number=(id,min,max)=>{const n=Number($(id).value);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`Bitte gültigen Wert zwischen ${min} und ${max} eingeben.`);return n;};
 try{const payload={enabled:$("aiAdminEnabled").checked,hint:$("aiAdminHint").value.trim(),interval_hours:number("aiAdminInterval",1,168),max_per_day:number("aiAdminMaxDay",1,12),max_pending:number("aiAdminMaxPending",1,40)};
 state.busy=true;await post("/settings",payload);announce("Einstellungen gespeichert.");}catch(e){announce(e.status===428?"Bitte oben Admin-Schutz entsperren.":e.message,true);}finally{state.busy=false;await refresh();}}
async function run(){if(state.busy||!confirm("Jetzt lokal einen neuen Designentwurf erstellen? Dies kann bis zu zwei Minuten dauern."))return;
 state.busy=true;announce("CFS AI erstellt einen Entwurf. Bitte warten …");try{const response=await post("/run-now");announce(response?.skipped?`Kein neuer Entwurf: ${response.skipped}`:"Neuer Entwurf erstellt – bitte Vorschau prüfen.");}catch(e){announce(e.status===428?"Bitte oben Admin-Schutz entsperren.":e.message,true);}finally{state.busy=false;await refresh();}}
async function download(){if(state.busy)return;state.busy=true;try{
 // A protected GET requiring elevated admin access; attachment is NEVER auto-installed.
 const resp=await fetch(`${base}/export`,{credentials:"same-origin",cache:"no-store"});
 if(!resp.ok){let msg=`Export nicht möglich (${resp.status})`;try{const d=await resp.json();msg=d.error||msg;}catch{}throw Error(msg);}
 const content=await resp.blob();if(content.size>2_000_000)throw Error("Export überschreitet das zulässige Limit.");
 const url=URL.createObjectURL(content);const link=document.createElement("a");link.href=url;link.download="cfs-ai-approved-shop-assets.zip";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);announce("ZIP heruntergeladen. Vor der Übernahme in den Shop manuell prüfen.");
 }catch(e){announce(e.message,true);}finally{state.busy=false;}}
document.addEventListener("DOMContentLoaded",()=>{const pane=$("adminAiDesignPanel");if(!pane)return;
 pane.addEventListener("toggle",()=>{if(pane.open)refresh();});$("aiAdminRefresh")?.addEventListener("click",refresh);$("aiBridgeVerify")?.addEventListener("click",bridgeVerify);
 $("aiAdminFilter")?.addEventListener("change",gallery);$("aiAdminSave")?.addEventListener("click",save);
 $("aiAdminRun")?.addEventListener("click",run);$("aiAdminExport")?.addEventListener("click",download);
 if(pane.open)refresh();
});
})();
