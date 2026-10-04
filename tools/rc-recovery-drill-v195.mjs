import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
const root=path.resolve(process.argv[2]||".");
const manifestPath=path.join(root,"reports/rc-freeze-v195.json");
if(!fs.existsSync(manifestPath)) throw new Error("Freeze-Manifest fehlt.");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const selected=["server.js","package.json","public/assets/js/page-system-check.js","ops/application-recovery-policy.json","launcher/package.json"].filter(rel=>manifest.files.some(x=>x.path===rel));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-v195-rollback-")); const target=path.join(tmp,"target"),backup=path.join(tmp,"backup"); fs.mkdirSync(target,{recursive:true}); fs.mkdirSync(backup,{recursive:true});
const sha=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
try{
  for(const rel of selected){ for(const base of [target,backup]){const dst=path.join(base,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(root,rel),dst);} }
  for(const rel of selected.slice(0,2)) fs.appendFileSync(path.join(target,rel),"\n# simulated-bad-update-v195\n");
  const drift=selected.filter(rel=>sha(path.join(target,rel))!==sha(path.join(backup,rel)));
  if(drift.length<2) throw new Error("Simulierter Drift wurde nicht erkannt.");
  for(const rel of selected){const src=path.join(backup,rel),dst=path.join(target,rel);fs.copyFileSync(src,dst);}
  const bad=selected.filter(rel=>sha(path.join(target,rel))!==sha(path.join(root,rel)));
  const result={ok:bad.length===0,kind:"local_artifact_rollback_simulation",files:selected.length,detected_drift:drift.length,restored:selected.length-bad.length,remaining_drift:bad};
  console.log(JSON.stringify(result)); if(!result.ok) process.exitCode=2;
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
