import fs from "node:fs";import path from "node:path";import {spawnSync} from "node:child_process";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const launcher=path.join(root,"launcher");
const run=(name,cmd,args,cwd)=>{
  const r=spawnSync(cmd,args,{cwd,encoding:"utf8",maxBuffer:20*1024*1024});
  return{name,ok:r.status===0,status:r.status,stdout:(r.stdout||"").slice(-12000),stderr:(r.stderr||"").slice(-12000)};
};
const steps=[
  run("root_v42","npm",["run","check:v42"],root),
  run("launcher_release_gate",process.execPath,[path.join(launcher,"tools/release-gate.mjs"),launcher],launcher),
  run("generate_test_pack",process.execPath,[path.join(root,"tools/generate-final-test-pack-v42.mjs"),root],root)
];
let gate=null;
try{gate=JSON.parse(fs.readFileSync(path.join(launcher,"reports/release-gate.json"),"utf8"))}catch{}
let matrix=null;
try{matrix=JSON.parse(fs.readFileSync(path.join(root,"reports/final-test-matrix.json"),"utf8"))}catch{}
const report={
  schema:1,
  generated_at:new Date().toISOString(),
  automated_ok:steps.every(s=>s.ok)&&gate?.ok===true,
  automated_steps:steps.map(({name,ok,status})=>({name,ok,status})),
  launcher_gate:gate?{version:gate.launcher_version,passed:gate.passed,total:gate.total,ok:gate.ok}:null,
  manual_test_pack:matrix?{status:matrix.status,areas:matrix.areas.length,checks:matrix.areas.flatMap(a=>a.checks||[]).length}:null,
  release_status:"manual_real_world_tests_required"
};
fs.mkdirSync(path.join(root,"reports"),{recursive:true});
fs.writeFileSync(path.join(root,"reports/final-verification-v42.json"),JSON.stringify(report,null,2),"utf8");
console.log(JSON.stringify(report));
if(!report.automated_ok)process.exit(1);
