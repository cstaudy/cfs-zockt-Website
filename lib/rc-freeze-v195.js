"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const FREEZE_VERSION = "v195";
const ROOT_FILES = [".env.example","package.json","package-lock.json","server.js","render.blueprint.example.yaml","RUN-FIXED-ACCEPTANCE-v195.cmd","RUN-FIXED-ACCEPTANCE-v195.ps1","ABNAHME-ABLAUFPLAN-v195.md","RC-FREEZE-v195.md"];
const ROOT_DIRS = [".github","launcher","lib","ops","public","tools"];
const EXCLUDED_PREFIXES = ["launcher/reports/","launcher/node_modules/","node_modules/","reports/","evidence/"];
const EXCLUDED_NAMES = new Set([".DS_Store","Thumbs.db"]);

function posix(rel){ return String(rel).split(path.sep).join("/"); }
function sha256Buffer(buf){ return crypto.createHash("sha256").update(buf).digest("hex"); }
function sha256File(file){ return sha256Buffer(fs.readFileSync(file)); }
function excluded(rel){
  const p=posix(rel);
  return EXCLUDED_PREFIXES.some(prefix=>p.startsWith(prefix)) || EXCLUDED_NAMES.has(path.basename(p));
}
function walk(root, rel, out){
  const abs=path.join(root,rel);
  if(!fs.existsSync(abs)) return;
  const stat=fs.statSync(abs);
  if(stat.isFile()){ if(!excluded(rel)) out.push(posix(rel)); return; }
  for(const name of fs.readdirSync(abs).sort()) walk(root,path.join(rel,name),out);
}
function freezeFiles(root){
  const out=[];
  for(const rel of ROOT_FILES) walk(root,rel,out);
  for(const rel of ROOT_DIRS) walk(root,rel,out);
  return [...new Set(out)].sort();
}
function parseSystemVersion(root){
  const text=fs.readFileSync(path.join(root,"public/assets/js/page-system-check.js"),"utf8");
  const schema=Number((text.match(/schema\s*:\s*(\d+)/)||[])[1]||0);
  const backend=(text.match(/backend\s*:\s*["']([^"']+)/)||[])[1]||"";
  const launcher=(text.match(/launcher\s*:\s*["']([^"']+)/)||[])[1]||"";
  return {backend,schema,launcher};
}
function buildManifest(root){
  const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
  const launcherPkg=JSON.parse(fs.readFileSync(path.join(root,"launcher/package.json"),"utf8"));
  const sys=parseSystemVersion(root);
  const files=freezeFiles(root).map(rel=>{
    const abs=path.join(root,rel); const stat=fs.statSync(abs);
    return {path:rel,size:stat.size,sha256:sha256File(abs)};
  });
  const tree=files.map(x=>`${x.sha256}  ${x.path}\n`).join("");
  return {
    schema:1,
    freeze_version:FREEZE_VERSION,
    product:"cfs_zockt Creator Suite",
    base_release:"v192",
    backend_version:String(pkg.version),
    schema_version:Number(sys.schema),
    launcher_version:String(launcherPkg.version),
    commerce_enabled:false,
    scope:"runtime_and_acceptance_tooling",
    mutable_acceptance_paths:["reports/","evidence/","launcher/reports/"],
    file_count:files.length,
    tree_sha256:sha256Buffer(Buffer.from(tree,"utf8")),
    files
  };
}
function verifyManifest(root, manifest){
  const current=buildManifest(root);
  const expectedBy=new Map((manifest?.files||[]).map(x=>[x.path,x]));
  const currentBy=new Map(current.files.map(x=>[x.path,x]));
  const missing=[], extra=[], changed=[];
  for(const [rel,exp] of expectedBy){
    const cur=currentBy.get(rel);
    if(!cur) missing.push(rel);
    else if(cur.sha256!==exp.sha256 || cur.size!==exp.size) changed.push(rel);
  }
  for(const rel of currentBy.keys()) if(!expectedBy.has(rel)) extra.push(rel);
  const versions_ok = String(manifest?.backend_version||"")===current.backend_version
    && Number(manifest?.schema_version)===current.schema_version
    && String(manifest?.launcher_version||"")===current.launcher_version;
  const tree_ok = String(manifest?.tree_sha256||"")===current.tree_sha256;
  return {ok:missing.length===0&&extra.length===0&&changed.length===0&&versions_ok&&tree_ok, missing,extra,changed,versions_ok,tree_ok,current};
}
function envExampleSafe(root){
  const rel=".env.example"; const file=path.join(root,rel);
  if(!fs.existsSync(file)) return {ok:false,issues:[`${rel} fehlt`]};
  const issues=[];
  for(const [index,lineRaw] of fs.readFileSync(file,"utf8").split(/\r?\n/).entries()){
    const line=lineRaw.trim(); if(!line||line.startsWith("#")||!line.includes("=")) continue;
    const [key,...rest]=line.split("="); const value=rest.join("=").trim().replace(/^['"]|['"]$/g,"");
    if(!/(SECRET|TOKEN|PASSWORD|PRIVATE|STREAM_KEY|API_KEY|CLIENT_SECRET|DATABASE_URL|REDIS_URL)/i.test(key)) continue;
    if(!value) continue;
    if(/^(?:changeme|replace_me|example|your_|<|\$\{|https?:\/\/[^:@/]+(?::\d+)?\/example)/i.test(value)) continue;
    if(/^(?:true|false|0|1)$/i.test(value)) continue;
    issues.push(`${rel}:${index+1}:${key.trim()} hat einen nichtleeren sensitiven Beispielwert`);
  }
  return {ok:issues.length===0,issues};
}
function secretScan(root){
  const issues=[];
  const forbiddenName=/(^|\/)(?:\.env(?:\..+)?|id_rsa|id_ed25519|.*\.(?:pem|p12|pfx|key))$/i;
  const allowed=new Set([".env.example"]);
  const scanRoots=[".","launcher"];
  for(const base of scanRoots){
    const absBase=path.resolve(root,base);
    if(!fs.existsSync(absBase)) continue;
    const stack=[absBase];
    while(stack.length){
      const dir=stack.pop();
      for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
        const abs=path.join(dir,entry.name); const rel=posix(path.relative(root,abs));
        if(entry.isDirectory()){
          if(["node_modules",".git","reports","evidence"].includes(entry.name)) continue;
          stack.push(abs); continue;
        }
        if(forbiddenName.test(rel) && !allowed.has(rel)) issues.push(`sensitive Datei im Projekt: ${rel}`);
      }
    }
  }
  const env=envExampleSafe(root); issues.push(...env.issues);
  const highRisk=[
    [/\bsk_live_[A-Za-z0-9]{16,}\b/g,"Stripe live secret"],
    [/\bghp_[A-Za-z0-9]{30,}\b/g,"GitHub token"],
    [/\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,"GitHub PAT"],
    [/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,"Slack token"],
    [/\bAKIA[0-9A-Z]{16}\b/g,"AWS access key"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,"Private key"]
  ];
  const candidates=[".env.example","render.blueprint.example.yaml","ops/application-recovery-policy.json"];
  for(const rel of candidates){
    const abs=path.join(root,rel); if(!fs.existsSync(abs)) continue;
    const text=fs.readFileSync(abs,"utf8");
    for(const [rx,label] of highRisk){ rx.lastIndex=0; if(rx.test(text)) issues.push(`${rel}: ${label}`); }
  }
  return {ok:issues.length===0,issues};
}
module.exports={FREEZE_VERSION,freezeFiles,buildManifest,verifyManifest,secretScan,sha256File};
