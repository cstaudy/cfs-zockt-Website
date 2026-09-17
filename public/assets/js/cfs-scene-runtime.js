(()=>{"use strict";

const root=document.getElementById("cfsSceneRuntime");
const params=new URLSearchParams(location.hash.slice(1));
const token=params.get("token")||"";
const requestedLayout=["landscape","tiktok_vertical"].includes(params.get("layout"))?params.get("layout"):"";
const outputMode=params.get("mode")==="recording"?"recording":"live";
let lastVersion=null;
let currentLayer=null;
const visibilityOverrides={};

const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const TRANSITIONS=new Set(["cut","fade","dissolve","slide_left","slide_right","slide_up","zoom"]);
const EASINGS=new Set(["smooth","ease","ease_in_out","linear"]);

function err(message){
  root.innerHTML=`<div class="cfs-scene-error">${esc(message)}</div>`;
}

function normalizeTransition(input={}){
  const source=input&&typeof input==="object"?input:{};
  const type=TRANSITIONS.has(String(source.type||""))?String(source.type):"cut";
  const easing=EASINGS.has(String(source.easing||""))?String(source.easing):"smooth";
  const raw=Number(source.duration_ms??source.durationMs);
  const duration_ms=type==="cut"?0:Math.round(Math.max(120,Math.min(2500,Number.isFinite(raw)?raw:450)));
  return{type,duration_ms,easing};
}

function easingCss(key){
  return {smooth:"cubic-bezier(.16,1,.3,1)",ease:"ease",ease_in_out:"ease-in-out",linear:"linear"}[key]||"cubic-bezier(.16,1,.3,1)";
}

function transitionFrames(type,direction="in"){
  const incoming=direction==="in";
  if(type==="fade")return incoming?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}];
  if(type==="dissolve")return incoming?[{opacity:0,filter:"blur(14px)"},{opacity:1,filter:"blur(0px)"}]:[{opacity:1,filter:"blur(0px)"},{opacity:0,filter:"blur(10px)"}];
  if(type==="slide_left")return incoming?[{opacity:.2,transform:"translateX(9%)"},{opacity:1,transform:"translateX(0)"}]:[{opacity:1,transform:"translateX(0)"},{opacity:0,transform:"translateX(-6%)"}];
  if(type==="slide_right")return incoming?[{opacity:.2,transform:"translateX(-9%)"},{opacity:1,transform:"translateX(0)"}]:[{opacity:1,transform:"translateX(0)"},{opacity:0,transform:"translateX(6%)"}];
  if(type==="slide_up")return incoming?[{opacity:.2,transform:"translateY(8%)"},{opacity:1,transform:"translateY(0)"}]:[{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(-5%)"}];
  if(type==="zoom")return incoming?[{opacity:0,transform:"scale(1.055)"},{opacity:1,transform:"scale(1)"}]:[{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(.975)"}];
  return null;
}

function effectiveVisible(item){
  const id=String(item?.widget?.id||item?.widget_id||"");
  if(Object.prototype.hasOwnProperty.call(visibilityOverrides,id))return visibilityOverrides[id];
  return item?.visible!==false;
}

function routeAllows(item,layoutKey){
  const route=item?.routing&&typeof item.routing==="object"?item.routing:{};
  if(outputMode==="recording"&&route.recording===false)return false;
  if(outputMode!=="recording"&&route.live===false)return false;
  if(layoutKey==="landscape"&&route.landscape===false)return false;
  if(layoutKey==="tiktok_vertical"&&route.tiktok_vertical===false)return false;
  return true;
}

function filterCss(input={}){
  const n=(value,min,max,fallback)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.max(min,Math.min(max,parsed)):fallback};
  const brightness=n(input?.brightness,.25,2,1);
  const contrast=n(input?.contrast,.25,2,1);
  const saturation=n(input?.saturation,0,3,1);
  const blur=n(input?.blur_px??input?.blurPx,0,20,0);
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${blur}px)`;
}

function buildLayer(payload,layoutKey){
  const layer=document.createElement("div");
  layer.className="cfs-scene-layer";
  layer.dataset.outputMode=outputMode;
  layer.innerHTML=(payload.items||[])
    .filter(item=>routeAllows(item,layoutKey))
    .sort((a,b)=>(a.z_index||0)-(b.z_index||0))
    .map(item=>{
      const url=item.widget?.source_url||"";
      const widgetId=String(item.widget?.id||item.widget_id||"");
      const width=Number(item.widget?.canvas?.width||600);
      const height=Number(item.widget?.canvas?.height||120);
      if(!url)return"";
      return `<div class="cfs-scene-widget" data-widget-id="${esc(widgetId)}" data-item-id="${esc(item.id||"")}" style="display:${effectiveVisible(item)?"block":"none"};left:${Number(item.x||0)}px;top:${Number(item.y||0)}px;opacity:${item.opacity??1};z-index:${Number(item.z_index||0)};transform:rotate(${Number(item.rotation||0)}deg) scale(${Number(item.scale||1)});filter:${filterCss(item.filters)}"><iframe src="${esc(url)}" width="${width}" height="${height}" scrolling="no"></iframe></div>`;
    }).join("");
  return layer;
}

function runAnimation(node,frames,transition){
  if(!node||!frames||transition.type==="cut"||typeof node.animate!=="function")return null;
  try{
    return node.animate(frames,{duration:transition.duration_ms,easing:easingCss(transition.easing),fill:"both"});
  }catch{
    return null;
  }
}

function render(payload){
  const scene=payload.scene||{};
  const config=scene.published_config||{};
  const layoutKey=requestedLayout||config.profile||"tiktok_vertical";
  const layout=payload.layouts?.[layoutKey]||{canvas:config.canvas||{},items:payload.items||[]};
  const canvas=layout.canvas||{};
  const transition=normalizeTransition(config.transition);
  root.style.width=`${Number(canvas.width||1080)}px`;
  root.style.height=`${Number(canvas.height||1920)}px`;
  root.style.background=canvas.background||"transparent";

  const nextLayer=buildLayer({...payload,items:layout.items||[]},layoutKey);
  nextLayer.dataset.transition=transition.type;
  root.appendChild(nextLayer);

  const previous=currentLayer;
  currentLayer=nextLayer;

  if(!previous){
    const incoming=runAnimation(nextLayer,transitionFrames(transition.type,"in"),transition);
    incoming?.finished?.catch?.(()=>{});
    return;
  }

  if(transition.type==="cut"){
    previous.remove();
    return;
  }

  const incoming=runAnimation(nextLayer,transitionFrames(transition.type,"in"),transition);
  const outgoing=runAnimation(previous,transitionFrames(transition.type,"out"),transition);
  const cleanup=()=>{if(previous.isConnected)previous.remove()};
  if(outgoing?.finished)outgoing.finished.then(cleanup).catch(cleanup);
  else if(incoming?.finished)incoming.finished.then(cleanup).catch(cleanup);
  else setTimeout(cleanup,transition.duration_ms+80);
}

function setWidgetVisibility(widgetId,visible){
  const id=String(widgetId||"");
  if(!id)return;
  visibilityOverrides[id]=Boolean(visible);
  root.querySelectorAll(".cfs-scene-widget").forEach(node=>{
    if(node.dataset.widgetId===id)node.style.display=visible?"block":"none";
  });
}

function forwardTestEvent(event){
  root.querySelectorAll("iframe").forEach(frame=>{
    try{frame.contentWindow?.postMessage({type:"cfs:test-event",event},"*")}catch{}
  });
}

window.addEventListener("message",event=>{
  const data=event?.data||{};
  if(data.type==="cfs:widget-visibility"){
    setWidgetVisibility(data.widget_id,data.visible!==false);
  }
  if(data.type==="cfs:test-event"&&data.event){
    forwardTestEvent(data.event);
  }
});

async function tick(){
  if(!token){err("Scene Token fehlt.");return}
  try{
    const response=await fetch("/api/widgets/scene/"+encodeURIComponent(token),{cache:"no-store"});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||"Scene konnte nicht geladen werden.");
    if(lastVersion!==payload.scene?.version){
      render(payload);
      lastVersion=payload.scene?.version;
    }
  }catch(error){
    if(lastVersion===null)err(error.message);
  }
}

tick();
setInterval(tick,3000);
})();