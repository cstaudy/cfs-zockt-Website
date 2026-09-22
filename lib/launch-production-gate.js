"use strict";

const crypto=require("node:crypto");

const DAY_MS=24*60*60*1000;
const LAUNCH_GATE_STATUS="LIVE_LAUNCH_PASS";
const LAUNCH_GATE_SOURCE="launch-gate-r67";
const LAUNCH_EVIDENCE_POLICY=Object.freeze([
  {id:"render",kind:"render_live",label:"Render Produktion LIVE",max_age_ms:1*DAY_MS,required:true},
  {id:"recovery",kind:"recovery_restore",label:"Backup / Restore LIVE",max_age_ms:30*DAY_MS,required:true},
  {id:"mail",kind:"mail_delivery",label:"Mail / Recovery LIVE",max_age_ms:30*DAY_MS,required:true},
  {id:"auth",kind:"auth_live",label:"Passkey + MFA LIVE",max_age_ms:30*DAY_MS,required:true},
  {id:"windows",kind:"windows_live",label:"Windows Launcher LIVE",max_age_ms:30*DAY_MS,required:true},
  {id:"soak",kind:"live_soak",label:"OBS / LIVE Soak",max_age_ms:14*DAY_MS,required:true},
  {id:"monitor",kind:"monitor_live",label:"Monitoring / Alerting LIVE",max_age_ms:30*DAY_MS,required:true},
  {id:"billing",kind:"billing_live",label:"Stripe LIVE Billing",max_age_ms:90*DAY_MS,required:"billing"}
]);
const LAUNCH_AUTOMATED_EVIDENCE_KINDS=Object.freeze([...LAUNCH_EVIDENCE_POLICY.map(item=>item.kind),"launch_master"]);
const LAUNCH_AUTOMATED_EVIDENCE_KIND_SET=new Set(LAUNCH_AUTOMATED_EVIDENCE_KINDS);

function text(value,max=500){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function bool(value){return value===true||String(value??"").trim().toLowerCase()==="true"}
function dateMs(value){const n=new Date(value||0).getTime();return Number.isFinite(n)?n:0}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function canonicalJson(value){return JSON.stringify(canonical(value));}
function hmacFor(record,secret){const base={...record};delete base.hmac_sha256;return crypto.createHmac("sha256",String(secret||"")).update(canonicalJson(base)).digest("hex")}
function safeEqualHex(a,b){try{const aa=Buffer.from(String(a||""),"hex"),bb=Buffer.from(String(b||""),"hex");return aa.length===32&&bb.length===32&&crypto.timingSafeEqual(aa,bb)}catch{return false}}
function signLaunchGateEvidence(record,secret){if(String(secret||"").length<32)throw new Error("Launch-Gate-Signing-Secret fehlt oder ist zu kurz.");const out={...record};out.hmac_sha256=hmacFor(out,secret);return out}
function verifyLaunchGateEvidence(record,secret){return Boolean(record&&String(secret||"").length>=32&&safeEqualHex(record.hmac_sha256,hmacFor(record,secret)))}
function policyForKind(kind){return LAUNCH_EVIDENCE_POLICY.find(item=>item.kind===kind)||null}
function isVerifiedR67Row(row={}){
  if(String(row.status||"").toLowerCase()!=="verified")return false;
  if(String(row.source||"")!==LAUNCH_GATE_SOURCE)return false;
  return row.details&&typeof row.details==="object"&&row.details.r67_verified===true;
}
function latestVerifiedByKind(rows=[],kind,{releaseVersion="",now=Date.now()}={}){
  const expected=text(releaseVersion,80);
  return [...(Array.isArray(rows)?rows:[])].filter(row=>{
    if(String(row.kind||"")!==kind||!isVerifiedR67Row(row))return false;
    const actual=text(row.release_version,80);if(expected&&actual!==expected)return false;
    const expires=dateMs(row.expires_at);if(expires&&expires<=now)return false;
    const observed=dateMs(row.observed_at||row.created_at);if(!observed||observed>now+5*60*1000)return false;
    return true;
  }).sort((a,b)=>dateMs(b.observed_at||b.created_at)-dateMs(a.observed_at||a.created_at))[0]||null;
}
function evaluateLaunchGate(rows=[],options={}){
  const now=options.now instanceof Date?options.now.getTime():Number(options.now||Date.now());
  const releaseVersion=text(options.releaseVersion,80);
  const billingRequired=bool(options.billingRequired);
  const monitorHealthy=options.monitorHealthy!==false;
  const incidentNormal=options.incidentNormal!==false;
  const checks=[];
  for(const policy of LAUNCH_EVIDENCE_POLICY){
    const required=policy.required==="billing"?billingRequired:Boolean(policy.required);
    const row=latestVerifiedByKind(rows,policy.kind,{releaseVersion,now});
    const observed=row?dateMs(row.observed_at||row.created_at):0;
    const ageMs=observed?Math.max(0,now-observed):null;
    const fresh=Boolean(row&&ageMs<=policy.max_age_ms);
    const ok=required?fresh:true;
    checks.push({id:policy.id,kind:policy.kind,label:policy.label,required,ok:required?fresh:Boolean(row&&fresh),status:!required&&!row?"SKIP":fresh?"PASS":"BLOCKED",observed_at:row?.observed_at||null,expires_at:row?.expires_at||null,artifact_sha256:text(row?.artifact_sha256,80),source:text(row?.source,80),age_hours:ageMs===null?null:Number((ageMs/3600000).toFixed(2)),max_age_hours:Math.round(policy.max_age_ms/3600000)});
  }
  checks.push({id:"monitor_current",kind:"runtime",label:"Production Monitor aktuell gesund",required:true,ok:monitorHealthy,status:monitorHealthy?"PASS":"BLOCKED"});
  checks.push({id:"incident_normal",kind:"runtime",label:"Incident-Modus steht auf NORMAL",required:true,ok:incidentNormal,status:incidentNormal?"PASS":"BLOCKED"});
  const requiredChecks=checks.filter(item=>item.required),passed=requiredChecks.filter(item=>item.ok).length,total=requiredChecks.length;
  const ready=passed===total;
  const activeRows=checks.filter(item=>item.artifact_sha256);
  const expiresAt=activeRows.map(item=>dateMs(item.expires_at)).filter(Boolean).sort((a,b)=>a-b)[0]||0;
  return{schema:1,status:ready?"LIVE_LAUNCH_READY":"LIVE_LAUNCH_BLOCKED",ready,release_version:releaseVersion,billing_required:billingRequired,passed,total,score:total?Math.round((passed/total)*100):0,checks,blocking:checks.filter(item=>item.required&&!item.ok).map(item=>item.id),expires_at:expiresAt?new Date(expiresAt).toISOString():null};
}

module.exports={DAY_MS,LAUNCH_GATE_STATUS,LAUNCH_GATE_SOURCE,LAUNCH_EVIDENCE_POLICY,LAUNCH_AUTOMATED_EVIDENCE_KINDS,LAUNCH_AUTOMATED_EVIDENCE_KIND_SET,policyForKind,canonicalJson,signLaunchGateEvidence,verifyLaunchGateEvidence,evaluateLaunchGate};
