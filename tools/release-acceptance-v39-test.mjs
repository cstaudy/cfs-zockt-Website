import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {PROTOCOL_KEYS,evaluateAcceptance,sanitizeAcceptance}=require("../lib/release-acceptance.js");

if(PROTOCOL_KEYS.length!==5)throw new Error("protocol count");
const pending=evaluateAcceptance("windows_install",[]);
if(pending.ready||pending.pending.length!==10)throw new Error("pending windows");
const passedSteps=pending.steps.map(s=>({id:s.id,status:"pass",notes:"tested"}));
let noProof=false;try{sanitizeAcceptance({protocol:"windows_install",step_results:passedSteps,notes:"short"},{releaseVersion:"0.39.0"})}catch{noProof=true}
if(!noProof)throw new Error("passed acceptance without proof accepted");
const passed=sanitizeAcceptance({protocol:"windows_install",step_results:passedSteps,reference:"github-run-123",target:"Clean Windows 11"},{releaseVersion:"0.39.0"});
if(passed.status!=="passed"||!passed.evaluation.ready||passed.release_version!=="0.39.0")throw new Error("passed acceptance");
const failSteps=passedSteps.map((s,i)=>i===2?{...s,status:"fail"}:s);
const failed=sanitizeAcceptance({protocol:"windows_install",step_results:failSteps,reference:"ticket-1"},{releaseVersion:"0.39.0"});
if(failed.status!=="failed"||failed.evaluation.failed[0]!=="launcher_start")throw new Error("failed acceptance");
console.log(JSON.stringify({ok:true,protocols:PROTOCOL_KEYS.length,proof_required:true,pass:true,fail:true}));
