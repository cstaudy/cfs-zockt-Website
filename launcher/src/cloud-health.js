function validateBaseUrl(raw) {
  const url = new URL(String(raw || "").trim().replace(/\/+$/,""));
  const local = ["localhost","127.0.0.1","::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Backend Healthcheck benötigt HTTPS.");
  }
  return url;
}

async function checkCloudHealth(rawUrl, { fetchImpl = fetch, timeoutMs = 6500 } = {}) {
  const checkedAt = new Date().toISOString();
  let base;
  try { base = validateBaseUrl(rawUrl); }
  catch (error) {
    return {ok:false,online:false,database:false,checkedAt,latencyMs:0,error:String(error.message || error),modules:{}};
  }

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),Math.max(1000,Math.min(15000,Number(timeoutMs)||6500)));
  const started = Date.now();
  try {
    const response = await fetchImpl(new URL("/api/health",base).toString(),{
      method:"GET",cache:"no-store",signal:controller.signal,
      headers:{"user-agent":"cfs-zockt-creator-suite-health/1"}
    });
    const payload = await response.json().catch(()=>({}));
    const latencyMs = Date.now()-started;
    return {
      ok:Boolean(response.ok && payload.ok),
      online:Boolean(response.ok),
      database:payload.database === "connected",
      status:String(payload.status || (response.ok?"online":"error")),
      service:String(payload.service || ""),
      version:String(payload.version || ""),
      backend:String(payload.backend || ""),
      modules:payload.modules && typeof payload.modules === "object" ? payload.modules : {},
      latencyMs,
      checkedAt,
      error:response.ok ? "" : String(payload.error || `HTTP ${response.status}`)
    };
  } catch (error) {
    return {
      ok:false,online:false,database:false,status:"offline",service:"",version:"",backend:"",
      modules:{},latencyMs:Date.now()-started,checkedAt,
      error:error?.name === "AbortError" ? "Backend Healthcheck Timeout." : String(error?.message || error)
    };
  } finally { clearTimeout(timer); }
}

function creatorReady({settings={},health={},preflight={},bridge={},spool={},encryptionAvailable=false}={}) {
  const checks = [
    {key:"setup",label:"Einrichtung",ok:Number(settings.setupVersion||0)>=1,detail:Number(settings.setupVersion||0)>=1?"abgeschlossen":"Setup noch offen",blocking:true},
    {key:"encryption",label:"Lokale Verschlüsselung",ok:Boolean(encryptionAvailable),detail:encryptionAvailable?"verfügbar":"nicht verfügbar",blocking:true},
    {key:"backend",label:"Creator Cloud",ok:Boolean(health.ok),detail:health.ok?`${health.latencyMs||0} ms`:(health.error||"offline"),blocking:true},
    {key:"database",label:"Cloud Datenbank",ok:Boolean(health.database),detail:health.database?"verbunden":"nicht verbunden",blocking:true},
    {key:"bridge_key",label:"Bridge-Key",ok:Boolean(settings.tokenStored),detail:settings.tokenStored?"gespeichert":"fehlt",blocking:true},
    {key:"bridge",label:"Bridge",ok:Boolean(bridge.connected),detail:bridge.connected?`${bridge.latencyMs||0} ms`:(bridge.lastError||"offline"),blocking:true},
    {key:"provider",label:"LIVE Provider",ok:preflight.checks?.find?.(x=>["simulator","provider_key"].includes(x.key))?.ok !== false,detail:settings.provider==="tiktool"?"TikTok LIVE Provider":"Simulator",blocking:true},
    {key:"spool",label:"Event Recovery",ok:spool.persistent===true,detail:spool.persistent?`${Number(spool.pending||0)} wartend`:"nicht persistent",blocking:true}
  ];

  const passed = checks.filter(x=>x.ok).length;
  const blockers = checks.filter(x=>x.blocking&&!x.ok);
  return {
    ready:blockers.length===0,
    score:Math.round((passed/checks.length)*100),
    passed,
    total:checks.length,
    blockers,
    checks,
    generatedAt:new Date().toISOString()
  };
}

module.exports = { checkCloudHealth, creatorReady, validateBaseUrl };
