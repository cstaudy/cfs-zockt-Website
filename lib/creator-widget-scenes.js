"use strict";
const crypto=require("node:crypto");
const SCENE_PROFILES=Object.freeze({
  tiktok_vertical:{key:"tiktok_vertical",label:"TikTok Vertical",width:1080,height:1920,defaultSafeArea:true},
  landscape:{key:"landscape",label:"Landscape 16:9",width:1920,height:1080,defaultSafeArea:true}
});
function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function text(value,max=120,fallback=""){const out=String(value??"").trim();return(out||fallback).slice(0,max)}
function color(value,fallback="transparent"){const v=String(value??"").trim();if(v==="transparent")return v;if(/^#[0-9a-f]{3,8}$/i.test(v))return v;if(/^rgba?\([0-9.,\s%]+\)$/i.test(v))return v;return fallback}
function scenePublicToken(){return"cfss_"+crypto.randomBytes(24).toString("base64url")}
function sanitizeSceneItem(input,index=0){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{},widgetId=text(s.widget_id||s.widgetId,120,"");if(!widgetId)return null;
  return{id:text(s.id,80,`item_${index+1}`),widget_id:widgetId,visible:s.visible!==false,x:Math.round(clamp(s.x,-4000,4000,0)),y:Math.round(clamp(s.y,-4000,4000,0)),scale:Math.round(clamp(s.scale,.1,5,1)*1000)/1000,opacity:Math.round(clamp(s.opacity,0,1,1)*1000)/1000,rotation:Math.round(clamp(s.rotation,-360,360,0)*10)/10,z_index:Math.round(clamp(s.z_index??s.zIndex,-1000,1000,index)),locked:s.locked===true}
}
function sanitizeSceneConfig(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{},key=SCENE_PROFILES[s.profile]?s.profile:"tiktok_vertical",p=SCENE_PROFILES[key],seen=new Set(),items=[];
  for(const[index,item]of(Array.isArray(s.items)?s.items:[]).slice(0,24).entries()){const clean=sanitizeSceneItem(item,index);if(!clean)continue;if(seen.has(clean.id))clean.id=`${clean.id}_${index+1}`;seen.add(clean.id);items.push(clean)}
  return{version:1,profile:key,canvas:{width:p.width,height:p.height,background:color(s.canvas?.background,"transparent"),safe_area:s.canvas?.safe_area!==false},items}
}
function validateSceneOwnership(config,widgets=[]){
  const map=new Map(widgets.map(w=>[String(w.id),w])),errors=[],resolved=[];
  for(const item of config.items||[]){const widget=map.get(String(item.widget_id));if(!widget){errors.push({item_id:item.id,widget_id:item.widget_id,error:"widget_not_owned"});continue}if(widget.status!=="live"||!widget.published_config){errors.push({item_id:item.id,widget_id:item.widget_id,error:"widget_not_published"});continue}resolved.push({item,widget})}
  return{ok:errors.length===0,errors,resolved}
}
function publicSceneRow(row,baseUrl=""){
  if(!row)return null;const token=String(row.public_token||"");
  return{id:String(row.id),name:String(row.name||"Scene"),status:String(row.status||"draft"),profile:row.draft_config?.profile||row.published_config?.profile||"tiktok_vertical",draft_config:row.draft_config||null,published_config:row.published_config||null,public_token:token,source_url:token?`${String(baseUrl).replace(/\/+$/,"")}/widgets/scene.html#token=${encodeURIComponent(token)}`:"",version:Number(row.version||1),published_at:row.published_at||null,created_at:row.created_at||null,updated_at:row.updated_at||null}
}
module.exports={SCENE_PROFILES,sanitizeSceneItem,sanitizeSceneConfig,validateSceneOwnership,scenePublicToken,publicSceneRow};
