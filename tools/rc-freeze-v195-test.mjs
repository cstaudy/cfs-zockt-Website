import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url); const root=path.resolve(process.argv[2]||".");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8"), exists=rel=>fs.existsSync(path.join(root,rel));
const pkg=JSON.parse(read("package.json")), lock=JSON.parse(read("package-lock.json")), launcher=JSON.parse(read("launcher/package.json"));
const lib=require(path.join(root,"lib/rc-freeze-v195.js")); const acceptance=require(path.join(root,"lib/rc-acceptance-v190.js"));
const checks=[]; const check=(name,ok)=>{ok=Boolean(ok);checks.push({name,ok});console.log(`${ok?"PASS":"FAIL"} ${name}`)};
const semverAtLeast=(a,b)=>{a=a.split('.').map(Number);b=b.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return true};
check("backend is 3.20.38+",semverAtLeast(pkg.version,"3.20.38")&&lock.version===pkg.version&&lock.packages?.[""]?.version===pkg.version);
check("launcher stays 0.47.30",launcher.version==="0.47.30");
check("schema stays 78",read("public/assets/js/page-system-check.js").includes("schema:78"));
check("system check follows backend",read("public/assets/js/page-system-check.js").includes(`backend:"${pkg.version}"`));
check("recovery policy follows backend",read("ops/application-recovery-policy.json").includes(`"backend_version": "${pkg.version}"`));
check("commerce remains off",read("PROJECT_CURRENT_STATE.md").includes("CFS_COMMERCIAL_MODE=false"));
for(const rel of ["lib/rc-freeze-v195.js","tools/rc-freeze-v195.mjs","tools/rc-secret-scan-v195.mjs","tools/rc-recovery-drill-v195.mjs","tools/rc-fixed-baseline-v195.mjs","RUN-FIXED-ACCEPTANCE-v195.cmd","RUN-FIXED-ACCEPTANCE-v195.ps1","ABNAHME-ABLAUFPLAN-v195.md"]) check(`${rel} exists`,exists(rel));
check("freeze manifest exists",exists("reports/rc-freeze-v195.json"));
if(exists("reports/rc-freeze-v195.json")){
  const m=JSON.parse(read("reports/rc-freeze-v195.json")); const v=lib.verifyManifest(root,m);
  check("freeze manifest version v195",m.freeze_version==="v195"); check("freeze scope is runtime/tooling",m.scope==="runtime_and_acceptance_tooling");
  check("freeze contains many files",m.file_count>350); check("freeze tree sha is sha256",/^[a-f0-9]{64}$/.test(m.tree_sha256)); check("freeze verifies with zero drift",v.ok);
  check("reports remain mutable",Array.isArray(m.mutable_acceptance_paths)&&m.mutable_acceptance_paths.includes("reports/"));
}
const sec=lib.secretScan(root); check("secret/config scan clean",sec.ok);
const plan=JSON.parse(read("reports/rc-acceptance-v190.json")); const ev=acceptance.evaluate(plan);
check("real acceptance still has 48 cases",ev.total===48); check("real acceptance still 0/48",ev.resolved===0&&ev.counts.pending===48); check("real acceptance remains HOLD",ev.recommendation==="HOLD");
check("fixed baseline report exists",exists("reports/rc-fixed-baseline-v195.json"));
if(exists("reports/rc-fixed-baseline-v195.json")){const r=JSON.parse(read("reports/rc-fixed-baseline-v195.json"));check("fixed baseline is frozen not GO",r.status==="FROZEN_ACCEPTANCE_BASELINE"&&r.real_acceptance_executed===false);check("baseline binds freeze tree",/^[a-f0-9]{64}$/.test(r.freeze_tree_sha256));}
check("package has freeze create script",pkg.scripts?.["freeze195:create"]?.includes("rc-freeze-v195.mjs"));
check("package has freeze verify script",pkg.scripts?.["freeze195:verify"]?.includes("--")||pkg.scripts?.["freeze195:verify"]?.includes("rc-freeze-v195.mjs"));
check("package has recovery drill",pkg.scripts?.["freeze195:recovery"]?.includes("rc-recovery-drill-v195.mjs"));
check("package has secret scan",pkg.scripts?.["freeze195:secret"]?.includes("rc-secret-scan-v195.mjs"));
check("release v195 chains from v192",pkg.scripts?.["release:v195"]?.includes("release:v192")&&pkg.scripts?.["release:v195"]?.includes("freeze195:check"));
check("plan requires exact package hashes",read("ABNAHME-ABLAUFPLAN-v195.md").includes("SHA-256")&&read("ABNAHME-ABLAUFPLAN-v195.md").includes("Acceptance-Lock"));
check("plan forbids feature changes during acceptance",read("ABNAHME-ABLAUFPLAN-v195.md").includes("keine neuen Features"));
check("plan keeps real hardware tests mandatory",read("ABNAHME-ABLAUFPLAN-v195.md").includes("48 Realtests")&&read("ABNAHME-ABLAUFPLAN-v195.md").includes("Windows"));
const passed=checks.filter(x=>x.ok).length;console.log(`\nRC Freeze / Fixed Acceptance v195: ${passed}/${checks.length} PASS`);if(passed!==checks.length)process.exit(1);
