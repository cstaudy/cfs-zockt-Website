import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { GiftStreakTracker }=require("../src/gift-streak-tracker.js");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const out=[];
const tracker=new GiftStreakTracker({timeoutMs:500,emit:(e,meta)=>out.push({e,meta})});

// Non-streak gift should emit immediately.
tracker.handle({giftId:"rose",giftName:"Rose",repeatCount:1,streakable:false,user:{uniqueId:"alice"}});
if(out.length!==1||out[0].e.repeatCount!==1)throw new Error("Single gift failed");

// Streak partials must not emit; final repeatEnd must emit exactly once with final amount.
tracker.handle({giftId:"heart",giftName:"Heart",repeatCount:1,repeatEnd:false,user:{uniqueId:"bob"}});
tracker.handle({giftId:"heart",giftName:"Heart",repeatCount:2,repeatEnd:false,user:{uniqueId:"bob"}});
tracker.handle({giftId:"heart",giftName:"Heart",repeatCount:5,repeatEnd:true,user:{uniqueId:"bob"}});
if(out.length!==2)throw new Error(`Expected exactly one streak emission, got ${out.length-1}`);
if(out[1].e.repeatCount!==5||out[1].meta.reason!=="repeatEnd")throw new Error("Final streak count failed");

// Missing repeatEnd must still recover through timeout.
tracker.handle({giftId:"finger",giftName:"Finger Heart",repeatCount:3,repeatEnd:false,user:{uniqueId:"carla"}});
await sleep(700);
if(out.length!==3||out[2].e.repeatCount!==3||out[2].meta.reason!=="timeout")throw new Error("Streak timeout fallback failed");

console.log(JSON.stringify({ok:true,emissions:out.map(x=>({count:x.e.repeatCount,reason:x.meta.reason}))}));
