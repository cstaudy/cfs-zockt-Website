import path from "node:path";
import {spawnSync} from "node:child_process";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const runs=[
  ["website security","tools/website-security-pass-test.mjs",[root]],
  ["request integrity","tools/browser-request-integrity-security-test.mjs",[root]]
];
for(const [label,file,args] of runs){
  const r=spawnSync(process.execPath,[path.join(root,file),...args],{cwd:root,encoding:"utf8",timeout:30000});
  if(r.status!==0)throw new Error(`${label}: ${r.stderr||r.stdout||"failed"}`);
}
console.log(JSON.stringify({ok:true,website_security:true,request_integrity:true}));
