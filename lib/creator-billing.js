"use strict";

const {normalizePlan,planRank}=require("./creator-plan-policy");

const BILLING_PROVIDER="stripe";
const ACCESS_STATUSES=new Set(["active","trialing"]);
const TERMINAL_STATUSES=new Set(["canceled","unpaid","incomplete_expired","paused"]);
const KNOWN_STATUSES=new Set(["none","incomplete","incomplete_expired","trialing","active","past_due","canceled","unpaid","paused"]);

function cleanText(value,max=200){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function normalizeBillingStatus(value){const v=cleanText(value,40).toLowerCase();return KNOWN_STATUSES.has(v)?v:"none"}
function stripeObjectId(value){return typeof value==="string"?value:cleanText(value?.id,200,"")}
function stripeSubscriptionIdFromInvoice(invoice={}){
  return stripeObjectId(invoice.subscription)||
    stripeObjectId(invoice.parent?.subscription_details?.subscription)||
    stripeObjectId(invoice.parent?.subscription)||"";
}
function secondsDate(value){const n=Number(value);return Number.isFinite(n)&&n>0?new Date(n*1000):null}
function itemFromSubscription(subscription={}){return Array.isArray(subscription?.items?.data)&&subscription.items.data.length?subscription.items.data[0]:null}
function planFromStripeSubscription(subscription={},pricePlanMap={}){
  const metaPlan=normalizePlan(subscription?.metadata?.cfs_plan||subscription?.metadata?.plan||"");
  if(["creator","pro"].includes(metaPlan))return metaPlan;
  const item=itemFromSubscription(subscription),priceId=stripeObjectId(item?.price)||stripeObjectId(item?.plan);
  return normalizePlan(pricePlanMap[priceId]||"free");
}
function billingAccessState(subscription={},options={}){
  const now=options.now instanceof Date?options.now:new Date(options.now||Date.now());
  const status=normalizeBillingStatus(subscription?.status),plan=normalizePlan(subscription?.plan);
  const graceEnd=subscription?.grace_ends_at?new Date(subscription.grace_ends_at):null;
  const periodEnd=subscription?.current_period_end?new Date(subscription.current_period_end):null;
  let active=false,reason="none";
  if(plan!=="free"&&ACCESS_STATUSES.has(status)){active=true;reason=subscription?.cancel_at_period_end?"active_until_period_end":"subscription_active"}
  else if(plan!=="free"&&status==="past_due"&&graceEnd&&graceEnd.getTime()>now.getTime()){active=true;reason="payment_grace"}
  else if(status==="past_due"){reason="payment_grace_expired"}
  else if(TERMINAL_STATUSES.has(status)){reason=`subscription_${status}`}
  else if(status==="incomplete"){reason="payment_incomplete"}
  return{
    status,plan,access_active:active,access_plan:active?plan:"free",access_reason:reason,
    current_period_end:periodEnd&&Number.isFinite(periodEnd.getTime())?periodEnd:null,
    grace_ends_at:graceEnd&&Number.isFinite(graceEnd.getTime())?graceEnd:null,
    cancel_at_period_end:Boolean(subscription?.cancel_at_period_end)
  };
}
function effectivePlan(basePlan,subscription={},options={}){
  const base=normalizePlan(basePlan),billing=billingAccessState(subscription,options).access_plan;
  return planRank(billing)>planRank(base)?billing:base;
}
function stripeSubscriptionSnapshot(subscription={},pricePlanMap={},event={}){
  const item=itemFromSubscription(subscription),price=item?.price||item?.plan||{},plan=planFromStripeSubscription(subscription,pricePlanMap);
  return{
    provider:BILLING_PROVIDER,
    provider_customer_id:stripeObjectId(subscription.customer),
    provider_subscription_id:stripeObjectId(subscription.id),
    provider_price_id:stripeObjectId(price),
    plan,
    status:normalizeBillingStatus(subscription.status),
    current_period_start:secondsDate(item?.current_period_start),
    current_period_end:secondsDate(item?.current_period_end),
    cancel_at_period_end:Boolean(subscription.cancel_at_period_end),
    cancel_at:secondsDate(subscription.cancel_at),
    ended_at:secondsDate(subscription.ended_at),
    currency:cleanText(price?.currency||subscription.currency,8).toLowerCase(),
    amount_minor:Number.isFinite(Number(price?.unit_amount))?Math.round(Number(price.unit_amount)):null,
    interval:cleanText(price?.recurring?.interval||item?.plan?.interval,20).toLowerCase(),
    last_event_id:cleanText(event?.id,200),
    last_event_created:Number.isFinite(Number(event?.created))?Math.round(Number(event.created)):0
  };
}
function publicBillingSubscription(row={},options={}){
  const access=billingAccessState(row,options);
  return{
    configured:Boolean(row?.provider||row?.provider_subscription_id||row?.provider_customer_id),
    provider:cleanText(row?.provider,40),
    plan:normalizePlan(row?.plan),status:normalizeBillingStatus(row?.status),
    current_period_start:row?.current_period_start||null,current_period_end:row?.current_period_end||null,
    cancel_at_period_end:Boolean(row?.cancel_at_period_end),cancel_at:row?.cancel_at||null,ended_at:row?.ended_at||null,
    grace_ends_at:row?.grace_ends_at||null,last_invoice_status:cleanText(row?.last_invoice_status,40),
    access_active:access.access_active,access_plan:access.access_plan,access_reason:access.access_reason
  };
}
function billingConfigState({secretKey="",webhookSecret="",creatorPriceId="",proPriceId="",graceDays=3}={}){
  const secret=Boolean(cleanText(secretKey,500)),webhook=Boolean(cleanText(webhookSecret,500)),creator=Boolean(cleanText(creatorPriceId,300)),pro=Boolean(cleanText(proPriceId,300));
  const webhookReady=secret&&webhook,checkoutReady=webhookReady&&(creator||pro);
  return{
    provider:BILLING_PROVIDER,
    enabled:checkoutReady,
    provider_configured:secret,
    webhook_ready:webhookReady,
    portal_available:secret,
    checkout_available:checkoutReady,
    plans:{free:{checkout_available:false},creator:{checkout_available:webhookReady&&creator},pro:{checkout_available:webhookReady&&pro}},
    grace_days:Math.max(0,Math.min(30,Math.round(Number(graceDays)||0)))
  };
}
function eventSummary(event={}){
  const obj=event?.data?.object||{};
  return{
    id:cleanText(event.id,200),type:cleanText(event.type,120),created:Number.isFinite(Number(event.created))?Math.round(Number(event.created)):0,
    livemode:Boolean(event.livemode),object:cleanText(obj.object,60),object_id:cleanText(obj.id,200),customer_id:stripeObjectId(obj.customer),subscription_id:obj.object==="subscription"?stripeObjectId(obj.id):stripeSubscriptionIdFromInvoice(obj)
  };
}
function shouldApplyStripeEvent(row={},event={}){
  const nextCreated=Number(event?.created||0),lastCreated=Number(row?.last_event_created||0);
  if(!lastCreated)return true;
  if(nextCreated>lastCreated)return true;
  if(nextCreated<lastCreated)return false;
  return cleanText(event?.id,200)!==cleanText(row?.last_event_id,200);
}

module.exports={
  BILLING_PROVIDER,ACCESS_STATUSES,TERMINAL_STATUSES,KNOWN_STATUSES,
  normalizeBillingStatus,stripeSubscriptionIdFromInvoice,planFromStripeSubscription,
  billingAccessState,effectivePlan,stripeSubscriptionSnapshot,publicBillingSubscription,
  billingConfigState,eventSummary,shouldApplyStripeEvent
};
