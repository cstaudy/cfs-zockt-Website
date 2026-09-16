"use strict";

function bool(value){return value===true||String(value||"").trim().toLowerCase()==="true"}
function check(id,label,ok,kind="external",detail=""){return{id,label,ok:Boolean(ok),kind,detail:String(detail||"")}}
function flag(flags,key){return bool(flags?.[key])}
function productionReleaseReadiness({billing={},appBaseUrl="",releaseCandidate={},flags={},stripeTestmode={}}={}){
  const billingE2E=flag(flags,"billing_live_verified")||stripeTestmode.verified===true;
  const checks=[
    check("app_https","Production APP_BASE_URL nutzt HTTPS",String(appBaseUrl||"").startsWith("https://"),"config"),
    check("billing_provider","Billing Provider konfiguriert",billing.enabled===true,"config"),
    check("billing_webhook","Billing Webhook signiert konfiguriert",billing.webhook_ready===true,"config"),
    check("creator_price","CREATOR Price konfiguriert",billing.plans?.creator?.checkout_available===true,"config"),
    check("pro_price","PRO Price konfiguriert",billing.plans?.pro?.checkout_available===true,"config"),
    check("rc_data","Release-Candidate Daten-Gate erfüllt",releaseCandidate.ready===true,"beta"),
    check("windows_build","GitHub Windows Build real verifiziert",flag(flags,"windows_build_verified")),
    check("code_signing","Windows Code Signing real verifiziert",flag(flags,"code_signing_verified")),
    check("clean_install","Clean Windows 11 Installation verifiziert",flag(flags,"clean_install_verified")),
    check("updater_e2e","Installierter Updater E2E verifiziert",flag(flags,"updater_e2e_verified")),
    check("obs_field","OBS Ausgabe real verifiziert",flag(flags,"obs_field_verified")),
    check("tiktok_live_field","TikTok LIVE Workflow real verifiziert",flag(flags,"tiktok_live_field_verified")),
    check("billing_live","Stripe Testmode Checkout + Webhook E2E verifiziert",billingE2E,"external",stripeTestmode.verified===true?"automatisch aus echten Testmode-Webhooks":""),
    check("two_creators","Zwei Creator parallel verifiziert",flag(flags,"two_creators_verified")),
    check("canary","Produktions-Canary verifiziert",flag(flags,"canary_verified")),
    check("rollback","Produktions-Rollback verifiziert",flag(flags,"rollback_verified"))
  ];
  const configChecks=checks.filter(c=>c.kind==="config"),externalChecks=checks.filter(c=>c.kind!=="config");
  const passed=checks.filter(c=>c.ok).length,total=checks.length;
  return{
    ready:checks.every(c=>c.ok),score:total?Math.round(passed/total*100):0,passed,total,
    config_ready:configChecks.every(c=>c.ok),external_ready:externalChecks.every(c=>c.ok),
    checks,blocking:checks.filter(c=>!c.ok).map(c=>c.id),
    stripe_testmode:stripeTestmode&&typeof stripeTestmode==="object"?stripeTestmode:{}
  };
}
module.exports={productionReleaseReadiness};
