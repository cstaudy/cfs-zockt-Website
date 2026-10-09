"use strict";

const ALLOWED = [
  ["GET", /^\/api\/status$/],
  ["POST", /^\/api\/chat$/],
  ["GET", /^\/api\/template-vault$/],
  ["GET", /^\/api\/template-factory\/catalog$/],
  ["POST", /^\/api\/template-factory\/harvest$/],
  ["POST", /^\/api\/template-vault\/[A-Za-z0-9_-]{2,80}\/status$/],
  ["POST", /^\/api\/template-vault\/[A-Za-z0-9_-]{2,80}\/proposal-request$/],
  ["GET", /^\/api\/agent\/proposals$/],
  ["GET", /^\/api\/agent\/proposals\/[A-Za-z0-9_-]{4,100}$/],
  ["GET", /^\/api\/agent\/proposals\/[A-Za-z0-9_-]{4,100}\/preview$/],
  ["POST", /^\/api\/agent\/proposals\/[A-Za-z0-9_-]{4,100}\/(approve|reject|rollback)$/],
  ["POST", /^\/api\/agent\/propose$/],
  ["GET", /^\/api\/roadmap$/],
  ["GET", /^\/api\/knowledge-engine\/dashboard$/],
  ["GET", /^\/api\/autonomous\/status$/],
  ["POST", /^\/api\/autonomous\/run-now$/],
  ["GET", /^\/api\/agent\/status$/]
];

function cleanMethod(value){
  const method=String(value||"GET").toUpperCase();
  return ["GET","POST"].includes(method)?method:"";
}
function cleanApiPath(value){
  const path=String(value||"");
  if(!path.startsWith("/api/")||path.includes("..")||/[\r\n?#]/.test(path)||path.length>220)return "";
  return path;
}
function isAllowedBridgeRequest(method,apiPath){
  const m=cleanMethod(method),p=cleanApiPath(apiPath);
  return Boolean(m&&p&&ALLOWED.some(([am,re])=>am===m&&re.test(p)));
}
function bridgeTransport(){
  const raw=String(process.env.CFS_AI_TRANSPORT||"direct").trim().toLowerCase();
  return raw==="bridge"?"bridge":"direct";
}
function bridgeWorkerConfig(){
  const leaseSeconds=Math.max(30,Math.min(600,Number(process.env.CFS_AI_BRIDGE_LEASE_SECONDS||180)||180));
  const pollWaitMs=Math.max(5000,Math.min(115000,Number(process.env.CFS_AI_TIMEOUT_MS||110000)||110000));
  return {transport:bridgeTransport(),leaseSeconds,pollWaitMs};
}
module.exports={ALLOWED,isAllowedBridgeRequest,bridgeTransport,bridgeWorkerConfig,cleanApiPath,cleanMethod};
