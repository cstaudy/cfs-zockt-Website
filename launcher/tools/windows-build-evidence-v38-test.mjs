import fs from "node:fs";import os from "node:os";import path from "node:path";import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {buildWindowsEvidence,verifyWindowsEvidence}=require("../src/windows-build-evidence.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-win-evidence-v38-"));
for(const [name,body] of [
 ["cfs_zockt-Creator-Suite-Setup-0.38.0-x64.exe","setup"],
 ["cfs_zockt-Creator-Suite-Portable-0.38.0-x64.exe","portable"],
 ["release-manifest.json",'{"schema":1}'],
 ["SHA256SUMS.txt","abc"]
])fs.writeFileSync(path.join(dir,name),body);
const evidence=buildWindowsEvidence(dir,{version:"0.38.0",signatureStatus:"valid",gitSha:"a".repeat(40),runId:"123"});
const check=verifyWindowsEvidence(evidence);
if(!check.ok||!evidence.complete||!evidence.code_signing_verified||evidence.assets.length!==4)throw new Error(JSON.stringify({evidence,check}));
const broken={...evidence,assets:evidence.assets.map((a,i)=>i? a:{...a,sha256:"bad"})};
if(verifyWindowsEvidence(broken).ok)throw new Error("bad sha accepted");
console.log(JSON.stringify({ok:true,complete:true,assets:4,signature:true}));
