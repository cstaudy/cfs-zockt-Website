import {createRequire} from "node:module";const require=createRequire(import.meta.url);const {executeStreamDeckAction}=require("../src/stream-deck-actions.js");
const calls=[];let live=false,tts=true,visible=true,game={status:"idle",state:{score_a:0,score_b:0}};
const ctx={
 isLive:async()=>live,
 startLive:async()=>{live=true;calls.push("startLive")},
 endLive:async()=>{live=false;calls.push("endLive")},
 startNextScene:async()=>{calls.push("nextScene");return{id:"s2",name:"Scene Zwei"}},
 startScene:async id=>{calls.push("scene:"+id);return{id,name:"Scene"}},
 stopOutput:async()=>calls.push("stopOutput"),
 reloadOutput:async()=>calls.push("reloadOutput"),
 testAlert:async type=>calls.push("alert:"+type),
 toggleAutoThanks:async()=>{tts=!tts;calls.push("tts");return tts},
 toggleWidget:async id=>{visible=!visible;calls.push("widget:"+id);return{widget_id:id,visible}},
 refreshLibrary:async()=>calls.push("refresh"),
 gameStatus:async()=>game,
 gameStart:async()=>{game={...game,status:"running"};calls.push("gameStart");return game},
 gameStop:async()=>{game={...game,status:"idle"};calls.push("gameStop");return game},
 gameScore:async(team,delta)=>{const key=team==="b"?"score_b":"score_a";game={...game,state:{...game.state,[key]:Number(game.state[key]||0)+delta}};calls.push("gameScore:"+team);return game},
 gameReset:async()=>{game={...game,state:{score_a:0,score_b:0}};calls.push("gameReset");return game},
 openCutProject:async id=>calls.push("cut:"+id),
 openPage:async page=>calls.push("open:"+page)
};
await executeStreamDeckAction({action:"live_toggle"},ctx);
await executeStreamDeckAction({action:"live_toggle"},ctx);
await executeStreamDeckAction({action:"scene_next"},ctx);
await executeStreamDeckAction({action:"scene_start",target:"s1"},ctx);
await executeStreamDeckAction({action:"alert_gift"},ctx);
const w=await executeStreamDeckAction({action:"widget_toggle",target:"w1"},ctx);
const a=await executeStreamDeckAction({action:"autothanks_toggle"},ctx);
await executeStreamDeckAction({action:"game_toggle"},ctx);
await executeStreamDeckAction({action:"game_score_a"},ctx);
await executeStreamDeckAction({action:"game_reset"},ctx);
await executeStreamDeckAction({action:"game_toggle"},ctx);
await executeStreamDeckAction({action:"open_cut_project",target:"cut-1"},ctx);
await executeStreamDeckAction({action:"open_games"},ctx);
if(!calls.includes("startLive")||!calls.includes("endLive")||!calls.includes("alert:gift"))throw new Error("core actions missing");
if(w.visible!==false||a.enabled!==false)throw new Error("toggle result wrong");
if(!calls.includes("open:/pages/games.html"))throw new Error("safe page action missing");
if(!calls.includes("gameStart")||!calls.includes("gameScore:a")||!calls.includes("gameReset")||!calls.includes("gameStop"))throw new Error("game actions missing");
if(!calls.includes("cut:cut-1"))throw new Error("cut project action missing");
let blocked=false;try{await executeStreamDeckAction({action:"arbitrary_shell"},ctx)}catch{blocked=true}
if(!blocked)throw new Error("unknown action not blocked");
console.log(JSON.stringify({ok:true,calls:calls.length,unknown_blocked:true}));
