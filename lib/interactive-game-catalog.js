"use strict";
const CORE=Object.freeze([
 {key:"chat_battle",label:"Chat Battle",category:"Community",engine:"launcher_local",terminal_id:"chat-battle",canvas:{width:1920,height:1080},events:["chat","like","gift","follow","share"],version:"1.0.0"},
 {key:"community_quiz",label:"Community Quiz",category:"Community",engine:"launcher_local",terminal_id:"community-quiz",canvas:{width:1920,height:1080},events:["chat","like"],version:"1.0.0"},
 {key:"gift_rush",label:"Gift Rush",category:"LIVE",engine:"launcher_local",terminal_id:"gift-rush",canvas:{width:1920,height:1080},events:["gift","like","share"],version:"1.0.0"},
 {key:"nexus",label:"NEXUS",category:"Arcade",engine:"launcher_local",terminal_id:"nexus",canvas:{width:1920,height:1080},events:["chat","like","gift","follow","share"],version:"1.0.0"},
 {key:"boss_arena",label:"Boss Arena",category:"Arcade",engine:"launcher_local",terminal_id:"boss-arena",canvas:{width:1920,height:1080},events:["like","gift","follow"],version:"1.0.0"},
 {key:"reaction_race",label:"Reaction Race",category:"Arcade",engine:"launcher_local",terminal_id:"reaction-race",canvas:{width:1920,height:1080},events:["chat","like"],version:"1.0.0"},
 {key:"community_goal",label:"Community Goal",category:"Community",engine:"launcher_local",terminal_id:"community-goal",canvas:{width:1920,height:1080},events:["like","gift","follow","share"],version:"1.0.0"}
]);
function dynamicLocalGameKey(id){const safe=String(id||"").toLowerCase().trim().replace(/[^a-z0-9_-]/g,"").slice(0,64);return safe?`local:${safe}`:""}
function isDynamicLocalGameKey(value){return /^local:[a-z0-9_-]{1,64}$/.test(String(value||""))}
function gameDefinition(value){const key=String(value||"");const found=CORE.find(x=>x.key===key);if(found)return {...found,canvas:{...found.canvas},events:[...found.events]};if(isDynamicLocalGameKey(key)){const id=key.slice(6);return{key,label:id.replace(/[-_]+/g," "),category:"Local Module",engine:"launcher_local",terminal_id:id,canvas:{width:1920,height:1080},events:["chat","like","gift","follow","share","viewer_update"],version:"1.0.0",dynamic:true}}return null}
function publicGameCatalog(){return CORE.map(x=>({...x,canvas:{...x.canvas},events:[...x.events]}))}
module.exports={publicGameCatalog,gameDefinition,dynamicLocalGameKey,isDynamicLocalGameKey,CORE_GAME_CATALOG:CORE};
