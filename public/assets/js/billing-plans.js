(()=>{
  "use strict";
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let catalog=null,status=null;
  function fmtDate(value){if(!value)return"–";const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}):"–"}
  function alert(message,bad=false){const el=$("#billingAlert");if(!el)return;el.hidden=false;el.className=`billing-alert ${bad?"bad":"ok"}`;el.textContent=message}
  function planLabel(v){return String(v||"free").toUpperCase()}
  function render(){
    const effective=status?.effective_plan||"free",sub=status?.subscription||{};
    $$("[data-plan-card]").forEach(card=>card.classList.toggle("billing-plan-current",card.dataset.planCard===effective));
    if($("#billingCurrentPlan"))$("#billingCurrentPlan").textContent=planLabel(effective);
    if($("#billingSource"))$("#billingSource").textContent=String(status?.access_source||"plan").replaceAll("_"," ").toUpperCase();
    if($("#billingSubStatus"))$("#billingSubStatus").textContent=String(sub.status||"none").toUpperCase();
    if($("#billingPeriodEnd"))$("#billingPeriodEnd").textContent=fmtDate(sub.current_period_end);
    if($("#billingGrace"))$("#billingGrace").textContent=sub.access_reason==="payment_grace"?`GRACE BIS ${fmtDate(sub.grace_ends_at)}`:sub.cancel_at_period_end?`ENDET ${fmtDate(sub.current_period_end)}`:"–";
    const portal=$("#openBillingPortal");if(portal){portal.hidden=!sub.configured;portal.disabled=!status?.portal_available}
    $$("[data-checkout-plan]").forEach(button=>{
      const plan=button.dataset.checkoutPlan,planInfo=(catalog?.plans||[]).find(p=>p.key===plan),isCurrent=effective===plan;
      button.disabled=isCurrent||!planInfo?.checkout_available||Boolean(sub.access_active&&sub.configured);
      button.textContent=isCurrent?"AKTUELLER PLAN":sub.access_active&&sub.configured?"ÜBER BILLING VERWALTEN":planInfo?.checkout_available?`${planLabel(plan)} BUCHEN`:"NOCH NICHT KONFIGURIERT";
    });
    if(status?.subscription?.access_reason==="payment_grace")alert(`Zahlung offen: Premium-Zugriff bleibt bis ${fmtDate(status.subscription.grace_ends_at)} in der Grace Period aktiv.`,true);
    else if(status?.subscription?.cancel_at_period_end)alert(`Kündigung vorgemerkt. Zugriff bleibt bis ${fmtDate(status.subscription.current_period_end)} aktiv.`);
  }
  async function load(){
    try{catalog=await CFS.json("/api/plans/catalog")}catch(error){alert(error.message,true);return}
    try{status=await CFS.json("/api/creator/billing/status")}catch(error){status=null}
    render();
  }
  async function checkout(plan){
    try{const r=await CFS.json("/api/creator/billing/checkout",{method:"POST",body:JSON.stringify({plan})});if(!r.url)throw new Error("Checkout URL fehlt.");location.href=r.url}catch(error){alert(error.message,true)}
  }
  async function portal(){
    try{const r=await CFS.json("/api/creator/billing/portal",{method:"POST",body:"{}"});if(!r.url)throw new Error("Portal URL fehlt.");location.href=r.url}catch(error){alert(error.message,true)}
  }
  $$("[data-checkout-plan]").forEach(btn=>btn.addEventListener("click",()=>checkout(btn.dataset.checkoutPlan)));
  $("#openBillingPortal")?.addEventListener("click",portal);
  load();
  if(new URLSearchParams(location.search).get("billing")==="success"){
    alert("Checkout abgeschlossen. Der Subscription-Status wird über den signierten Billing-Webhook aktualisiert.");
    let tries=0;const timer=setInterval(async()=>{tries++;await load();if(status?.subscription?.access_active||tries>=8)clearInterval(timer)},1200);
  }
})();
