"use strict";
// Ledger for explicitly signed Stripe webhook events. No prices, test amounts or subscription
// estimates are treated as revenue. Historic webhook events with no money fields stay unknown.
const MONTH_PATTERN=/^(20\d\d)-(0[1-9]|1[0-2])$/;
const VALID_CURRENCY=/^[a-z]{3}$/;
const INCLUDED_OUTCOMES=new Set(["processed","ignored_stale","ignored_unmapped"]);

function parseMonth(value){
  if(!MONTH_PATTERN.test(String(value||"")))throw new RangeError("Monat muss YYYY-MM sein.");
  const [year,month]=String(value).split("-").map(Number);
  const from=Date.UTC(year,month-1,1),until=Date.UTC(year,month,1);
  return{month:value,from:Math.trunc(from/1000),until:Math.trunc(until/1000)};
}
function invoiceMoneyFromStripe(event){
  const obj=event?.data?.object||{};
  if(event?.type!=="invoice.paid"||obj?.object!=="invoice")return null;
  const id=String(obj.id||"");
  const currency=String(obj.currency||"").toLowerCase();
  const amount=Number(obj.amount_paid);
  if(!/^in_[a-zA-Z0-9]+$/.test(id)||!VALID_CURRENCY.test(currency)||!Number.isSafeInteger(amount)||amount<0)return null;
  return{invoice_id:id,currency,amount_paid_minor:amount};
}
function refundMoneyFromStripe(event){
  const obj=event?.data?.object||{};
  if(event?.type!=="charge.refunded"||obj?.object!=="charge")return null;
  const chargeId=String(obj.id||""),invoiceId=String(obj.invoice||"");
  const currency=String(obj.currency||"").toLowerCase();
  const refunded=Number(obj.amount_refunded);
  if(!/^ch_[a-zA-Z0-9]+$/.test(chargeId)||!/^in_[a-zA-Z0-9]+$/.test(invoiceId)||!VALID_CURRENCY.test(currency)||!Number.isSafeInteger(refunded)||refunded<0)return null;
  return{charge_id:chargeId,invoice_id:invoiceId,currency,amount_refunded_minor:refunded};
}
function sumVerifiedStripeEvents(rows, {mode="live",truncated=false}={}){
  if(!["live","test"].includes(mode))throw new RangeError("Stripe-Modus ist ungültig.");
  const expectedLive=mode==="live";
  const invoices=new Map(), refunds=new Map();
  let missingAmount=0,missingRefundMapping=0;
  for(const row of Array.isArray(rows)?rows:[]){
    if(Boolean(row.livemode)!==expectedLive||!INCLUDED_OUTCOMES.has(String(row.outcome||"")))continue;
    const summary=row.summary&&typeof row.summary==="object"?row.summary:{};
    if(row.event_type==="invoice.paid"){
      const m=summary.finance_invoice;
      if(!m||!/^in_[a-zA-Z0-9]+$/.test(String(m.invoice_id||""))||!VALID_CURRENCY.test(String(m.currency||""))||!Number.isSafeInteger(m.amount_paid_minor)||m.amount_paid_minor<0){missingAmount++;continue;}
      invoices.set(m.invoice_id,{...m,at:Number(row.event_created)||0});
    }else if(row.event_type==="charge.refunded"){
      const m=summary.finance_refund;
      if(!m||!/^ch_[a-zA-Z0-9]+$/.test(String(m.charge_id||""))||!/^in_[a-zA-Z0-9]+$/.test(String(m.invoice_id||""))||!VALID_CURRENCY.test(String(m.currency||""))||!Number.isSafeInteger(m.amount_refunded_minor)||m.amount_refunded_minor<0){missingRefundMapping++;continue;}
      // The charge's refunded amount is cumulative. Retain the maximum to prevent double counts.
      const old=refunds.get(m.charge_id);
      if(!old||m.amount_refunded_minor>old.amount_refunded_minor)refunds.set(m.charge_id,m);
    }
  }
  const currencies=new Map();
  const item=currency=>{if(!currencies.has(currency))currencies.set(currency,{currency,gross_minor:0,refund_minor:0,net_before_fees_minor:0,invoices:0,refund_events:0});return currencies.get(currency);};
  for(const m of invoices.values()){
    const c=item(m.currency);c.gross_minor+=m.amount_paid_minor;c.invoices++;
  }
  let unlinkedRefunds=0;
  for(const m of refunds.values()){
    const invoice=invoices.get(m.invoice_id);
    if(!invoice||invoice.currency!==m.currency){unlinkedRefunds++;continue;}
    const c=item(m.currency);c.refund_minor+=m.amount_refunded_minor;c.refund_events++;
  }
  for(const c of currencies.values())c.net_before_fees_minor=c.gross_minor-c.refund_minor;
  return{
    mode,period_source:"stripe_signed_webhook_events",currencies:[...currencies.values()].sort((a,b)=>a.currency.localeCompare(b.currency)),
    invoice_count:invoices.size,missing_legacy_invoice_amount:missingAmount,
    unlinked_refunds:unlinkedRefunds,missing_refund_mapping:missingRefundMapping,
    truncated:Boolean(truncated),
    complete:false,
    notes:[
      "Nur bestätigte signierte Stripe-Webhooks dieses Zeitraums. Ältere Ereignisse können keine Beträge enthalten; kein historischer Backfill.",
      "Charge-Refunds werden nur mit eindeutig zugeordneten Rechnungen gegengerechnet. Unzugeordnete Erstattungen werden separat gemeldet.",
      "Netto vor Stripe-Gebühren ist kein steuerlicher Nettoumsatz. Gebühren, Steuern und Stripe-Auszahlungen werden hier nicht berechnet.",
      "Paketkäufe sind im Shop weiterhin paid_preview, nicht in diesen Abo-Zahlen enthalten."
    ]
  };
}
module.exports={parseMonth,invoiceMoneyFromStripe,refundMoneyFromStripe,sumVerifiedStripeEvents};
