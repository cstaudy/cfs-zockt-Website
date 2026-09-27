"use strict";

const PROFILE_BUNDLE_SCHEMA=1;
const BUNDLE_NAME="cfs.game-profile";
const MAX_RULES=100;

function text(value,max=3000,fallback=""){
  const out=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  return(out||fallback).slice(0,max);
}
function plainObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
function publicGamePresets(catalog=[]){
  const rows=Array.isArray(catalog)?catalog:[];
  return rows.slice(0,128).map(item=>{
    const gameType=text(item?.key??item?.game_type,96,"");
    if(!gameType)return null;
    return{
      game_type:gameType,
      title:text(item?.label??item?.title,80,gameType),
      category:text(item?.category,60,"Community"),
      engine:text(item?.engine,40,"web"),
      terminal_id:text(item?.terminal_id,96,""),
      version:text(item?.version,32,""),
      enabled:item?.enabled!==false
    };
  }).filter(Boolean);
}
function sanitizeProfileForBundle(profile={}){
  const p=plainObject(profile);
  return{
    title:text(p.title,80,"Community Battle"),
    game_type:text(p.game_type,96,"chat_battle"),
    enabled:p.enabled!==false,
    rules:text(p.rules,3000,""),
    target_score:Number.isFinite(Number(p.target_score))?Number(p.target_score):100,
    round_seconds:Number.isFinite(Number(p.round_seconds))?Number(p.round_seconds):180,
    team_a_name:text(p.team_a_name,32,"TEAM A"),
    team_b_name:text(p.team_b_name,32,"TEAM B")
  };
}
function sanitizeRuleForBundle(rule={}){
  const r=plainObject(rule);
  return{
    label:text(r.label,80,"Regel"),enabled:r.enabled!==false,event_type:text(r.event_type,40,"follow"),
    team:text(r.team,8,"a"),points:Number.isFinite(Number(r.points))?Number(r.points):1,
    amount_mode:text(r.amount_mode,24,"fixed"),min_amount:Number.isFinite(Number(r.min_amount))?Number(r.min_amount):0,
    gift_name:text(r.gift_name,120,""),gift_id:text(r.gift_id,120,"")
  };
}
function buildGameProfileBundle({profile={},rules=[]}={}){
  return{schema:BUNDLE_NAME,version:PROFILE_BUNDLE_SCHEMA,exported_at:new Date().toISOString(),profile:sanitizeProfileForBundle(profile),rules:(Array.isArray(rules)?rules:[]).slice(0,MAX_RULES).map(sanitizeRuleForBundle)};
}
function parseGameProfileBundle(input={}){
  const bundle=plainObject(input);
  if(bundle.schema!==BUNDLE_NAME)throw new Error("Ungültiges Game-Profil-Schema.");
  if(Number(bundle.version)!==PROFILE_BUNDLE_SCHEMA)throw new Error("Nicht unterstützte Game-Profil-Version.");
  if(!bundle.profile||typeof bundle.profile!=="object"||Array.isArray(bundle.profile))throw new Error("Game-Profil fehlt.");
  if(!Array.isArray(bundle.rules))throw new Error("Game-Regeln fehlen.");
  if(bundle.rules.length>MAX_RULES)throw new Error("Game-Profil enthält zu viele Regeln.");
  return{schema:BUNDLE_NAME,version:PROFILE_BUNDLE_SCHEMA,profile:sanitizeProfileForBundle(bundle.profile),rules:bundle.rules.map(sanitizeRuleForBundle)};
}
module.exports={PROFILE_BUNDLE_SCHEMA,publicGamePresets,buildGameProfileBundle,parseGameProfileBundle};
