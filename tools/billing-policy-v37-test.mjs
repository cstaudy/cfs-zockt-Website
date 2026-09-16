import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {billingAccessState,effectivePlan,stripeSubscriptionSnapshot,billingConfigState,shouldApplyStripeEvent,stripeSubscriptionIdFromInvoice}=require("../lib/creator-billing.js");

const now=new Date("2026-09-08T12:00:00Z");
const active=billingAccessState({plan:"creator",status:"active",current_period_end:"2026-10-08T12:00:00Z"},{now});
if(!active.access_active||active.access_plan!=="creator")throw new Error("active creator access");
const trial=billingAccessState({plan:"pro",status:"trialing"},{now});
if(!trial.access_active||trial.access_plan!=="pro")throw new Error("trial pro access");
const grace=billingAccessState({plan:"creator",status:"past_due",grace_ends_at:"2026-09-10T12:00:00Z"},{now});
if(!grace.access_active||grace.access_reason!=="payment_grace")throw new Error("grace access");
const expired=billingAccessState({plan:"creator",status:"past_due",grace_ends_at:"2026-09-07T12:00:00Z"},{now});
if(expired.access_active||expired.access_plan!=="free")throw new Error("expired grace");
if(effectivePlan("free",{plan:"creator",status:"active"},{now})!=="creator")throw new Error("billing elevates free");
if(effectivePlan("pro",{plan:"creator",status:"active"},{now})!=="pro")throw new Error("manual pro preserved");
if(effectivePlan("free",{plan:"pro",status:"canceled"},{now})!=="free")throw new Error("canceled falls back");

const sub={id:"sub_1",customer:"cus_1",status:"active",cancel_at_period_end:true,cancel_at:1791500000,ended_at:null,metadata:{creator_id:"creator_1",cfs_plan:"pro"},items:{data:[{id:"si_1",current_period_start:1788800000,current_period_end:1791500000,price:{id:"price_pro",currency:"eur",unit_amount:1299,recurring:{interval:"month"}}}]}};
const snap=stripeSubscriptionSnapshot(sub,{price_pro:"pro"},{id:"evt_2",created:1789000000});
if(snap.plan!=="pro"||snap.provider_price_id!=="price_pro"||snap.amount_minor!==1299||snap.interval!=="month"||!snap.cancel_at_period_end)throw new Error("stripe snapshot");
if(!snap.current_period_end||snap.current_period_end.getTime()!==1791500000*1000)throw new Error("item period end");
if(!shouldApplyStripeEvent({last_event_created:100,last_event_id:"evt_old"},{created:101,id:"evt_new"}))throw new Error("new event");
if(shouldApplyStripeEvent({last_event_created:101,last_event_id:"evt_new"},{created:100,id:"evt_old"}))throw new Error("stale event");
if(stripeSubscriptionIdFromInvoice({parent:{subscription_details:{subscription:"sub_parent"}}})!=="sub_parent")throw new Error("invoice subscription extraction");
const config=billingConfigState({secretKey:"sk_test_x",webhookSecret:"whsec_x",creatorPriceId:"price_c",proPriceId:"price_p",graceDays:3});
if(!config.enabled||!config.webhook_ready||!config.plans.creator.checkout_available||config.grace_days!==3)throw new Error("billing config");
console.log(JSON.stringify({ok:true,active:true,trial:true,grace:true,canceled_fallback:true,stripe_snapshot:true,event_order:true}));
