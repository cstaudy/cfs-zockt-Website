"use strict";

const NATIVE_SOURCE_TYPES=Object.freeze({
  screen:{key:"screen",label:"Bildschirm",width:1920,height:1080},
  window:{key:"window",label:"Fenster",width:1280,height:720},
  game:{key:"game",label:"Game Capture",width:1920,height:1080},
  camera:{key:"camera",label:"Kamera",width:1280,height:720}
});

function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function safeText(value,max=120){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function layoutKeyForProfile(profile){return String(profile)==="vertical1080p60"?"tiktok_vertical":"landscape"}
function routeAllows(item,layoutKey,mode){const route=item?.routing&&typeof item.routing==="object"?item.routing:{};if(mode==="recording"&&route.recording===false)return false;if(mode!=="recording"&&route.live===false)return false;if(layoutKey==="landscape"&&route.landscape===false)return false;if(layoutKey==="tiktok_vertical"&&route.tiktok_vertical===false)return false;return item?.visible!==false}
function normalizeFilters(input={}){return{brightness:clamp(input?.brightness,.25,2,1),contrast:clamp(input?.contrast,.25,2,1),saturation:clamp(input?.saturation,0,3,1),blurPx:clamp(input?.blur_px??input?.blurPx,0,20,0)}}
function normalizeCrop(input={}){return{left:Math.round(clamp(input?.left,0,4096,0)),top:Math.round(clamp(input?.top,0,4096,0)),right:Math.round(clamp(input?.right,0,4096,0)),bottom:Math.round(clamp(input?.bottom,0,4096,0))}}
function nativeSourceType(item={}){const type=String(item?.native_source?.type||item?.nativeSource?.type||"").toLowerCase();return NATIVE_SOURCE_TYPES[type]?type:""}
function itemKind(item={}){return item?.source_kind==="native"||nativeSourceType(item)?"native":"widget"}
function widgetSourceUrl(item={}){const raw=safeText(item?.widget?.source_url||item?.widget_source_url||item?.widgetSourceUrl,1800);if(!raw)return"";try{const url=new URL(raw);const local=url.hostname==="127.0.0.1"||url.hostname==="localhost";if(url.protocol!=="https:"&&!local)return"";if(!/^\/widgets\//i.test(url.pathname))return"";return url.toString()}catch{return""}}

function normalizeNode(item,index=0){
  const kind=itemKind(item),type=kind==="native"?nativeSourceType(item):"";
  const nativeDef=type?NATIVE_SOURCE_TYPES[type]:null;
  const nativeSource=item?.native_source&&typeof item.native_source==="object"?item.native_source:{};
  const widget=item?.widget&&typeof item.widget==="object"?item.widget:{};
  const sourceId=kind==="native"?safeText(item?.source_id||nativeSource.id||`native:${type}`,120):safeText(item?.source_id||item?.widget_id||item?.widgetId,120);
  if(!sourceId)return null;
  const widgetId=kind==="widget"?safeText(item?.widget_id||item?.widgetId||widget.id,120):"";
  const width=kind==="native"?nativeSource.width:widget?.canvas?.width,height=kind==="native"?nativeSource.height:widget?.canvas?.height;
  return{
    id:safeText(item?.id,80)||`item_${index+1}`,
    kind,
    sourceId,
    widgetId,
    widgetSourceUrl:kind==="widget"?widgetSourceUrl(item):"",
    widgetSourceKey:kind==="widget"?`widget:${widgetId||sourceId}:${Math.round(clamp(width,32,4096,600))}x${Math.round(clamp(height,32,4096,120))}`:"",
    nativeType:type,
    label:kind==="native"?safeText(nativeSource.label,80)||nativeDef?.label||type:safeText(widget?.name||item?.widget_name,80)||"Widget",
    x:Math.round(clamp(item?.x,-4000,4000,0)),
    y:Math.round(clamp(item?.y,-4000,4000,0)),
    scale:clamp(item?.scale,.1,5,1),
    opacity:clamp(item?.opacity,0,1,1),
    rotation:clamp(item?.rotation,-360,360,0),
    zIndex:Math.round(clamp(item?.z_index??item?.zIndex,-1000,1000,index)),
    locked:item?.locked===true,
    visible:item?.visible!==false,
    routing:{...(item?.routing||{})},
    filters:normalizeFilters(item?.filters||{}),
    crop:normalizeCrop(item?.crop||{}),
    sourceWidth:Math.round(clamp(width,kind==="native"?64:32,kind==="native"?7680:4096,nativeDef?.width||600)),
    sourceHeight:Math.round(clamp(height,kind==="native"?64:32,kind==="native"?4320:4096,nativeDef?.height||120))
  };
}

function buildNativeSceneGraph(scene={}, {profile="1080p60",mode="live"}={}){
  const config=scene?.published_config&&typeof scene.published_config==="object"?scene.published_config:{};
  const layoutKey=layoutKeyForProfile(profile);
  const layout=config?.layouts?.[layoutKey]||{canvas:config?.canvas||{},items:config?.items||[]};
  const runtimeLayout=scene?.runtime_layouts?.[layoutKey]&&typeof scene.runtime_layouts[layoutKey]==="object"?scene.runtime_layouts[layoutKey]:null;
  const runtimeById=new Map((Array.isArray(runtimeLayout?.items)?runtimeLayout.items:[]).map(item=>[String(item?.id||""),item]));
  const fallback=layoutKey==="tiktok_vertical"?{width:1080,height:1920}:{width:1920,height:1080};
  const canvas={width:Math.round(clamp(layout?.canvas?.width,320,7680,fallback.width)),height:Math.round(clamp(layout?.canvas?.height,180,4320,fallback.height)),background:safeText(layout?.canvas?.background,40)||"transparent"};
  const allNodes=(Array.isArray(layout?.items)?layout.items:[]).slice(0,24).map((item,index)=>{
    const runtime=runtimeById.get(String(item?.id||""));
    return normalizeNode(runtime?.widget?{...item,widget:runtime.widget}:item,index);
  }).filter(Boolean);
  const nodes=allNodes.filter(node=>routeAllows(node,layoutKey,mode)).sort((a,b)=>a.zIndex-b.zIndex);
  const nativeNodes=nodes.filter(node=>node.kind==="native"&&NATIVE_SOURCE_TYPES[node.nativeType]);
  const widgetNodes=nodes.filter(node=>node.kind==="widget");
  const hasNative=allNodes.some(node=>node.kind==="native"&&NATIVE_SOURCE_TYPES[node.nativeType]);
  const hasWidgets=allNodes.some(node=>node.kind==="widget");
  const missingWidgetSources=widgetNodes.filter(node=>!node.widgetSourceUrl);
  const widgetSources=[];const seenWidgetSources=new Set();
  for(const node of widgetNodes){if(!node.widgetSourceUrl||seenWidgetSources.has(node.widgetSourceKey))continue;seenWidgetSources.add(node.widgetSourceKey);widgetSources.push({key:node.widgetSourceKey,url:node.widgetSourceUrl,width:node.sourceWidth,height:node.sourceHeight,fps:30,widgetId:node.widgetId})}
  let modeName="legacy";
  if(hasNative&&hasWidgets)modeName="hybrid";
  else if(hasNative)modeName="native";
  else if(hasWidgets)modeName="web_overlay";
  const canComposeNatively=modeName==="native";
  const canComposeLocally=canComposeNatively||(modeName==="hybrid"&&missingWidgetSources.length===0)||(modeName==="web_overlay"&&widgetNodes.length>0&&missingWidgetSources.length===0);
  const warnings=[];
  if(missingWidgetSources.length)warnings.push(`${missingWidgetSources.length} Widget-Layer ohne lokale Runtime-Quelle; Hybrid-Compositor kann diesen Output nicht vollständig bauen.`);
  return{schema:2,sceneId:safeText(scene?.id,120),sceneName:safeText(scene?.name,120),profile:String(profile||"1080p60"),layoutKey,outputMode:mode==="recording"?"recording":"live",canvas,nodes,nativeNodes,widgetNodes,widgetSources,missingWidgetSources:missingWidgetSources.map(node=>node.id),mode:modeName,canComposeNatively,canComposeLocally,warnings};
}

function ffmpegNumber(value,digits=3){const n=Number(value);return Number.isFinite(n)?Number(n.toFixed(digits)):0}
function buildNodeFilterChain(node,inputIndex,label){
  const crop=normalizeCrop(node.crop||{}),filters=normalizeFilters(node.filters||{});
  const sourceWidth=Math.max(32,Math.round(Number(node.sourceWidth)||1920)),sourceHeight=Math.max(32,Math.round(Number(node.sourceHeight)||1080));
  const cropLeft=crop.left,cropTop=crop.top,cropRight=crop.right,cropBottom=crop.bottom;
  const croppedWidth=Math.max(2,sourceWidth-cropLeft-cropRight),croppedHeight=Math.max(2,sourceHeight-cropTop-cropBottom);
  const scale=clamp(node.scale,.1,5,1),outWidth=Math.max(2,Math.round(croppedWidth*scale)),outHeight=Math.max(2,Math.round(croppedHeight*scale));
  const chain=[];
  if(cropLeft||cropTop||cropRight||cropBottom)chain.push(`crop=w=max(2\\,iw-${cropLeft+cropRight}):h=max(2\\,ih-${cropTop+cropBottom}):x=min(${cropLeft}\\,iw-ow):y=min(${cropTop}\\,ih-oh)`);
  const brightness=ffmpegNumber(filters.brightness-1),contrast=ffmpegNumber(filters.contrast),saturation=ffmpegNumber(filters.saturation);
  if(brightness!==0||contrast!==1||saturation!==1)chain.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
  if(filters.blurPx>0)chain.push(`boxblur=${Math.max(1,Math.round(filters.blurPx))}`);
  if(Math.abs(scale-1)>.0001)chain.push(`scale=w=max(2\\,trunc(iw*${ffmpegNumber(scale)}/2)*2):h=max(2\\,trunc(ih*${ffmpegNumber(scale)}/2)*2)`);
  if(Math.abs(Number(node.rotation)||0)>.01)chain.push(`rotate=${ffmpegNumber(Number(node.rotation)*Math.PI/180,6)}:ow=rotw(iw):oh=roth(ih):c=none`);
  if(Number(node.opacity)<.999)chain.push("format=rgba",`colorchannelmixer=aa=${ffmpegNumber(clamp(node.opacity,0,1,1))}`);
  else chain.push("format=rgba");
  return{filter:`[${inputIndex}:v:0]${chain.join(",")}[${label}]`,label,width:outWidth,height:outHeight,x:Math.round(Number(node.x)||0),y:Math.round(Number(node.y)||0)};
}

function compileSceneVideoFilters(graph,inputIndexByNodeId={},options={}){
  if(!graph?.canComposeLocally)return{filters:[],videoLabel:"",nodes:[]};
  const filters=[];const canvas=graph.canvas||{width:1920,height:1080};
  if(options.baseMode==="capture"){
    const crop=options.baseCrop&&Number(options.baseCrop.width)>0&&Number(options.baseCrop.height)>0?`crop=${Math.round(clamp(options.baseCrop.width,64,7680,1920))}:${Math.round(clamp(options.baseCrop.height,64,4320,1080))}:${Math.round(clamp(options.baseCrop.x,0,10000,0))}:${Math.round(clamp(options.baseCrop.y,0,10000,0))},`:"";
    filters.push(`[${Number.isInteger(options.baseInputIndex)?options.baseInputIndex:0}:v:0]${crop}scale=${Math.round(canvas.width)}:${Math.round(canvas.height)}:force_original_aspect_ratio=decrease,pad=${Math.round(canvas.width)}:${Math.round(canvas.height)}:(ow-iw)/2:(oh-ih)/2,format=rgba[cfs_scene_base]`);
  }else filters.push(`[${Number.isInteger(options.baseInputIndex)?options.baseInputIndex:0}:v:0]format=rgba[cfs_scene_base]`);
  let current="cfs_scene_base",counter=0;const compiled=[];
  for(const node of graph.nodes||[]){
    const inputIndex=inputIndexByNodeId[node.id];if(!Number.isInteger(inputIndex))continue;
    const sourceLabel=`cfs_src_${counter}`,next=`cfs_scene_${counter+1}`,piece=buildNodeFilterChain(node,inputIndex,sourceLabel);
    filters.push(piece.filter);filters.push(`[${current}][${sourceLabel}]overlay=x=${piece.x}:y=${piece.y}:format=auto[${next}]`);
    compiled.push({id:node.id,kind:node.kind,inputIndex,x:piece.x,y:piece.y,width:piece.width,height:piece.height,zIndex:node.zIndex});current=next;counter+=1;
  }
  const output="cfs_scene_v";filters.push(`[${current}]scale=${Math.round(canvas.width)}:${Math.round(canvas.height)},format=yuv420p[${output}]`);
  return{filters,videoLabel:output,nodes:compiled};
}

function compileNativeVideoFilters(graph,inputIndexByNodeId={}){
  if(!graph?.canComposeNatively)return{filters:[],videoLabel:"",nodes:[]};
  return compileSceneVideoFilters({...graph,canComposeLocally:true,nodes:graph.nativeNodes||[]},inputIndexByNodeId,{baseMode:"canvas",baseInputIndex:0});
}

function graphSummary(graph={}){return{schema:Number(graph.schema||1),sceneId:safeText(graph.sceneId,120),sceneName:safeText(graph.sceneName,120),profile:safeText(graph.profile,40),layoutKey:safeText(graph.layoutKey,40),outputMode:safeText(graph.outputMode,24),mode:safeText(graph.mode,32),canComposeNatively:graph.canComposeNatively===true,canComposeLocally:graph.canComposeLocally===true,nativeSources:(graph.nativeNodes||[]).map(node=>({id:node.id,sourceId:node.sourceId,type:node.nativeType,label:node.label,zIndex:node.zIndex})),widgetSources:(graph.widgetNodes||[]).map(node=>({id:node.id,sourceId:node.sourceId,widgetId:node.widgetId,label:node.label,zIndex:node.zIndex,ready:Boolean(node.widgetSourceUrl)})),widgetSourceCount:Array.isArray(graph.widgetNodes)?graph.widgetNodes.length:0,warnings:Array.isArray(graph.warnings)?graph.warnings.slice(0,4).map(x=>safeText(x,220)):[]};}

module.exports={NATIVE_SOURCE_TYPES,layoutKeyForProfile,normalizeCrop,normalizeFilters,nativeSourceType,itemKind,widgetSourceUrl,normalizeNode,buildNativeSceneGraph,compileSceneVideoFilters,compileNativeVideoFilters,graphSummary};
