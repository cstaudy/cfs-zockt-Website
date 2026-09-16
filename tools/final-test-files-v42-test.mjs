import fs from "node:fs";import path from "node:path";import {spawnSync} from "node:child_process";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const r=spawnSync(process.execPath,[path.join(root,"tools/generate-final-test-pack-v42.mjs"),root],{cwd:root,encoding:"utf8"});
if(r.status!==0)throw new Error(r.stderr||r.stdout);
for(const f of ["final-test-matrix.json","final-test-matrix.md","final-test-matrix.csv","final-test-summary.json"]){
  if(!fs.existsSync(path.join(root,"reports",f)))throw new Error(`missing ${f}`);
}
const summary=JSON.parse(fs.readFileSync(path.join(root,"reports/final-test-summary.json"),"utf8"));
if(summary.ready||summary.pending!==summary.total||summary.total<90)throw new Error(JSON.stringify(summary));
console.log(JSON.stringify({ok:true,files:4,checks:summary.total,pending:summary.pending}));
