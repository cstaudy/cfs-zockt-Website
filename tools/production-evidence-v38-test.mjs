import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeProductionEvidence,verificationFlagsFromEvidence,evidenceIsActive,validSha256,EVIDENCE_KINDS}=require("../lib/production-evidence.js");

const now=new Date("2026-09-08T12:00:00Z");
const sha="a".repeat(64);
const verified=sanitizeProductionEvidence({kind:"windows_build",status:"verified",source:"github",release_version:"0.38.0",artifact_sha256:sha,observed_at:"2026-09-08T10:00:00Z"},{releaseVersion:"0.38.0"});
if(!validSha256(verified.artifact_sha256)||!evidenceIsActive(verified,{now,releaseVersion:"0.38.0"}))throw new Error("verified evidence invalid");

const expired=sanitizeProductionEvidence({kind:"clean_install",status:"verified",notes:"Windows 11 clean install completed",release_version:"0.38.0",observed_at:"2026-09-01T10:00:00Z",expires_at:"2026-09-07T10:00:00Z"},{releaseVersion:"0.38.0"});
if(evidenceIsActive(expired,{now,releaseVersion:"0.38.0"}))throw new Error("expired evidence active");

const staleRelease={...verified,id:"old",release_version:"0.37.0",observed_at:"2026-09-08T11:00:00Z"};
const newer={...verified,id:"new",observed_at:"2026-09-08T10:30:00Z"};
const state=verificationFlagsFromEvidence([staleRelease,newer,expired],{now,releaseVersion:"0.38.0"});
if(!state.flags.windows_build_verified||state.flags.clean_install_verified)throw new Error(JSON.stringify(state.flags));
if(!EVIDENCE_KINDS.includes("code_signing")||!EVIDENCE_KINDS.includes("rollback"))throw new Error("evidence kinds");

let bad=false;try{sanitizeProductionEvidence({kind:"windows_build",artifact_sha256:"bad"})}catch{bad=true}
if(!bad)throw new Error("bad sha accepted");

console.log(JSON.stringify({ok:true,kinds:EVIDENCE_KINDS.length,release_scoped:true,expiry:true,sha:true}));
