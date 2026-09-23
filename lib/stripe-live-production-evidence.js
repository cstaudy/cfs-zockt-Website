"use strict";
const crypto=require("node:crypto");
function clean(v){return String(v??"").trim()}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==="object")return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
function canonicalJson(v){return JSON.stringify(canonical(v))}
function safeEqualHex(a,b){try{const aa=Buffer.from(clean(a),"hex"),bb=Buffer.from(clean(b),"hex");return aa.length===32&&bb.length===32&&crypto.timingSafeEqual(aa,bb)}catch{return false}}
function stripeLiveEvidenceHmac(secret,record){const body={...record};delete body.evidence_hmac_sha256;return crypto.createHmac("sha256",clean(secret)).update("cfs-stripe-live-evidence-v1\0").update(canonicalJson(body)).digest("hex")}
function signStripeLiveEvidence(secret,record){if(clean(secret).length<8)throw new Error("Stripe Webhook Secret fehlt oder ist zu kurz.");const out={...record};out.evidence_hmac_sha256=stripeLiveEvidenceHmac(secret,out);return out}
function verifyStripeLiveEvidence(secret,record){return Boolean(record&&clean(secret).length>=8&&safeEqualHex(record.evidence_hmac_sha256,stripeLiveEvidenceHmac(secret,record)))}
module.exports={canonicalJson,signStripeLiveEvidence,verifyStripeLiveEvidence};
