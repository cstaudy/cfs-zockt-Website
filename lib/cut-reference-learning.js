"use strict";

const GAME_PROFILES=Object.freeze({
  generic:{id:"generic",label:"Allgemeines Gameplay",categories:["action","reaction","funny","clutch","setup","payoff","best"]},
  dbd:{id:"dbd",label:"Dead by Daylight",categories:["mori","chase","hit","save","escape","reaction","funny","best"]},
  fps:{id:"fps",label:"FPS / Shooter",categories:["kill","multikill","clutch","objective","movement","reaction","funny","best"]},
  battle_royale:{id:"battle_royale",label:"Battle Royale",categories:["fight","elimination","clutch","rotation","win","reaction","funny","best"]},
  sports_racing:{id:"sports_racing",label:"Sports / Racing",categories:["goal","overtake","save","finish","skill","reaction","funny","best"]},
  sandbox:{id:"sandbox",label:"Sandbox / Survival",categories:["build","discovery","danger","success","fail","reaction","funny","best"]}
});
const PACING=new Set(["slow","balanced","fast","mixed"]);
function clamp(v,min,max,fallback=0){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function text(v,max=240){return String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function profileId(value){const id=String(value||"generic").toLowerCase();return GAME_PROFILES[id]?id:"generic"}
function normalizePublicYoutubeUrl(raw){let value=String(raw||"").trim();if(!value)throw new Error("YouTube-URL fehlt.");if(!/^https?:\/\//i.test(value))value=`https://${value}`;let u;try{u=new URL(value)}catch{throw new Error("Ungültige Referenz-URL.")};const host=u.hostname.toLowerCase().replace(/^www\./,"");if(!["youtube.com","m.youtube.com","youtu.be"].includes(host))throw new Error("Nur öffentliche YouTube-Video-URLs sind als Referenz erlaubt.");u.protocol="https:";u.hash="";let id="";if(host==="youtu.be")id=u.pathname.split("/").filter(Boolean)[0]||"";else if(/^\/shorts\//i.test(u.pathname))id=u.pathname.split("/").filter(Boolean)[1]||"";else if(/^\/watch\/?$/i.test(u.pathname))id=u.searchParams.get("v")||"";if(!/^[A-Za-z0-9_-]{6,20}$/.test(id))throw new Error("Direkte YouTube-Video-ID fehlt oder ist ungültig.");return`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`}
function sanitizeEvent(event={},gameProfile="generic"){
  const profile=GAME_PROFILES[profileId(gameProfile)],category=text(event.category,40).toLowerCase();
  if(!profile.categories.includes(category))return null;
  const start=clamp(event.start,0,24*60*60,0),end=clamp(event.end,start+.05,24*60*60,start+.05),confidence=clamp(event.confidence,0,1,0);
  if(confidence<.55||end<=start)return null;
  return{category,start:Number(start.toFixed(3)),end:Number(end.toFixed(3)),confidence:Number(confidence.toFixed(3)),short_score:Number(clamp(event.short_score??event.shortScore,0,1,0).toFixed(3)),hook_score:Number(clamp(event.hook_score??event.hookScore,0,1,0).toFixed(3)),reaction:Number(clamp(event.reaction,0,1,0).toFixed(3)),context_before:Number(clamp(event.context_before??event.contextBefore,0,8,0).toFixed(2)),context_after:Number(clamp(event.context_after??event.contextAfter,0,8,0).toFixed(2)),label:text(event.label,120),reason:text(event.reason,260)}
}
function sanitizeReferenceSample(sample={},gameProfile="generic"){
  let url="";try{url=normalizePublicYoutubeUrl(sample.url)}catch{url=""}
  if(!url)return null;
  const events=(Array.isArray(sample.events)?sample.events:[]).slice(0,30).map(e=>sanitizeEvent(e,gameProfile)).filter(Boolean);
  const status=String(sample.status||"")==="analyzed"?"analyzed":"pending";return{id:text(sample.id,80)||undefined,url,status,title:text(sample.title,180),channel:text(sample.channel,120),summary:text(sample.summary,700),reference_score:Number(clamp(sample.reference_score??sample.referenceScore,0,100,0).toFixed(1)),hook_seconds:Number(clamp(sample.hook_seconds??sample.hookSeconds,0,60,0).toFixed(2)),ideal_short_seconds:Number(clamp(sample.ideal_short_seconds??sample.idealShortSeconds,5,180,35).toFixed(1)),action_density:Number(clamp(sample.action_density??sample.actionDensity,0,1,0).toFixed(3)),pacing:PACING.has(String(sample.pacing))?String(sample.pacing):"mixed",events,lessons:(Array.isArray(sample.lessons)?sample.lessons:[]).slice(0,8).map(v=>text(v,220)).filter(Boolean),analyzed_at:text(sample.analyzed_at??sample.analyzedAt,40)}
}
function avg(rows,key,fallback=0){const vals=rows.map(r=>Number(r[key])).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:fallback}
function aggregateReferenceProfile(samples=[],gameProfile="generic"){
  const clean=(Array.isArray(samples)?samples:[]).slice(0,8).map(s=>sanitizeReferenceSample(s,gameProfile)).filter(s=>s&&s.status==="analyzed");if(!clean.length)return{sample_count:0,hook_seconds:0,ideal_short_seconds:35,action_density:0,pacing:"mixed",context_before:0,context_after:0,category_weights:{},lessons:[]};
  const pacingCounts={};for(const s of clean)pacingCounts[s.pacing]=(pacingCounts[s.pacing]||0)+1;const pacing=Object.entries(pacingCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||"mixed";
  const events=clean.flatMap(s=>s.events||[]),weights={};for(const e of events){weights[e.category]=(weights[e.category]||0)+e.confidence*(.35+.65*e.short_score)}const max=Math.max(1,...Object.values(weights));for(const k of Object.keys(weights))weights[k]=Number((weights[k]/max).toFixed(3));
  const lessons=[];for(const s of clean)for(const lesson of s.lessons||[])if(!lessons.includes(lesson)&&lessons.length<12)lessons.push(lesson);
  return{sample_count:clean.length,hook_seconds:Number(avg(clean,"hook_seconds",0).toFixed(2)),ideal_short_seconds:Number(avg(clean,"ideal_short_seconds",35).toFixed(1)),action_density:Number(avg(clean,"action_density",0).toFixed(3)),pacing,context_before:Number(avg(events,"context_before",0).toFixed(2)),context_after:Number(avg(events,"context_after",0).toFixed(2)),category_weights:weights,lessons};
}
function sanitizeReferenceLearning(input={},gameProfile="generic"){
  const enabled=input?.enabled===true,samples=(Array.isArray(input?.samples)?input.samples:[]).slice(0,8).map(s=>sanitizeReferenceSample(s,gameProfile)).filter(Boolean),aggregate=aggregateReferenceProfile(samples,gameProfile);
  return{enabled,source:"public_youtube",semantic_separation:true,samples,aggregate,updated_at:text(input?.updated_at,40)}
}
function applyReferenceGuidance(candidate={},learning={},ownEvidenceCategories=[]){
  const base=clamp(candidate.score,0,1,0),enabled=learning?.enabled===true&&learning?.semantic_separation===true&&Number(learning?.aggregate?.sample_count||0)>0;if(!enabled)return{...candidate,score:Number(base.toFixed(3)),reference_boost:0};
  const aggregate=learning.aggregate||{},duration=Math.max(.1,Number(candidate.end||0)-Number(candidate.start||0)),ideal=Math.max(5,Number(aggregate.ideal_short_seconds||35)),durationFit=Math.max(0,1-Math.abs(duration-ideal)/ideal),action=clamp(candidate.action_density??candidate.actionDensity,0,1,0),genericBoost=Math.min(.08,.025*durationFit+.035*Math.min(action,Number(aggregate.action_density||0)||action));
  let categoryBoost=0;const category=String(candidate.category||"").toLowerCase(),evidence=new Set((Array.isArray(ownEvidenceCategories)?ownEvidenceCategories:[]).map(v=>String(v).toLowerCase()));if(category&&evidence.has(category))categoryBoost=Math.min(.04,.04*clamp(aggregate.category_weights?.[category],0,1,0));
  const boost=Number((genericBoost+categoryBoost).toFixed(3));return{...candidate,score:Number(Math.min(1,base+boost).toFixed(3)),reference_boost:boost};
}

function upsertAnalyzedReference(learning={},sample={},gameProfile="generic"){
  const clean=sanitizeReferenceSample({...sample,status:"analyzed"},gameProfile);if(!clean)throw new Error("Ungültige Referenzanalyse.");
  const current=sanitizeReferenceLearning(learning,gameProfile),rows=(current.samples||[]).filter(row=>row.url!==clean.url);rows.unshift(clean);const samples=rows.slice(0,8);
  return{enabled:current.enabled,source:"public_youtube",semantic_separation:true,samples,aggregate:aggregateReferenceProfile(samples,gameProfile),updated_at:new Date().toISOString()};
}
module.exports={GAME_PROFILES,normalizePublicYoutubeUrl,sanitizeReferenceSample,aggregateReferenceProfile,sanitizeReferenceLearning,upsertAnalyzedReference,applyReferenceGuidance,profileId};
