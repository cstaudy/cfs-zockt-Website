"use strict";
const crypto=require("node:crypto");

const SCENE_PROFILES=Object.freeze({
  tiktok_vertical:{key:"tiktok_vertical",label:"TikTok Vertical",width:1080,height:1920,defaultSafeArea:true},
  landscape:{key:"landscape",label:"Landscape 16:9",width:1920,height:1080,defaultSafeArea:true}
});

const SCENE_TRANSITIONS=Object.freeze({
  cut:{key:"cut",label:"Schnitt"},
  fade:{key:"fade",label:"Fade"},
  dissolve:{key:"dissolve",label:"Dissolve"},
  slide_left:{key:"slide_left",label:"Slide von rechts"},
  slide_right:{key:"slide_right",label:"Slide von links"},
  slide_up:{key:"slide_up",label:"Slide von unten"},
  zoom:{key:"zoom",label:"Zoom"}
});

const SCENE_NATIVE_SOURCE_TYPES=new Set(["screen","window","game","camera"]);

const SCENE_TRANSITION_EASINGS=Object.freeze({
  smooth:{key:"smooth",label:"Smooth"},
  ease:{key:"ease",label:"Standard"},
  ease_in_out:{key:"ease_in_out",label:"Ease In/Out"},
  linear:{key:"linear",label:"Linear"}
});

function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function text(value,max=120,fallback=""){const out=String(value??"").trim();return(out||fallback).slice(0,max)}
function color(value,fallback="transparent"){const v=String(value??"").trim();if(v==="transparent")return v;if(/^#[0-9a-f]{3,8}$/i.test(v))return v;if(/^rgba?\([0-9.,\s%]+\)$/i.test(v))return v;return fallback}
function scenePublicToken(){return"cfss_"+crypto.randomBytes(24).toString("base64url")}

function sanitizeSceneTransition(input={}){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const type=SCENE_TRANSITIONS[String(source.type||"")]?String(source.type):"cut";
  const easing=SCENE_TRANSITION_EASINGS[String(source.easing||"")]?String(source.easing):"smooth";
  const duration_ms=type==="cut"?0:Math.round(clamp(source.duration_ms??source.durationMs,120,2500,450));
  return{type,duration_ms,easing};
}

function sanitizeSceneRouting(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  return{
    live:s.live!==false,
    recording:s.recording!==false,
    landscape:s.landscape!==false,
    tiktok_vertical:s.tiktok_vertical!==false
  };
}

function sanitizeSceneFilters(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  return{
    brightness:Math.round(clamp(s.brightness,.25,2,1)*1000)/1000,
    contrast:Math.round(clamp(s.contrast,.25,2,1)*1000)/1000,
    saturation:Math.round(clamp(s.saturation,0,3,1)*1000)/1000,
    blur_px:Math.round(clamp(s.blur_px??s.blurPx,0,20,0)*10)/10
  };
}

function sanitizeSceneCrop(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  return{left:Math.round(clamp(s.left,0,4096,0)),top:Math.round(clamp(s.top,0,4096,0)),right:Math.round(clamp(s.right,0,4096,0)),bottom:Math.round(clamp(s.bottom,0,4096,0))};
}

function sanitizeNativeSceneSource(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{},type=SCENE_NATIVE_SOURCE_TYPES.has(String(s.type||""))?String(s.type):"";if(!type)return null;
  const defaults={screen:[1920,1080],window:[1280,720],game:[1920,1080],camera:[1280,720]},dims=defaults[type];
  return{id:text(s.id,120,`native:${type}`),type,label:text(s.label,80,({screen:"Bildschirm",window:"Fenster",game:"Game Capture",camera:"Kamera"})[type]),width:Math.round(clamp(s.width,64,7680,dims[0])),height:Math.round(clamp(s.height,64,4320,dims[1]))};
}

function sanitizeSceneItem(input,index=0){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{},native=s.source_kind==="native"||s.native_source||s.nativeSource?sanitizeNativeSceneSource(s.native_source||s.nativeSource||{}):null;
  const sourceKind=native?"native":"widget",widgetId=sourceKind==="widget"?text(s.widget_id||s.widgetId,120,""):"";if(sourceKind==="widget"&&!widgetId)return null;
  const sourceId=text(s.source_id,120,native?.id||widgetId);
  return{id:text(s.id,80,`item_${index+1}`),source_kind:sourceKind,source_id:sourceId,widget_id:widgetId,native_source:native,visible:s.visible!==false,x:Math.round(clamp(s.x,-4000,4000,0)),y:Math.round(clamp(s.y,-4000,4000,0)),scale:Math.round(clamp(s.scale,.1,5,1)*1000)/1000,opacity:Math.round(clamp(s.opacity,0,1,1)*1000)/1000,rotation:Math.round(clamp(s.rotation,-360,360,0)*10)/10,z_index:Math.round(clamp(s.z_index??s.zIndex,-1000,1000,index)),locked:s.locked===true,routing:sanitizeSceneRouting(s.routing),filters:sanitizeSceneFilters(s.filters),crop:sanitizeSceneCrop(s.crop)}
}

function sanitizeSceneLayout(input={},profile="landscape"){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{},p=SCENE_PROFILES[profile]||SCENE_PROFILES.landscape,seen=new Set(),items=[];
  for(const[index,item]of(Array.isArray(source.items)?source.items:[]).slice(0,24).entries()){const clean=sanitizeSceneItem(item,index);if(!clean)continue;if(seen.has(clean.id))clean.id=`${clean.id}_${index+1}`;seen.add(clean.id);items.push(clean)}
  return{canvas:{width:p.width,height:p.height,background:color(source.canvas?.background,"transparent"),safe_area:source.canvas?.safe_area!==false},items};
}

function mirrorSceneLayout(layout,fromProfile,toProfile){
  const from=SCENE_PROFILES[fromProfile]||SCENE_PROFILES.landscape,to=SCENE_PROFILES[toProfile]||SCENE_PROFILES.tiktok_vertical;
  const clean=sanitizeSceneLayout(layout,fromProfile),xRatio=to.width/from.width,yRatio=to.height/from.height;
  return sanitizeSceneLayout({canvas:{...clean.canvas},items:clean.items.map(item=>({...item,x:Math.round(item.x*xRatio),y:Math.round(item.y*yRatio)}))},toProfile);
}

function sanitizeSceneConfig(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{},key=SCENE_PROFILES[s.profile]?s.profile:"tiktok_vertical",layoutsSource=s.layouts&&typeof s.layouts==="object"&&!Array.isArray(s.layouts)?s.layouts:null;
  let landscape,tiktok_vertical;
  if(layoutsSource){
    landscape=sanitizeSceneLayout(layoutsSource.landscape||{},"landscape");
    tiktok_vertical=sanitizeSceneLayout(layoutsSource.tiktok_vertical||{},"tiktok_vertical");
    // Wenn eine Variante in einer älteren Zwischenversion noch leer war, behalten wir dennoch bewusst die leere Variante bei.
  }else{
    const legacy=sanitizeSceneLayout({canvas:s.canvas,items:s.items},key);
    if(key==="landscape"){landscape=legacy;tiktok_vertical=mirrorSceneLayout(legacy,"landscape","tiktok_vertical")}
    else{tiktok_vertical=legacy;landscape=mirrorSceneLayout(legacy,"tiktok_vertical","landscape")}
  }
  const active=key==="tiktok_vertical"?tiktok_vertical:landscape;
  return{version:2,profile:key,canvas:active.canvas,transition:sanitizeSceneTransition(s.transition),items:active.items,layouts:{landscape,tiktok_vertical}};
}

function sceneConfigItems(config){
  const layouts=config?.layouts&&typeof config.layouts==="object"?Object.values(config.layouts):[];
  const source=layouts.length?layouts.flatMap(layout=>Array.isArray(layout?.items)?layout.items:[]):Array.isArray(config?.items)?config.items:[];
  const seen=new Set(),out=[];
  for(const item of source){const key=`${String(item?.id||"")}::${String(item?.source_kind||"widget")}::${String(item?.source_id||item?.widget_id||"")}`;if(seen.has(key))continue;seen.add(key);out.push(item)}
  return out;
}

function validateSceneOwnership(config,widgets=[]){
  const map=new Map(widgets.map(w=>[String(w.id),w])),errors=[],resolved=[];
  for(const item of sceneConfigItems(config)){if(item?.source_kind==="native")continue;const widget=map.get(String(item.widget_id));if(!widget){errors.push({item_id:item.id,widget_id:item.widget_id,error:"widget_not_owned"});continue}if(widget.status!=="live"||!widget.published_config){errors.push({item_id:item.id,widget_id:item.widget_id,error:"widget_not_published"});continue}resolved.push({item,widget})}
  return{ok:errors.length===0,errors,resolved}
}

function publicSceneRow(row,baseUrl=""){
  if(!row)return null;const token=String(row.public_token||""),base=String(baseUrl).replace(/\/+$/,""),profile=row.draft_config?.profile||row.published_config?.profile||"tiktok_vertical";
  const sceneUrl=(layout,mode="live")=>token?`${base}/widgets/scene.html#token=${encodeURIComponent(token)}&layout=${encodeURIComponent(layout)}${mode==="recording"?"&mode=recording":""}`:"";
  return{id:String(row.id),name:String(row.name||"Scene"),status:String(row.status||"draft"),profile,draft_config:row.draft_config||null,published_config:row.published_config||null,public_token:token,source_url:sceneUrl(profile),source_urls:{landscape:sceneUrl("landscape"),tiktok_vertical:sceneUrl("tiktok_vertical"),recording_landscape:sceneUrl("landscape","recording"),recording_tiktok_vertical:sceneUrl("tiktok_vertical","recording")},version:Number(row.version||1),published_at:row.published_at||null,created_at:row.created_at||null,updated_at:row.updated_at||null}
}

module.exports={
  SCENE_PROFILES,
  SCENE_TRANSITIONS,
  SCENE_TRANSITION_EASINGS,
  sanitizeSceneTransition,
  sanitizeSceneRouting,
  sanitizeSceneFilters,
  sanitizeSceneCrop,
  sanitizeNativeSceneSource,
  sanitizeSceneItem,
  sanitizeSceneLayout,
  sanitizeSceneConfig,
  validateSceneOwnership,
  scenePublicToken,
  publicSceneRow
};
