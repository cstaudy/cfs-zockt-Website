"use strict";
// Public-facing status classification from server-owned timestamps only.
// A heartbeat proves possession of the worker token, NOT that an RPC worked.
function bridgeHealth({enabled=false,configured=false,transport="direct",worker=null,lastSuccess=null,now=Date.now()}={}){
  const live=transport==="bridge";
  const seen=worker?.last_seen_at?Date.parse(worker.last_seen_at):NaN;
  const age=Number.isFinite(seen)?Math.max(0,Math.round((now-seen)/1000)):null;
  const heartbeat=Boolean(live&&enabled&&configured&&age!==null&&age<=45&&seen<=now+5000);
  const completed=lastSuccess?.completed_at?Date.parse(lastSuccess.completed_at):NaN;
  const rpcVerified=Boolean(heartbeat&&lastSuccess?.worker_id===worker?.worker_id&&Number.isFinite(completed)&&completed>=now-600000&&completed<=now+5000);
  const service=worker?.status?.service||{};
  const localService=Boolean(heartbeat&&!service.bridge_error&&service.version&&service.version!=="unknown");
  const ollama=Boolean(localService&&service.ollama?.online===true);
  const mode=!live?"direct":!enabled?"disabled":!configured?"not_configured":!heartbeat?"offline":rpcVerified?"verified":"heartbeat_only";
  return {mode,transport,worker_online:heartbeat,last_heartbeat_at:Number.isFinite(seen)?new Date(seen).toISOString():null,heartbeat_age_seconds:age,rpc_verified:rpcVerified,last_successful_rpc_at:Number.isFinite(completed)?new Date(completed).toISOString():null,local_service_online:localService,ollama_online:ollama,configured:live?Boolean(configured):null};
}
module.exports={bridgeHealth};
