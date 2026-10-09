(()=>{"use strict";
const $=id=>document.getElementById(id);
async function load(){
  const button=$("shopCheckoutGateLoad");if(button)button.disabled=true;
  try{
    const result=await CFS.json("/api/admin/store/checkout-readiness");
    if(result?.ok!==true)throw Error(result?.error||"Freigabestatus nicht erreichbar.");
    $("shopCheckoutGate").textContent=result.paid_checkout_enabled===true?"TECHNIK FREIGEGEBEN":"KOSTENPFLICHTIGE KÄUFE GESPERRT";
    $("shopCheckoutGateDetail").textContent=`Preisvorschau-Produkte: ${Number(result.paid_preview_products)||0}. Stripe-Abos: ${result.stripe_subscription_mode||"unbekannt"}. ${Array.isArray(result.reasons)?result.reasons.join(" "):""}`;
  }catch(error){$("shopCheckoutGate").textContent="STATUS NICHT LESBAR";$("shopCheckoutGateDetail").textContent=String(error.message||error);}
  finally{if(button)button.disabled=false;}
}
document.addEventListener("DOMContentLoaded",()=>{$("shopCheckoutGateLoad")?.addEventListener("click",load);});
})();
