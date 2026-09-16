import {createRequire} from "node:module";const require=createRequire(import.meta.url);
const {assertFeature,assertStreamDeckButton,requiredFeatureForAction}=require("../src/entitlement-guard.js");
const free={stream_deck:false,live_bridge:false,local_output:false,max_stream_deck_buttons:0};
const creator={stream_deck:true,live_bridge:true,local_output:true,alerts:true,auto_thanks:true,max_stream_deck_buttons:8};
let blocked=0;
try{assertFeature(free,"local_output","Output")}catch(e){if(e.code==="entitlement_locked")blocked++}
try{assertStreamDeckButton(free,{id:"slot_1",action:"live_toggle",label:"LIVE"})}catch{blocked++}
assertStreamDeckButton(creator,{id:"slot_1",action:"live_toggle",label:"LIVE"});
assertStreamDeckButton(creator,{id:"slot_8",action:"alert_gift",label:"GIFT"});
try{assertStreamDeckButton(creator,{id:"slot_9",action:"open_games",label:"GAMES"})}catch(e){if(e.code==="deck_limit")blocked++}
if(blocked!==3)throw new Error("guard blocking mismatch");
if(requiredFeatureForAction("alert_follow")!=="alerts")throw new Error("action mapping");
console.log(JSON.stringify({ok:true,blocked,creator_keys:8}));
