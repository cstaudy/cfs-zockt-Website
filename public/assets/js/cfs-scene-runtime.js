(()=>{"use strict";
const root=document.getElementById("cfsSceneRuntime");
const token=new URLSearchParams(location.hash.slice(1)).get("token")||"";
let lastVersion=null;
const visibilityOverrides={};

const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");

function err(message){
  root.innerHTML=`<div class="cfs-scene-error">${esc(message)}</div>`;
}

function effectiveVisible(item){
  const id=String(item?.widget?.id||item?.widget_id||"");
  if(Object.prototype.hasOwnProperty.call(visibilityOverrides,id))return visibilityOverrides[id];
  return item?.visible!==false;
}

function render(payload){
  const scene=payload.scene||{};
  const config=scene.published_config||{};
  const canvas=config.canvas||{};
  root.style.width=`${Number(canvas.width||1080)}px`;
  root.style.height=`${Number(canvas.height||1920)}px`;
  root.style.background=canvas.background||"transparent";
  root.innerHTML=(payload.items||[])
    .sort((a,b)=>(a.z_index||0)-(b.z_index||0))
    .map(item=>{
      const url=item.widget?.source_url||"";
      const widgetId=String(item.widget?.id||item.widget_id||"");
      const width=Number(item.widget?.canvas?.width||600);
      const height=Number(item.widget?.canvas?.height||120);
      if(!url)return"";
      return `<div class="cfs-scene-widget" data-widget-id="${esc(widgetId)}" data-item-id="${esc(item.id||"")}" style="display:${effectiveVisible(item)?"block":"none"};left:${Number(item.x||0)}px;top:${Number(item.y||0)}px;opacity:${item.opacity??1};z-index:${Number(item.z_index||0)};transform:rotate(${Number(item.rotation||0)}deg) scale(${Number(item.scale||1)})"><iframe src="${esc(url)}" width="${width}" height="${height}" scrolling="no"></iframe></div>`;
    }).join("");
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