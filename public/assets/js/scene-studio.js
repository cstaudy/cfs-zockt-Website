(()=>{"use strict";

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={scenes:[],widgets:[],scene:null,config:null,selected:null,zoom:.38,dirty:false,drag:null,maxScenes:0,entitlements:{}};
const clone=v=>JSON.parse(JSON.stringify(v));
const TRANSITIONS=new Set(["cut","fade","dissolve","slide_left","slide_right","slide_up","zoom"]);
const EASINGS=new Set(["smooth","ease","ease_in_out","linear"]);

function toast(msg,bad=false){
  const e=$("#sceneToast");e.textContent=msg;e.style.borderColor=bad?"#713441":"#1d5d86";e.hidden=false;
  clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2500);
}
function profile(){return state.config?.profile==="landscape"?{key:"landscape",width:1920,height:1080}:{key:"tiktok_vertical",width:1080,height:1920}}
function widgetById(id){return state.widgets.find(w=>String(w.id)===String(id))}
function selectedItem(){return state.config?.items?.find(i=>i.id===state.selected)||null}
function transitionDefaults(){return{type:"cut",duration_ms:0,easing:"smooth"}}
function normalizeTransition(input={}){
  const source=input&&typeof input==="object"?input:{},type=TRANSITIONS.has(String(source.type||""))?String(source.type):"cut",easing=EASINGS.has(String(source.easing||""))?String(source.easing):"smooth";
  const raw=Number(source.duration_ms??source.durationMs),duration_ms=type==="cut"?0:Math.round(Math.max(120,Math.min(2500,Number.isFinite(raw)?raw:450)));
  return{type,duration_ms,easing};
}
function transitionLabel(input={}){
  return {cut:"Schnitt",fade:"Fade",dissolve:"Dissolve",slide_left:"Slide rechts",slide_right:"Slide links",slide_up:"Slide hoch",zoom:"Zoom"}[normalizeTransition(input).type]||"Schnitt";
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
function previewTransition(node,transition=state.config?.transition){
  if(!node)return;
  const t=normalizeTransition(transition);
  if(t.type==="cut"){toast("Schnitt hat keine Animationsdauer.");return}
  if(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches){toast("Transitions-Vorschau ist wegen reduzierter Bewegung deaktiviert.");return}
  const frames=transitionFrames(t.type,"in");
  if(!frames||typeof node.animate!=="function"){toast("Übergang kann in diesem Browser nicht animiert werden.",true);return}
  node.getAnimations?.().forEach(animation=>animation.cancel());
  node.animate(frames,{duration:t.duration_ms,easing:easingCss(t.easing),fill:"both"});
}
function sceneDefaults(key="tiktok_vertical"){
  const l=key==="landscape";
  return{version:1,profile:l?"landscape":"tiktok_vertical",canvas:{width:l?1920:1080,height:l?1080:1920,background:"transparent",safe_area:true},transition:transitionDefaults(),items:[]};
}
function defaultItem(widget,index){
  const p=profile(),cw=Number(widget.canvas?.width||600);
  return{id:`item_${Date.now()}_${index}`,widget_id:String(widget.id),visible:true,x:Math.round(p.width/2-cw/2),y:Math.round(p.height*.22+index*45),scale:1,opacity:1,rotation:0,z_index:index,locked:false};
}
function dirty(){state.dirty=true}
function fit(){
  if(!state.config)return;
  const p=profile(),maxW=Math.min(900,Math.max(320,innerWidth-560)),fitScale=Math.min(maxW/p.width,610/p.height),scale=Math.max(.12,Math.min(1.25,state.zoom||fitScale));
  state.config.canvas.width=p.width;state.config.canvas.height=p.height;
  const v=$("#sceneViewport"),c=$("#sceneCanvas");
  v.style.width=Math.round(p.width*scale)+"px";v.style.height=Math.round(p.height*scale)+"px";
  c.style.width=p.width+"px";c.style.height=p.height+"px";c.style.transform=`scale(${scale})`;c.style.background=state.config.canvas.background||"transparent";
  const g=$("#sceneSafeGuide"),vertical=p.key==="tiktok_vertical",mx=vertical?70:60,my=vertical?120:54;
  g.hidden=state.config.canvas.safe_area===false;g.style.left=mx+"px";g.style.top=my+"px";g.style.right=mx+"px";g.style.bottom=my+"px";
  $("#sceneZoom").textContent=Math.round(scale*100)+"%";
}
function renderScenes(){
  $("#sceneCount").textContent=state.scenes.length;
  $("#sceneList").innerHTML=state.scenes.length?state.scenes.map(s=>{
    const transition=s.draft_config?.transition||s.published_config?.transition||transitionDefaults();
    return `<div class="scene-list-item ${state.scene?.id===s.id?"active":""}" data-scene="${CFS.escape(s.id)}"><strong>${CFS.escape(s.name)}</strong><small>${s.profile==="landscape"?"16:9 · 1920×1080":"TikTok · 1080×1920"} · ${CFS.escape(transitionLabel(transition))}</small><span class="scene-mini-status ${s.status==="live"?"live":""}">${s.status==="live"?"LIVE":"DRAFT"}</span></div>`;
  }).join(""):'<div class="scene-hint">Noch keine Scenes.</div>';
}
function renderLibrary(){
  $("#widgetCount").textContent=state.widgets.length;
  $("#widgetLibrary").innerHTML=state.widgets.length?state.widgets.map(w=>`<div class="widget-library-item" data-add-widget="${CFS.escape(w.id)}"><strong>${CFS.escape(w.name)}</strong><small>${CFS.escape(w.widget_type)} · ${Number(w.canvas?.width||600)}×${Number(w.canvas?.height||120)}</small></div>`).join(""):'<div class="scene-hint">Veröffentliche zuerst ein Widget.</div>';
}
function renderItems(){
  if(!state.config)return;
  $("#sceneItems").innerHTML=[...(state.config.items||[])].sort((a,b)=>(a.z_index||0)-(b.z_index||0)).map(item=>{
    const w=widgetById(item.widget_id),url=w?.source_urls?.obs||w?.source_url;if(!w||!url)return"";
    const width=Number(w.canvas?.width||600),height=Number(w.canvas?.height||120);
    return`<div class="scene-item ${item.id===state.selected?"selected":""}" data-item="${CFS.escape(item.id)}" style="left:${item.x}px;top:${item.y}px;opacity:${item.visible===false?0:item.opacity};z-index:${item.z_index};transform:rotate(${item.rotation||0}deg) scale(${item.scale||1})"><iframe src="${CFS.escape(url)}" width="${width}" height="${height}" scrolling="no"></iframe></div>`;
  }).join("");
}
function props(){
  const i=selectedItem(),p=$("#sceneProperties");p.hidden=!i;if(!i)return;
  const w=widgetById(i.widget_id);$("#selectedItemName").textContent=w?.name||"Widget";
  $("#itemX").value=i.x;$("#itemY").value=i.y;$("#itemScale").value=i.scale;$("#itemRotation").value=i.rotation||0;$("#itemOpacity").value=i.opacity;$("#itemZ").value=i.z_index;
  $("#toggleItemVisible").textContent=i.visible===false?"EINBLENDEN":"AUSBLENDEN";
}
function syncTransitionControls(){
  if(!state.config)return;
  state.config.transition=normalizeTransition(state.config.transition);
  const t=state.config.transition,type=$("#sceneTransition"),duration=$("#sceneTransitionDuration"),durationValue=$("#sceneTransitionDurationValue"),ease=$("#sceneTransitionEase"),preview=$("#previewSceneTransition");
  if(type)type.value=t.type;
  if(duration){duration.value=String(t.type==="cut"?450:t.duration_ms||450);duration.disabled=t.type==="cut";}
  if(durationValue)durationValue.textContent=t.type==="cut"?"0 ms":`${t.duration_ms} ms`;
  if(ease){ease.value=t.easing;ease.disabled=t.type==="cut";}
  if(preview)preview.disabled=t.type==="cut";
}
function editor(){
  const active=!!state.scene;$("#sceneEmpty").hidden=active;$("#sceneEditor").hidden=!active;if(!active)return;
  state.config.transition=normalizeTransition(state.config.transition);
  $("#sceneName").value=state.scene.name;$("#sceneStatus").textContent=state.scene.status==="live"?"LIVE":"DRAFT";$("#sceneStatus").className="scene-status"+(state.scene.status==="live"?" live":"");
  $("#sceneProfile").value=state.config.profile;$("#sceneBackground").value=state.config.canvas.background||"transparent";$("#sceneSafeArea").checked=state.config.canvas.safe_area!==false;
  syncTransitionControls();
  const url=state.scene.status==="live"?state.scene.source_url||"":"";
  $("#sceneOutputUrl").value=url;$("#openSceneUrl").href=url||"#";$("#openSceneUrl").style.pointerEvents=url?"auto":"none";$("#copySceneUrl").disabled=!url;
  fit();renderItems();props();
}
function render(){renderScenes();renderLibrary();editor()}
async function load(){
  const d=await CFS.json("/api/creator/widget-studio/scenes");
  state.scenes=d.scenes||[];state.widgets=d.widgets||[];state.maxScenes=Number(d.limits?.max_scenes||0);state.entitlements=d.entitlements||{};
  if(state.scene){
    const f=state.scenes.find(s=>s.id===state.scene.id);
    if(f){state.scene=f;state.config=clone(f.draft_config||sceneDefaults(f.profile));state.config.transition=normalizeTransition(state.config.transition)}
  }
  render();
}
async function create(key){
  if(state.maxScenes&&state.scenes.length>=state.maxScenes){toast(`Dein Zugriff erlaubt maximal ${state.maxScenes} Scenes.`,true);return}
  const d=await CFS.json("/api/creator/widget-studio/scenes",{method:"POST",body:JSON.stringify({name:key==="landscape"?"Neue 16:9 Scene":"Neue TikTok Scene",profile:key,config:sceneDefaults(key)})});
  state.scene=d.scene;state.config=clone(d.scene.draft_config);state.config.transition=normalizeTransition(state.config.transition);state.selected=null;await load();toast("Scene erstellt.");
}
function open(id){
  const s=state.scenes.find(x=>String(x.id)===String(id));if(!s)return;
  state.scene=s;state.config=clone(s.draft_config||sceneDefaults(s.profile));state.config.transition=normalizeTransition(state.config.transition);state.selected=null;state.dirty=false;
  const p=profile();state.zoom=Math.min(Math.min(900,Math.max(320,innerWidth-560))/p.width,610/p.height);render();
}
async function save(){
  const d=await CFS.json(`/api/creator/widget-studio/scenes/${encodeURIComponent(state.scene.id)}`,{method:"PUT",body:JSON.stringify({name:$("#sceneName").value,config:state.config})});
  state.scene=d.scene;state.config=clone(d.scene.draft_config);state.config.transition=normalizeTransition(state.config.transition);state.dirty=false;await load();toast("Scene gespeichert.");
}
async function publish(){
  if(state.dirty)await save();
  const d=await CFS.json(`/api/creator/widget-studio/scenes/${encodeURIComponent(state.scene.id)}/publish`,{method:"POST",body:"{}"});
  state.scene=d.scene;await load();toast("Scene veröffentlicht.");
}
function addWidget(id){
  const w=widgetById(id);if(!w||!state.config)return;
  if(state.config.items.length>=24){toast("Maximal 24 Widgets pro Scene.",true);return}
  const i=defaultItem(w,state.config.items.length);state.config.items.push(i);state.selected=i.id;dirty();editor();
}
function update(field,value){const i=selectedItem();if(!i)return;i[field]=value;dirty();renderItems();props()}
function dragStart(e,id){
  const i=state.config.items.find(x=>x.id===id);if(!i)return;state.selected=id;
  const z=parseFloat($("#sceneZoom").textContent)/100||state.zoom||.4;
  state.drag={item:i,startX:e.clientX,startY:e.clientY,x:i.x,y:i.y,zoom:z};$(".scene-stage-wrap").classList.add("dragging");renderItems();props();e.preventDefault();
}
function dragMove(e){if(!state.drag)return;const d=state.drag;d.item.x=Math.round(d.x+(e.clientX-d.startX)/d.zoom);d.item.y=Math.round(d.y+(e.clientY-d.startY)/d.zoom);dirty();renderItems()}
function dragEnd(){if(!state.drag)return;state.drag=null;$(".scene-stage-wrap").classList.remove("dragging");props()}
function updateTransition(patch={}){
  if(!state.config)return;
  const previous=normalizeTransition(state.config.transition),next=normalizeTransition({...previous,...patch});
  state.config.transition=next;dirty();syncTransitionControls();renderScenes();
}
function bind(){
  $("#mobileNavToggle").onclick=()=>$("#mainNav").classList.toggle("open");
  $("#newVerticalScene").onclick=()=>create("tiktok_vertical").catch(e=>toast(e.message,true));
  $("#newLandscapeScene").onclick=()=>create("landscape").catch(e=>toast(e.message,true));
  $("#refreshScenes").onclick=()=>load().catch(e=>toast(e.message,true));
  $("#sceneList").onclick=e=>{const x=e.target.closest("[data-scene]");if(x)open(x.dataset.scene)};
  $("#widgetLibrary").onclick=e=>{const x=e.target.closest("[data-add-widget]");if(x)addWidget(x.dataset.addWidget)};
  $("#saveScene").onclick=()=>save().catch(e=>toast(e.message,true));
  $("#publishScene").onclick=()=>publish().catch(e=>toast(e.message,true));
  $("#sceneName").oninput=()=>{state.scene.name=$("#sceneName").value;dirty();renderScenes()};
  $("#sceneProfile").onchange=e=>{
    const transition=normalizeTransition(state.config?.transition);
    state.config=sceneDefaults(e.target.value);state.config.transition=transition;state.selected=null;dirty();editor();toast("Format geändert. Widgets bitte neu platzieren.");
  };
  $("#sceneBackground").onchange=e=>{state.config.canvas.background=e.target.value||"transparent";dirty();editor()};
  $("#sceneSafeArea").onchange=e=>{state.config.canvas.safe_area=!!e.target.checked;dirty();editor()};
  $("#sceneTransition").onchange=e=>updateTransition({type:e.target.value,duration_ms:e.target.value==="cut"?0:Math.max(120,Number($("#sceneTransitionDuration").value)||450)});
  $("#sceneTransitionDuration").oninput=e=>updateTransition({duration_ms:Number(e.target.value)||450});
  $("#sceneTransitionEase").onchange=e=>updateTransition({easing:e.target.value});
  $("#previewSceneTransition").onclick=()=>previewTransition($("#sceneViewport"));
  $$("[data-zoom]").forEach(b=>b.onclick=()=>{state.zoom=Math.max(.12,Math.min(1.25,state.zoom+(b.dataset.zoom==="+"?.05:-.05)));fit()});
  $("#sceneItems").onmousedown=e=>{const x=e.target.closest("[data-item]");if(x)dragStart(e,x.dataset.item)};
  addEventListener("mousemove",dragMove);addEventListener("mouseup",dragEnd);
  $("#itemX").onchange=e=>update("x",Math.round(Number(e.target.value)||0));
  $("#itemY").onchange=e=>update("y",Math.round(Number(e.target.value)||0));
  $("#itemScale").onchange=e=>update("scale",Math.max(.1,Math.min(5,Number(e.target.value)||1)));
  $("#itemRotation").onchange=e=>update("rotation",Math.max(-360,Math.min(360,Number(e.target.value)||0)));
  $("#itemOpacity").onchange=e=>update("opacity",Math.max(0,Math.min(1,Number(e.target.value))));
  $("#itemZ").onchange=e=>update("z_index",Math.round(Number(e.target.value)||0));
  $("#toggleItemVisible").onclick=()=>{const i=selectedItem();if(i)update("visible",i.visible===false)};
  $("#removeItem").onclick=()=>{if(!state.selected)return;state.config.items=state.config.items.filter(i=>i.id!==state.selected);state.selected=null;dirty();editor()};
  $("#copySceneUrl").onclick=async()=>{const u=$("#sceneOutputUrl").value;if(u){await navigator.clipboard.writeText(u);toast("Scene Output URL kopiert.")}};
}

document.addEventListener("DOMContentLoaded",async()=>{
  const me=await CFS.requireAuth();if(!me)return;bind();
  try{await load()}catch(e){toast(e.message,true)}
});
})();