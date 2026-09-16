import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const args=process.argv.slice(2); const value=n=>{const i=args.indexOf(n);return i>=0?(args[i+1]||''):''};
const root=path.resolve(value('--root')||'.');
const targetCommit=value('--target-commit');
const expectedVersion=value('--expected-version');
const method=value('--method')||'specific_commit_redeploy';
const targetOrigin=value('--target-origin')||process.env.CFS_PRODUCTION_URL||'https://cfs-zockt.de';
const canaryPath=path.resolve(root,value('--canary')||'reports/application-recovery-canary.json');
const edgePath=path.resolve(root,value('--edge')||'reports/application-recovery-edge.json');
const out=path.resolve(root,value('--out')||'reports/application-recovery-evidence.json');
if(!/^[0-9a-f]{7,40}$/i.test(targetCommit)){console.error('target commit SHA required (7-40 hex chars)');process.exit(1)}
const load=file=>JSON.parse(fs.readFileSync(file,'utf8'));
let canary,edge; try{canary=load(canaryPath);edge=load(edgePath)}catch(e){console.error(`Evidence input missing/invalid: ${e.message}`);process.exit(1)}
if(canary.ok!==true){console.error('Canary evidence is not successful.');process.exit(1)}
if(edge.ok!==true){console.error('Edge evidence is not successful.');process.exit(1)}
const fileHash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const evidence={
  schema:1,verified_at:new Date().toISOString(),target_origin:targetOrigin,target_commit_sha:targetCommit,
  expected_backend_version:expectedVersion||canary.observed_version||'',method,
  canary_ok:true,edge_ok:true,
  canary_evidence_sha256:fileHash(canaryPath),edge_evidence_sha256:fileHash(edgePath),
  notes:'Application rollback evidence only. Database recovery is a separate procedure and is never performed automatically here.'
};
fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(evidence,null,2));
console.log(JSON.stringify({ok:true,out:path.relative(root,out),target_commit_sha:targetCommit,method}));
