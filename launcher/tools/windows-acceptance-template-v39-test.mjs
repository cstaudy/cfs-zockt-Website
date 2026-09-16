import fs from "node:fs";import os from "node:os";import path from "node:path";import {spawnSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"../.."),dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-v39-accept-"));
for(const protocol of ["windows_install","updater_e2e"]){
  const out=path.join(dir,`${protocol}.json`);
  const r=spawnSync(process.execPath,[path.join(root,"tools/generate-release-acceptance-template.mjs"),"--protocol",protocol,"--release-version","0.39.0","--out",out],{encoding:"utf8"});
  if(r.status!==0)throw new Error(r.stderr||r.stdout);
  const payload=JSON.parse(fs.readFileSync(out,"utf8"));
  if(payload.release_version!=="0.39.0"||payload.protocol!==protocol||!payload.step_results.length||payload.step_results.some(s=>s.status!=="pending"))throw new Error(protocol);
}
console.log(JSON.stringify({ok:true,windows_template:true,updater_template:true,pending_only:true}));
