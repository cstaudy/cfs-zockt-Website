"use strict";

const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

function sha256(file){
  const h=crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}
function fileInfo(file){
  const st=fs.statSync(file);
  return{name:path.basename(file),bytes:st.size,sha256:sha256(file)};
}
function findFiles(dist){
  if(!fs.existsSync(dist))return[];
  return fs.readdirSync(dist).filter(name=>fs.statSync(path.join(dist,name)).isFile()).sort();
}
function buildWindowsEvidence(dist,options={}){
  const names=findFiles(dist);
  const executables=names.filter(name=>name.toLowerCase().endsWith(".exe"));
  const setup=executables.find(name=>/setup/i.test(name))||"";
  const portable=executables.find(name=>/portable/i.test(name))||"";
  const manifest=names.includes("release-manifest.json")?"release-manifest.json":"";
  const sums=names.includes("SHA256SUMS.txt")?"SHA256SUMS.txt":"";
  const assets=[...new Set([setup,portable,manifest,sums].filter(Boolean))].map(name=>fileInfo(path.join(dist,name)));
  const required={
    setup:Boolean(setup),
    portable:Boolean(portable),
    release_manifest:Boolean(manifest),
    sha256sums:Boolean(sums)
  };
  const signatureStatus=String(options.signatureStatus||"unknown").trim().toLowerCase();
  return{
    schema:1,
    generated_at:new Date(options.now||Date.now()).toISOString(),
    platform:"windows",
    arch:String(options.arch||"x64"),
    launcher_version:String(options.version||""),
    git_ref:String(options.gitRef||""),
    git_sha:String(options.gitSha||""),
    github_run_id:String(options.runId||""),
    github_run_attempt:String(options.runAttempt||""),
    signature_status:signatureStatus,
    code_signing_verified:signatureStatus==="valid",
    required,
    complete:Object.values(required).every(Boolean),
    assets
  };
}
function verifyWindowsEvidence(evidence={}){
  const errors=[];
  if(evidence.schema!==1)errors.push("schema");
  if(evidence.platform!=="windows")errors.push("platform");
  if(!/^\d+\.\d+\.\d+/.test(String(evidence.launcher_version||"")))errors.push("launcher_version");
  if(!evidence.complete)errors.push("complete");
  const assets=Array.isArray(evidence.assets)?evidence.assets:[];
  if(!assets.length)errors.push("assets");
  for(const asset of assets){
    if(!/^[a-f0-9]{64}$/i.test(String(asset.sha256||"")))errors.push(`sha256:${asset.name||"asset"}`);
    if(!(Number(asset.bytes)>0))errors.push(`bytes:${asset.name||"asset"}`);
  }
  return{ok:errors.length===0,errors};
}

module.exports={sha256,buildWindowsEvidence,verifyWindowsEvidence};
