import path from "node:path";
import {spawnSync} from "node:child_process";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const run=(label,file,args=[])=>{
  const result=spawnSync(process.execPath,[path.join(root,file),...args],{cwd:root,encoding:"utf8",timeout:30000});
  if(result.status!==0)throw new Error(`${label}: ${result.stderr||result.stdout||"failed"}`);
};
const syntax=spawnSync(process.execPath,["--check",path.join(root,"server.js")],{cwd:root,encoding:"utf8"});
if(syntax.status!==0)throw new Error(syntax.stderr||syntax.stdout||"server syntax failed");
run("widget studio v10","tools/widget-studio-v10-qa.mjs",[root]);
run("launcher stability","launcher/tools/stability-pass-test.mjs");
console.log(JSON.stringify({ok:true,server_syntax:true,widget_studio_v10:true,launcher_stability:true}));
