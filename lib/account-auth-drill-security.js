"use strict";
const crypto=require("node:crypto");
function clean(v){return String(v??"").trim()}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==="object")return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
function canonicalJson(v){return JSON.stringify(canonical(v))}
function safeEqualHex(a,b){try{const aa=Buffer.from(clean(a),"hex"),bb=Buffer.from(clean(b),"hex");return aa.length===32&&bb.length===32&&crypto.timingSafeEqual(aa,bb)}catch{return false}}
function authDrillHmac(record,secret){const body={...record};delete body.evidence_hmac_sha256;return crypto.createHmac("sha256",clean(secret)).update("cfs-auth-drill-evidence-v1\0").update(canonicalJson(body)).digest("hex")}
function signAuthDrillRecord(record,secret){if(clean(secret).length<32)throw new Error("Auth-Drill-HMAC-Secret fehlt oder ist zu kurz.");const out={...record};out.evidence_hmac_sha256=authDrillHmac(out,secret);return out}
function verifyAuthDrillRecord(record,secret){return Boolean(record&&clean(secret).length>=32&&safeEqualHex(record.evidence_hmac_sha256,authDrillHmac(record,secret)))}
module.exports={canonicalJson,signAuthDrillRecord,verifyAuthDrillRecord};
