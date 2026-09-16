"use strict";

function normalizeBaseUrl(value){return String(value||"").trim().replace(/\/+$/,"")}
function resultCheck(id,label,ok,detail=""){return{id,label,ok:Boolean(ok),detail:String(detail||"")}}
async function fetchJson(fetchImpl,url,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(options.timeoutMs||10000)));
  try{
    const res=await fetchImpl(url,{headers:{"accept":"application/json"},signal:controller.signal});
    let body=null;try{body=await res.json()}catch{}
    return{ok:res.ok,status:res.status,body};
  }finally{clearTimeout(timer)}
}
async function runProductionCanary({baseUrl,expectedVersion="",requireBilling=false,fetchImpl=globalThis.fetch,timeoutMs=10000}={}){
  const base=normalizeBaseUrl(baseUrl);
  if(!/^https?:\/\//i.test(base))throw new Error("Canary URL ist ungültig.");
  if(typeof fetchImpl!=="function")throw new Error("fetch ist nicht verfügbar.");
  const health=await fetchJson(fetchImpl,`${base}/api/health`,{timeoutMs});
  const checks=[
    resultCheck("health_http","/api/health HTTP OK",health.ok,`HTTP ${health.status}`),
    resultCheck("health_ok","Health Payload ok=true",health.body?.ok===true),
    resultCheck("database","Datenbank verbunden",health.body?.database==="connected",String(health.body?.database||"")),
    resultCheck("version","Backend-Version stimmt",!expectedVersion||String(health.body?.version||"")===String(expectedVersion),String(health.body?.version||""))
  ];
  let plans=null;
  if(requireBilling){
    plans=await fetchJson(fetchImpl,`${base}/api/plans/catalog`,{timeoutMs});
    checks.push(
      resultCheck("plans_http","Plan Catalog HTTP OK",plans.ok,`HTTP ${plans.status}`),
      resultCheck("billing_enabled","Billing Checkout konfiguriert",plans.body?.billing_enabled===true),
      resultCheck("billing_webhook","Billing Webhook ready",plans.body?.webhook_ready===true)
    );
  }
  const passed=checks.filter(c=>c.ok).length;
  return{
    schema:1,
    generated_at:new Date().toISOString(),
    target:base,
    expected_version:String(expectedVersion||""),
    observed_version:String(health.body?.version||""),
    require_billing:Boolean(requireBilling),
    ok:checks.every(c=>c.ok),
    passed,total:checks.length,
    checks,
    health:health.body&&typeof health.body==="object"?{service:health.body.service,version:health.body.version,status:health.body.status,database:health.body.database}:null,
    billing:plans?.body&&typeof plans.body==="object"?{billing_enabled:plans.body.billing_enabled,webhook_ready:plans.body.webhook_ready,provider:plans.body.provider}:null
  };
}
module.exports={normalizeBaseUrl,runProductionCanary};
