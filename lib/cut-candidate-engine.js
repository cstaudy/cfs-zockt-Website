"use strict";

const crypto=require("node:crypto");
const {GAME_PROFILES,profileId,sanitizeReferenceLearning,applyReferenceGuidance}=require("./cut-reference-learning");

const MAX_EVENTS=64;
const MAX_GROUND_TRUTH=128;
const DECISIONS=new Set(["keep","reject","none"]);

function clamp(value,min,max,fallback=0){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function text(value,max=180,fallback=""){
  const out=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  return(out||fallback).slice(0,max);
}
function stableId(prefix,parts){
  const hash=crypto.createHash("sha256").update(parts.map(v=>String(v??"")).join("\u001f")).digest("hex").slice(0,24);
  return `${prefix}_${hash}`;
}
function allowedCategory(category,gameProfile){
  const profile=GAME_PROFILES[profileId(gameProfile)]||GAME_PROFILES.generic;
  const value=text(category,40).toLowerCase();
  return profile.categories.includes(value)?value:"";
}
function seconds(value,fallback=0){return clamp(value,0,24*60*60,fallback)}

function sanitizeOwnEvent(event={},gameProfile="generic",index=0){
  if(!event||typeof event!=="object"||Array.isArray(event))return null;
  const category=allowedCategory(event.category??event.type??event.event_type,gameProfile);
  if(!category)return null;

  const hasMs=Number.isFinite(Number(event.start_ms??event.startMs))||Number.isFinite(Number(event.end_ms??event.endMs));
  const start=hasMs?seconds(Number((event.start_ms??event.startMs)??0)/1000):seconds(event.start,0);
  const rawEnd=hasMs?Number(event.end_ms??event.endMs)/1000:Number(event.end);
  const end=seconds(rawEnd,start+.05);
  if(end<=start)return null;

  const confidence=clamp(event.confidence,0,1,.5);
  const shortScore=clamp(event.short_score??event.shortScore,0,1,confidence);
  const hookScore=clamp(event.hook_score??event.hookScore,0,1,shortScore);
  const reaction=clamp(event.reaction,0,1,0);
  const actionDensity=clamp(event.action_density??event.actionDensity,0,1,shortScore);
  const contextBefore=clamp(event.context_before??event.contextBefore,0,8,0);
  const contextAfter=clamp(event.context_after??event.contextAfter,0,8,0);
  const label=text(event.label,120,category);
  const reason=text(event.reason,260,"");
  const sourceId=text(event.id??event.event_id,96,"");
  const eventId=/^cfsoe_[a-f0-9]{24}$/.test(sourceId)?sourceId:stableId("cfsoe",[profileId(gameProfile),category,start.toFixed(3),end.toFixed(3),label,index]);

  return{
    id:eventId,
    category,
    start:Number(start.toFixed(3)),
    end:Number(end.toFixed(3)),
    confidence:Number(confidence.toFixed(3)),
    short_score:Number(shortScore.toFixed(3)),
    hook_score:Number(hookScore.toFixed(3)),
    reaction:Number(reaction.toFixed(3)),
    action_density:Number(actionDensity.toFixed(3)),
    context_before:Number(contextBefore.toFixed(2)),
    context_after:Number(contextAfter.toFixed(2)),
    label,
    reason
  };
}

function sanitizeOwnClipEvidence(input={},gameProfile="generic"){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const profile=profileId(gameProfile||source.game_profile);
  const rawEvents=Array.isArray(source.events)?source.events:Array.isArray(source.highlights)?source.highlights:[];
  const events=rawEvents.slice(0,MAX_EVENTS).map((event,index)=>sanitizeOwnEvent(event,profile,index)).filter(Boolean).sort((a,b)=>a.start-b.start||b.confidence-a.confidence||a.id.localeCompare(b.id));
  const durationMs=Math.round(clamp(source.duration_ms??source.durationMs,0,24*60*60*1000,0));
  return{
    schema:1,
    source:"own_clip",
    semantic_source:"own_clip_evidence",
    game_profile:profile,
    analyzed_at:text(source.analyzed_at??source.analyzedAt,40,""),
    analyzer:text(source.analyzer,80,"local_signal_v1"),
    duration_ms:durationMs,
    raw_media_uploaded:false,
    events
  };
}

function sanitizeGroundTruth(input=[]){
  const rows=Array.isArray(input)?input:[];
  const out=[];
  const seen=new Map();
  for(const item of rows.slice(0,MAX_GROUND_TRUTH)){
    if(!item||typeof item!=="object"||Array.isArray(item))continue;
    const candidateId=text(item.candidate_id??item.candidateId??item.id,96,"");
    if(!/^cfsc_[a-f0-9]{24}$/.test(candidateId))continue;
    let decision=text(item.decision,16,"none").toLowerCase();
    if(!DECISIONS.has(decision))decision="none";
    const row={candidate_id:candidateId,decision,note:text(item.note??item.reason,240,""),updated_at:text(item.updated_at??item.updatedAt,40,"")};
    if(seen.has(candidateId))out[seen.get(candidateId)]=row;
    else{seen.set(candidateId,out.length);out.push(row)}
  }
  return out;
}

function baseScore(event){
  const score=.38*event.confidence+.28*event.short_score+.18*event.hook_score+.08*event.reaction+.08*event.action_density;
  return clamp(score,0,1,0);
}

function buildCandidate(event,profile){
  const before=clamp(event.context_before,0,8,0),after=clamp(event.context_after,0,8,0);
  const start=Math.max(0,event.start-before),end=Math.max(start+.05,event.end+after);
  const id=stableId("cfsc",[profile,event.id,event.category,event.start.toFixed(3),event.end.toFixed(3)]);
  return{
    id,
    candidate_id:id,
    semantic_source:"own_clip_evidence",
    category:event.category,
    label:event.label||event.category,
    reason:event.reason||"",
    start:Number(start.toFixed(3)),
    end:Number(end.toFixed(3)),
    in_ms:Math.round(start*1000),
    out_ms:Math.round(end*1000),
    evidence_start:Number(event.start.toFixed(3)),
    evidence_end:Number(event.end.toFixed(3)),
    evidence_start_ms:Math.round(event.start*1000),
    evidence_end_ms:Math.round(event.end*1000),
    evidence_id:event.id,
    confidence:event.confidence,
    action_density:event.action_density,
    base_score:Number(baseScore(event).toFixed(3)),
    score:Number(baseScore(event).toFixed(3)),
    reference_boost:0,
    reference_influence:"none",
    decision:"none",
    eligible:true
  };
}

function buildCutCandidates({own_evidence={},ground_truth=[],game_profile="generic",reference_learning={}}={}){
  const profile=profileId(game_profile);
  const own=sanitizeOwnClipEvidence(own_evidence,profile);
  const truth=sanitizeGroundTruth(ground_truth);
  const decisions=new Map(truth.map(row=>[row.candidate_id,row]));
  const learning=sanitizeReferenceLearning(reference_learning,profile);
  const categories=[...new Set(own.events.map(event=>event.category))];

  const ranked=own.events.map(event=>{
    const base=buildCandidate(event,profile);
    const guided=applyReferenceGuidance(base,learning,categories);
    const decision=decisions.get(base.id)?.decision||"none";
    let score=clamp(guided.score,0,1,base.score),eligible=true;
    if(decision==="reject")eligible=false;
    if(decision==="keep")score=Math.max(score,.9);
    const boost=clamp(guided.reference_boost,0,.12,0);
    return{
      ...guided,
      score:Number(score.toFixed(3)),
      reference_boost:Number(boost.toFixed(3)),
      reference_influence:boost>0?"editorial_only":"none",
      decision,
      eligible
    };
  }).sort((a,b)=>{
    const rankDecision=v=>v.decision==="keep"?2:v.decision==="reject"?0:1;
    return rankDecision(b)-rankDecision(a)||Number(b.eligible)-Number(a.eligible)||b.score-a.score||a.in_ms-b.in_ms||a.id.localeCompare(b.id);
  });

  return{
    game_profile:profile,
    semantic_source:"own_clip_evidence",
    reference_semantic_source:false,
    reference_influence:"editorial_only",
    own_event_count:own.events.length,
    ground_truth_count:truth.length,
    own_evidence:own,
    ground_truth:truth,
    ranked
  };
}

module.exports={sanitizeOwnClipEvidence,sanitizeGroundTruth,buildCutCandidates};
