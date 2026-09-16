import path from "node:path";
import {spawnSync} from "node:child_process";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const runs=[
  ["live recovery","tools/live-recovery-v22-qa.mjs",[root]],
  ["launcher session store","launcher/tools/live-session-store-test.mjs",[]],
  ["launcher resume protocol","launcher/tools/live-resume-bridge-test.mjs",[]]
];
for(const [label,file,args] of runs){
  const r=spawnSync(process.execPath,[path.join(root,file),...args],{cwd:root,encoding:"utf8",timeout:30000});
  if(r.status!==0)throw new Error(`${label}: ${r.stderr||r.stdout||"failed"}`);
}
console.log(JSON.stringify({ok:true,live_recovery:true,session_store:true,resume_protocol:true}));
