/* cfs_zockt R8: read-only published OBS output diagnosis. No tokens are persisted or logged. */
(function(root,factory){"use strict";const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root&&root.document)api.init(root.document,root)})(typeof window!=="undefined"?window:null,function(){"use strict";
 const supported=new Map([
  ["/widgets/studio.html",{kind:"Widget Studio",mode:"fragment",api:"/api/widgets/studio/",size:"widget"}],
  ["/widgets/output.html",{kind:"Widget Studio Output",mode:"fragment",api:"/api/widgets/studio/",size:"widget"}],
  ["/widgets/scene.html",{kind:"CFS Scene",mode:"fragment",api:"/api/widgets/scene/",size:"scene"}],
  ["/widgets/stream-maker.html",{kind:"Stream Maker",mode:"search",api:"/api/public/stream-maker/",size:"element"}]
 ]);
 function parseSource(text,origin){
  if(typeof text!=="string"||text.length>4096||!text.trim())return{ok:false,error:"Bitte eine veröffentlichte Browser-Quellen-URL einfügen."};
  let base,url;try{base=new URL(origin);url=new URL(text.trim())}catch{return{ok:false,error:"Das ist keine gültige vollständige URL."}};
  if(base.protocol!=="https:"&&base.hostname!=="localhost"&&base.hostname!=="127.0.0.1")return{ok:false,error:"Quellenprüfung benötigt eine HTTPS-Website."};
  if(url.origin!==base.origin||!['https:','http:'].includes(url.protocol)||url.username||url.password)return{ok:false,error:"Nur Browserquellen dieser cfs_zockt Website werden geprüft. Keine fremden URLs einfügen."};
  const config=supported.get(url.pathname);if(!config)return{ok:false,error:"Das ist keine unterstützte Browserquelle. Kopiere die Ausgabe-URL aus dem Widget Studio oder Stream Maker."};
  const params=new URLSearchParams(config.mode==="fragment"?url.hash.slice(1):url.search.slice(1)),token=params.get("token")||"";
  if(!/^[A-Za-z0-9_-]{16,160}$/.test(token))return{ok:false,error:"Der Ausgabe-Token fehlt oder ist ungültig. Bitte die Quelle neu kopieren."};
  if(config.mode==="search"&&!/^[a-f0-9]{48}$/.test(token))return{ok:false,error:"Der Stream-Maker-Token ist ungültig."};
  const element=config.size==="element"?params.get("element")||"":"";
  if(config.size==="element"&&(!element||element.length>120||!/^[a-zA-Z0-9_-]+$/.test(element)))return{ok:false,error:"Das Stream-Maker-Element fehlt. Bitte im Maker die Quelle des Elements neu kopieren."};
  const layout=config.size==="scene"?(params.get("layout")||params.get("profile")||""):"";
  if(layout&&!['landscape','tiktok_vertical'].includes(layout))return{ok:false,error:"Ungültiges Scene-Layout. Bitte die Original-Quellen-URL erneut kopieren."};
  return{ok:true,url:url.href,kind:config.kind,api:config.api+encodeURIComponent(token),element,size:config.size,layout};
 }
 function pickSize(payload,info){
  if(info.size==="widget"){
   const canvas=payload?.widget?.config?.canvas||{};
   return validSize(canvas.width,canvas.height);
  }
  if(info.size==="scene"){
   // The public scene runtime returns layouts in payload.layouts, not scene.canvas.
   // In particular, vertical scenes must not silently be declared 1920x1080.
   const selected=info.layout||payload?.scene?.profile||"landscape";
   const canvas=payload?.layouts?.[selected]?.canvas||{};
   const size=validSize(canvas.width,canvas.height);
   return size|| (selected==="tiktok_vertical"?{width:1080,height:1920,default:true}:{width:1920,height:1080,default:true});
  }
  if(info.size==="element"){
   // Stream Maker's public API returns {config,server_now}; it has NO ok:true field.
   const elements=payload?.config?.elements;
   if(!Array.isArray(elements))return null;
   const el=elements.find(e=>String(e?.id)===info.element);
   return el?validSize(el.width??el.size?.width,el.height??el.size?.height):null;
  }
  return null;
 }
 function validSize(w,h){const width=Number(w),height=Number(h);return Number.isInteger(width)&&Number.isInteger(height)&&width>=1&&height>=1&&width<=4096&&height<=4096?{width,height}:null}
 async function checkSource(info,fetchFn){
  const response=await fetchFn(info.api,{method:"GET",credentials:"omit",redirect:"manual",cache:"no-store",referrerPolicy:"no-referrer",headers:{Accept:"application/json"}});
  if(response.status===404)return{ok:false,reason:"404: Quelle nicht gefunden, nicht veröffentlicht oder Token ungültig."};
  if(response.status===403)return{ok:false,reason:"403: Provider- oder Beta-Freigabe fehlt."};
  if(response.status===429)return{ok:false,reason:"429: Zu viele Prüfungen. Bitte später erneut versuchen."};
  if(response.type==="opaqueredirect"||response.status>=300&&response.status<400)return{ok:false,reason:"Weiterleitung statt Ausgabe-API. Bitte die URL erneut prüfen."};
  if(!response.ok)return{ok:false,reason:`Der Ausgabedienst meldet HTTP ${response.status}.`};
  let data;try{data=await response.json()}catch{return{ok:false,reason:"Die Ausgabe-API hat kein gültiges JSON zurückgegeben."}};
  if(info.size==="element"){
   // This API has a different response contract and can reflect the current Maker draft.
   if(!data||!data.config||!Array.isArray(data.config.elements))return{ok:false,reason:"Die Stream-Maker-Ausgabe hat keinen gültigen Bundle-Inhalt zurückgegeben."};
  }else if(!data||data.ok!==true){
   return{ok:false,reason:"Die Ausgabe-API hat keine bestätigte Veröffentlichung zurückgemeldet."};
  }
  const size=pickSize(data,info);
  if(info.size==="element"&&!size)return{ok:false,reason:"Das Stream-Maker-Element ist nicht enthalten oder hat ungültige Maße."};
  if(info.size==="widget"&&!size)return{ok:false,reason:"Das veröffentlichte Widget meldet keine gültige Größe."};
  if(info.size==="element")return{ok:true,kind:info.kind,size,warning:"Die aktuelle Stream-Maker-Ausgabe ist erreichbar. Der Maker-Endpunkt liefert die aktuelle Konfiguration; ein separater Shop-Publish-Status ist damit NICHT bestätigt. Sichtbarkeit in OBS und CFS Studio müssen real getestet werden."};
  return{ok:true,kind:info.kind,size,warning:"Die veröffentlichte Ausgabe-API antwortet. Sichtbarkeit in OBS, aktive LIVE-Daten und Launcher-Verbindung sind damit noch nicht bestätigt."};
 }
 function init(doc,win){const input=doc.getElementById("obsSourceUrl");if(!input)return;
  const btn=doc.getElementById("obsCheck"),copy=doc.getElementById("obsCopy"),open=doc.getElementById("obsOpen"),status=doc.getElementById("obsResult"),w=doc.getElementById("obsWidth"),h=doc.getElementById("obsHeight");let verified="";
  function set(msg,type){status.className="obs-result "+type;status.textContent=msg}
  function clear(){verified="";copy.disabled=true;open.setAttribute("aria-disabled","true");open.href="#"}
  input.addEventListener("input",()=>{clear();set("URL geändert – bitte erneut prüfen.","neutral")});
  doc.querySelectorAll("[data-size]").forEach(b=>b.addEventListener("click",()=>{const [a,z]=b.dataset.size.split("x").map(Number);w.value=a;h.value=z}));
  btn.addEventListener("click",async()=>{
   clear();const info=parseSource(input.value,win.location.origin);if(!info.ok){set(info.error,"fail");return}
   btn.disabled=true;set("Website-Ausgabe wird überprüft …","neutral");
   const controller=typeof win.AbortController==="function"?new win.AbortController():null;
   const timeout=controller?win.setTimeout(()=>controller.abort(),10000):null;
   try{const fetchCheck=(url,options)=>win.fetch(url,{...options,...(controller?{signal:controller.signal}:{})});
    const result=await checkSource(info,fetchCheck);if(!result.ok){set(result.reason,"fail");return}
    verified=info.url;copy.disabled=false;open.href=verified;open.setAttribute("aria-disabled","false");
    if(result.size){w.value=result.size.width;h.value=result.size.height}
    set(`${result.kind}: ${result.warning} Empfohlene Größe: ${w.value} × ${h.value} px.`,"ok");
   }catch(e){set(e?.name==="AbortError"?"Zeitüberschreitung bei der Ausgabe-Prüfung. Bitte später erneut versuchen.":"Ausgabe-API nicht erreichbar. Bitte Website-Verbindung und Veröffentlichung prüfen.","warn")}finally{if(timeout!==null)win.clearTimeout(timeout);btn.disabled=false}
  });
  copy.addEventListener("click",async()=>{if(!verified)return;try{await win.navigator.clipboard.writeText(verified);set("Browserquellen-URL kopiert. Jetzt in OBS einfügen.","ok")}catch{set("Automatisches Kopieren blockiert. Bitte die URL oben manuell kopieren.","warn")}});
  open.addEventListener("click",e=>{if(!verified)e.preventDefault()});
 }
 return{parseSource,checkSource,pickSize,init};
});
