#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

function sha(bytes){return crypto.createHash("sha256").update(bytes).digest("hex")}
function usage(){console.error("Nutzung: node install-update.cjs --check|--apply <Projektverzeichnis>");process.exit(2)}
const [mode,rootArg]=process.argv.slice(2);
if(!["--check","--apply"].includes(mode)||!rootArg)usage();
const root=path.resolve(rootArg),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"manifest.json"),"utf8"));
if(!fs.existsSync(path.join(root,"package.json"))){console.error("CONFLICT Projektverzeichnis enthält keine package.json");process.exit(1)}
const plan=[];let errors=0;
for(const item of manifest.files){
  const rel=item.path;
  if(!rel||rel.startsWith("/")||rel.includes("\\")||rel.split("/").some(x=>x===".."||x==="")){console.error("UNSAFE path",rel);process.exit(1)}
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){console.error("UNSAFE target",rel);process.exit(1)}
  const payload=path.resolve(__dirname,"payload",rel);
  let targetBytes;
  try{targetBytes=fs.readFileSync(payload)}catch{console.error("MISSING payload",rel);process.exit(1)}
  if(sha(targetBytes)!==item.after_sha256){console.error("BAD payload sha256",rel);process.exit(1)}
  let cursor=root, unsafe=false;
  for(const part of rel.split("/")){
    cursor=path.join(cursor,part);
    if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink()){unsafe=true;break}
  }
  if(unsafe){console.error("CONFLICT symlink",rel);errors++;continue}
  const exists=fs.existsSync(file);
  if(exists&&!fs.lstatSync(file).isFile()){console.error("CONFLICT not a regular file",rel);errors++;continue}
  const current=exists?sha(fs.readFileSync(file)):null;
  const status=current===item.after_sha256?"SKIP":current===item.before_sha256?"PENDING":"CONFLICT";
  if(status==="CONFLICT")errors++;
  console.log(status,rel);
  plan.push({file,rel,payload,status});
}
if(errors){console.error(`${errors} Konflikt(e): keine Datei geschrieben.`);process.exit(1)}
const pending=plan.filter(x=>x.status==="PENDING");
if(mode==="--check"){console.log(`CHECK OK · ${pending.length} ausstehend · ${plan.length-pending.length} unverändert`);process.exit(0)}
if(!pending.length){console.log("APPLY OK · 0 Änderungen (bereits installiert)");process.exit(0)}
const backup=path.join(root,'.cfs-backups','3.20.62',`${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomBytes(4).toString('hex')}`);
for(const item of pending){
  if(fs.existsSync(item.file)){
    const dst=path.join(backup,item.rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(item.file,dst);
  }
}
// Das gesamte Preflight-Set wurde geprüft und alle Bestandsdateien sind gesichert.
for(const item of pending){
  fs.mkdirSync(path.dirname(item.file),{recursive:true});
  const tmp=`${item.file}.cfs-32062-${crypto.randomBytes(6).toString('hex')}.tmp`;
  try{fs.copyFileSync(item.payload,tmp);fs.renameSync(tmp,item.file)}
  finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
}
console.log(`APPLY OK · ${pending.length} Dateien aktualisiert · Backups: ${backup}`);
