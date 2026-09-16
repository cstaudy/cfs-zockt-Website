"use strict";

const EVIDENCE_KINDS=Object.freeze([
  "windows_build",
  "code_signing",
  "clean_install",
  "updater_e2e",
  "obs_field",
  "tiktok_live_field",
  "billing_live",
  "two_creators",
  "canary",
  "rollback"
]);
const EVIDENCE_KIND_SET=new Set(EVIDENCE_KINDS);
const EVIDENCE_STATUSES=new Set(["verified","failed","revoked"]);

function text(value,max=400){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function validSha256(value){return /^[a-f0-9]{64}$/i.test(String(value||"").trim())}
function dateOrNull(value){if(!value)return null;const d=value instanceof Date?value:new Date(value);return Number.isFinite(d.getTime())?d:null}
function normalizeKind(value){const v=text(value,60).toLowerCase();return EVIDENCE_KIND_SET.has(v)?v:""}
function normalizeStatus(value){const v=text(value,30).toLowerCase();return EVIDENCE_STATUSES.has(v)?v:"failed"}

function sanitizeProductionEvidence(input={},options={}){
  const kind=normalizeKind(input.kind);
  if(!kind)throw new Error("Unbekannter Production-Evidence-Typ.");
  const status=normalizeStatus(input.status||"verified");
  const observedAt=dateOrNull(input.observed_at)||new Date();
  const expiresAt=dateOrNull(input.expires_at);
  const releaseVersion=text(input.release_version||options.releaseVersion,80);
  const artifactSha=text(input.artifact_sha256,80).toLowerCase();
  if(artifactSha&&!validSha256(artifactSha))throw new Error("Artifact SHA256 ist ungültig.");
  return{
    kind,status,
    source:text(input.source,80,"manual"),
    release_version:releaseVersion,
    environment:text(input.environment,80,"production"),
    target:text(input.target,500),
    reference:text(input.reference,500),
    artifact_sha256:artifactSha,
    notes:text(input.notes,4000),
    observed_at:observedAt,
    expires_at:expiresAt,
    details:input.details&&typeof input.details==="object"&&!Array.isArray(input.details)?input.details:{}
  };
}
function publicProductionEvidence(row={}){
  return{
    id:String(row.id||""),
    kind:normalizeKind(row.kind),
    status:normalizeStatus(row.status),
    source:text(row.source,80),
    release_version:text(row.release_version,80),
    environment:text(row.environment,80),
    target:text(row.target,500),
    reference:text(row.reference,500),
    artifact_sha256:text(row.artifact_sha256,80),
    notes:text(row.notes,4000),
    observed_at:row.observed_at||null,
    expires_at:row.expires_at||null,
    details:row.details&&typeof row.details==="object"?row.details:{},
    created_by:String(row.created_by||""),
    created_at:row.created_at||null,
    updated_at:row.updated_at||null
  };
}
function evidenceIsActive(row={},options={}){
  const now=options.now instanceof Date?options.now:new Date(options.now||Date.now());
  if(normalizeStatus(row.status)!=="verified")return false;
  const expires=dateOrNull(row.expires_at);
  if(expires&&expires.getTime()<=now.getTime())return false;
  const expected=text(options.releaseVersion,80);
  const actual=text(row.release_version,80);
  if(expected&&actual&&expected!==actual)return false;
  return true;
}
function latestEvidenceByKind(rows=[],options={}){
  const expected=text(options.releaseVersion,80);
  const sorted=[...(Array.isArray(rows)?rows:[])].filter(item=>{
    if(!expected)return true;
    const actual=text(item?.release_version,80);
    return !actual||actual===expected;
  }).sort((a,b)=>{
    const ad=dateOrNull(a.observed_at)?.getTime()||dateOrNull(a.created_at)?.getTime()||0;
    const bd=dateOrNull(b.observed_at)?.getTime()||dateOrNull(b.created_at)?.getTime()||0;
    return bd-ad;
  });
  const out={};
  for(const kind of EVIDENCE_KINDS){
    const row=sorted.find(item=>normalizeKind(item.kind)===kind);
    out[kind]=row?{...publicProductionEvidence(row),active:evidenceIsActive(row,options)}:null;
  }
  return out;
}
function verificationFlagsFromEvidence(rows=[],options={}){
  const latest=latestEvidenceByKind(rows,options),flags={};
  for(const kind of EVIDENCE_KINDS)flags[`${kind}_verified`]=Boolean(latest[kind]?.active);
  return{flags,latest};
}

module.exports={
  EVIDENCE_KINDS,EVIDENCE_KIND_SET,EVIDENCE_STATUSES,
  validSha256,normalizeKind,normalizeStatus,sanitizeProductionEvidence,
  publicProductionEvidence,evidenceIsActive,latestEvidenceByKind,verificationFlagsFromEvidence
};
