import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {stripeTestmodeE2E}=require("../lib/stripe-testmode-evidence.js");
const now=new Date("2026-09-08T12:00:00Z"),sec=Math.floor(now.getTime()/1000)-120,creator="creator_v38";
const event=(type,id,extra={})=>({event_id:id,event_type:type,creator_id:creator,event_created:sec,livemode:false,outcome:"processed",processed_at:"2026-09-08T11:58:00Z",...extra});
const good=[
 event("checkout.session.completed","evt_checkout"),
 event("customer.subscription.created","evt_sub_create"),
 event("customer.subscription.updated","evt_sub_update"),
 event("invoice.paid","evt_paid")
];
const result=stripeTestmodeE2E(good,{now,lookbackDays:14});
if(!result.verified||result.passed!==5||result.creators[0]!==creator)throw new Error(JSON.stringify(result));

const liveOnly=good.map(x=>({...x,livemode:true}));
if(stripeTestmodeE2E(liveOnly,{now}).verified)throw new Error("livemode falsely accepted");

const missing=good.filter(x=>x.event_type!=="invoice.paid");
if(stripeTestmodeE2E(missing,{now}).verified)throw new Error("missing invoice paid accepted");

const mismatch=[...good.filter(x=>x.event_type!=="invoice.paid"),event("invoice.paid","evt_paid_other",{creator_id:"other"})];
if(stripeTestmodeE2E(mismatch,{now}).verified)throw new Error("creator correlation missing");

console.log(JSON.stringify({ok:true,required_sequence:true,testmode_only:true,creator_correlation:true}));
