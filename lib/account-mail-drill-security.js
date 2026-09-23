"use strict";
const crypto=require("node:crypto");
function clean(v){return String(v??"").trim()}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==="object")return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
function canonicalJson(v){return JSON.stringify(canonical(v))}
function safeEqualHex(a,b){try{const aa=Buffer.from(clean(a),"hex"),bb=Buffer.from(clean(b),"hex");return aa.length===32&&bb.length===32&&crypto.timingSafeEqual(aa,bb)}catch{return false}}
function mailDrillCodeHash(secret,drillId,category,code){return crypto.createHmac("sha256",clean(secret)).update(`cfs-mail-drill-code-v1\0${clean(drillId)}\0${clean(category)}\0${clean(code).toUpperCase()}`).digest("hex")}
function drillRecordHmac(record,secret){const body={...record};delete body.evidence_hmac_sha256;return crypto.createHmac("sha256",clean(secret)).update("cfs-mail-drill-evidence-v1\0").update(canonicalJson(body)).digest("hex")}
function signDrillRecord(record,secret){if(clean(secret).length<32)throw new Error("Mail-Drill-HMAC-Secret fehlt oder ist zu kurz.");const out={...record};out.evidence_hmac_sha256=drillRecordHmac(out,secret);return out}
function verifyDrillRecord(record,secret){return Boolean(record&&clean(secret).length>=32&&safeEqualHex(record.evidence_hmac_sha256,drillRecordHmac(record,secret)))}
module.exports={canonicalJson,mailDrillCodeHash,signDrillRecord,verifyDrillRecord};
