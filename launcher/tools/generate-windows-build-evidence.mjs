import fs from "node:fs";import path from "node:path";import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {buildWindowsEvidence,verifyWindowsEvidence}=require("../src/windows-build-evidence.js");
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..")),dist=path.join(root,"dist");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const evidence=buildWindowsEvidence(dist,{
  version:pkg.version,
  arch:process.env.CFS_WINDOWS_ARCH||"x64",
  signatureStatus:process.env.CFS_WINDOWS_SIGNATURE_STATUS||"unknown",
  gitRef:process.env.GITHUB_REF_NAME||process.env.GITHUB_REF||"",
  gitSha:process.env.GITHUB_SHA||"",
  runId:process.env.GITHUB_RUN_ID||"",
  runAttempt:process.env.GITHUB_RUN_ATTEMPT||""
});
const check=verifyWindowsEvidence(evidence);
if(!check.ok)throw new Error(`Windows build evidence invalid: ${check.errors.join(", ")}`);
const file=path.join(dist,"windows-build-evidence.json");
fs.writeFileSync(file,JSON.stringify(evidence,null,2),"utf8");
console.log(JSON.stringify({ok:true,file,complete:evidence.complete,signature_status:evidence.signature_status,assets:evidence.assets.length}));
