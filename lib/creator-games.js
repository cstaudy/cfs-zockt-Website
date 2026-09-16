"use strict";
const crypto=require("node:crypto");

const GAME_TYPES=Object.freeze({
  chat_battle:{key:"chat_battle",label:"Chat Battle",canvas:{width:900,height:300}},
  community_quiz:{key:"community_quiz",label:"Community Quiz",canvas:{width:900,height:300}},
  gift_rush:{key:"gift_rush",label:"Gift Rush",canvas:{width:900,height:300}}
});

function clamp(value,min,max,fallback){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function text(value,max=120,fallback=""){
  const out=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  return(out||fallback).slice(0,max);
}
function gamePublicToken(){return"cfsg_"+crypto.randomBytes(24).toString("base64url")}
function sanitizeGameProfile(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const gameType=GAME_TYPES[String(s.game_type||"")]?String(s.game_type):"chat_battle";
  return{
    title:text(s.title,80,"Community Battle"),
    game_type:gameType,
    enabled:s.enabled!==false,
    rules:text(s.rules,3000,""),
    target_score:Math.round(clamp(s.target_score,1,999999,100)),
    round_seconds:Math.round(clamp(s.round_seconds,10,7200,180)),
    team_a_name:text(s.team_a_name,32,"TEAM A"),
    team_b_name:text(s.team_b_name,32,"TEAM B")
  };
}
function initialGameState(profile={}){
  const p=sanitizeGameProfile(profile);
  return{score_a:0,score_b:0,winner:"",round:1,last_action:"reset",target_score:p.target_score};
}
function sanitizeScoreAction(input={}){
  const team=String(input.team||"a").toLowerCase()==="b"?"b":"a";
  const delta=Math.round(clamp(input.delta,-1000,1000,1));
  return{team,delta};
}
function gameCanvas(profile={}){
  return GAME_TYPES[sanitizeGameProfile(profile).game_type].canvas;
}
function publicGameRuntime(row,baseUrl=""){
  if(!row)return null;
  const config=sanitizeGameProfile(row.config||{});
  const state={...initialGameState(config),...(row.state||{})};
  const token=String(row.public_token||"");
  return{
    creator_id:String(row.creator_id||""),
    public_token:token,
    source_url:token?`${String(baseUrl).replace(/\/+$/,"")}/games/runtime.html#token=${encodeURIComponent(token)}`:"",
    status:String(row.status||"idle"),
    title:String(row.title||config.title||"Community Battle"),
    game_type:String(row.game_type||config.game_type),
    config,
    state:{
      score_a:Number(state.score_a||0),
      score_b:Number(state.score_b||0),
      winner:String(state.winner||""),
      round:Number(state.round||1),
      last_action:String(state.last_action||""),
      target_score:Number(state.target_score||config.target_score)
    },
    canvas:gameCanvas(config),
    started_at:row.started_at||null,
    round_ends_at:row.round_ends_at||null,
    ended_at:row.ended_at||null,
    version:Number(row.version||1),
    updated_at:row.updated_at||null
  };
}
function gameSceneSource(runtime){
  if(!runtime)return null;
  return{
    id:"game_runtime",
    name:`Game · ${runtime.title||"Community Game"}`,
    widget_type:"game_runtime",
    status:"live",
    public_token:runtime.public_token,
    source_url:runtime.source_url,
    source_urls:{obs:runtime.source_url,tiktok_vertical:runtime.source_url,landscape:runtime.source_url},
    published_config:{canvas:runtime.canvas||{width:900,height:300}},
    synthetic:true
  };
}
module.exports={GAME_TYPES,sanitizeGameProfile,sanitizeScoreAction,initialGameState,gameCanvas,gamePublicToken,publicGameRuntime,gameSceneSource};
