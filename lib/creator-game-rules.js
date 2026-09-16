"use strict";

const GAME_RULE_EVENT_TYPES=Object.freeze(["follow","like","gift","share"]);
const GAME_RULE_MODES=Object.freeze(["fixed","multiply"]);

function clamp(value,min,max,fallback){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function text(value,max=160,fallback=""){
  const out=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  return(out||fallback).slice(0,max);
}
function sanitizeGameRule(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const eventType=GAME_RULE_EVENT_TYPES.includes(String(s.event_type||""))?String(s.event_type):"follow";
  const amountMode=GAME_RULE_MODES.includes(String(s.amount_mode||""))?String(s.amount_mode):"fixed";
  const team=String(s.team||"a").toLowerCase()==="b"?"b":"a";
  return{
    label:text(s.label,120,`${eventType.toUpperCase()} → TEAM ${team.toUpperCase()}`),
    enabled:s.enabled!==false,
    event_type:eventType,
    team,
    points:Math.round(clamp(s.points,1,1000,1)),
    amount_mode:amountMode,
    min_amount:Math.round(clamp(s.min_amount,1,1000000,1)),
    gift_name:text(s.gift_name,120,""),
    gift_id:text(s.gift_id,120,"")
  };
}
function eventPayload(event={}){
  return event?.payload&&typeof event.payload==="object"&&!Array.isArray(event.payload)?event.payload:{};
}
function gameRuleMatches(ruleInput,event={}){
  const rule=sanitizeGameRule(ruleInput);
  if(!rule.enabled||String(event.event_type||"")!==rule.event_type)return false;
  if(Math.max(0,Number(event.amount||0))<rule.min_amount)return false;
  if(rule.event_type==="gift"){
    const payload=eventPayload(event);
    const giftName=text(payload.gift_name||payload.giftName,120,"").toLowerCase();
    const giftId=text(payload.gift_id||payload.giftId,120,"");
    if(rule.gift_name&&giftName!==rule.gift_name.toLowerCase())return false;
    if(rule.gift_id&&giftId!==rule.gift_id)return false;
  }
  return true;
}
function gameRulePoints(ruleInput,event={}){
  const rule=sanitizeGameRule(ruleInput);
  if(!gameRuleMatches(rule,event))return 0;
  const multiplier=rule.amount_mode==="multiply"?Math.max(1,Math.round(Number(event.amount||1))):1;
  return Math.min(1000000,rule.points*multiplier);
}
function publicGameRule(row){
  if(!row)return null;
  return{
    id:String(row.id),
    creator_id:String(row.creator_id),
    ...sanitizeGameRule(row),
    last_triggered_at:row.last_triggered_at||null,
    created_at:row.created_at||null,
    updated_at:row.updated_at||null
  };
}
function publicGameRuleHit(row){
  if(!row)return null;
  return{
    id:String(row.id),
    creator_id:String(row.creator_id),
    rule_id:String(row.rule_id),
    event_id:String(row.event_id),
    session_id:row.session_id||null,
    event_type:String(row.event_type||""),
    team:String(row.team||"a"),
    points:Number(row.points||0),
    actor_name:String(row.actor_name||""),
    gift_name:String(row.gift_name||""),
    created_at:row.created_at||null
  };
}

module.exports={
  GAME_RULE_EVENT_TYPES,
  GAME_RULE_MODES,
  sanitizeGameRule,
  gameRuleMatches,
  gameRulePoints,
  publicGameRule,
  publicGameRuleHit
};
