"use strict";

const REQUIRED_TESTMODE_EVENTS=Object.freeze([
  "checkout.session.completed",
  "customer.subscription.created",
  "invoice.paid"
]);

function text(value,max=180){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function eventType(row={}){return text(row.event_type||row.type,140)}
function processed(row={}){return String(row.outcome||"").toLowerCase()==="processed"}
function isTestmode(row={}){return row.livemode===false||String(row.livemode).toLowerCase()==="false"}
function eventTime(row={}){
  const created=Number(row.event_created||0);
  if(created>0)return created*1000;
  const d=new Date(row.processed_at||row.created_at||0);
  return Number.isFinite(d.getTime())?d.getTime():0;
}
function stripeTestmodeE2E(events=[],options={}){
  const now=options.now instanceof Date?options.now:new Date(options.now||Date.now());
  const lookbackDays=Math.max(1,Math.min(90,Number(options.lookbackDays||14)));
  const cutoff=now.getTime()-lookbackDays*86400000;
  const rows=(Array.isArray(events)?events:[]).filter(row=>isTestmode(row)&&processed(row)&&eventTime(row)>=cutoff);
  const byType={};
  for(const row of rows){
    const type=eventType(row);
    if(type&&!byType[type])byType[type]=row;
  }
  const checks=REQUIRED_TESTMODE_EVENTS.map(type=>({type,ok:Boolean(byType[type]),event_id:text(byType[type]?.event_id,200),processed_at:byType[type]?.processed_at||null}));
  const subscriptionLifecycle=Boolean(byType["customer.subscription.updated"]||byType["customer.subscription.deleted"]);
  checks.push({type:"subscription.lifecycle.update",ok:subscriptionLifecycle,event_id:text((byType["customer.subscription.updated"]||byType["customer.subscription.deleted"])?.event_id,200),processed_at:(byType["customer.subscription.updated"]||byType["customer.subscription.deleted"])?.processed_at||null});
  const paidCreators=new Set(rows.filter(row=>eventType(row)==="invoice.paid"&&row.creator_id).map(row=>String(row.creator_id)));
  const checkoutCreators=new Set(rows.filter(row=>eventType(row)==="checkout.session.completed"&&row.creator_id).map(row=>String(row.creator_id)));
  const sameCreator=[...checkoutCreators].some(id=>paidCreators.has(id));
  checks.push({type:"creator.correlation",ok:sameCreator,event_id:"",processed_at:null});
  const passed=checks.filter(c=>c.ok).length;
  return{
    verified:checks.every(c=>c.ok),
    mode:"test",
    lookback_days:lookbackDays,
    passed,total:checks.length,
    checks,
    matched_events:rows.length,
    creators:[...new Set(rows.map(row=>row.creator_id).filter(Boolean).map(String))]
  };
}

module.exports={REQUIRED_TESTMODE_EVENTS,stripeTestmodeE2E};
