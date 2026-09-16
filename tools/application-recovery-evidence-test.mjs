import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-app-recovery-'));
const script=path.resolve('tools/application-recovery-evidence.mjs');
let pass=0,fail=0; const check=(label,ok)=>{console.log(`${ok?'PASS':'FAIL'}  ${label}`);ok?pass++:fail++};
const write=(name,obj)=>{const p=path.join(dir,name);fs.writeFileSync(p,JSON.stringify(obj));return p};
const run=(canary,edge,sha='abcdef1234567890')=>spawnSync(process.execPath,[script,'--root',dir,'--target-commit',sha,'--expected-version','3.12.0','--target-origin','https://cfs-zockt.de','--canary',canary,'--edge',edge,'--out',path.join(dir,'evidence.json')],{encoding:'utf8'});
try{
  const okCanary=write('canary-ok.json',{ok:true,observed_version:'3.12.0'});
  const okEdge=write('edge-ok.json',{ok:true,passed:9,total:9});
  let r=run(okCanary,okEdge);
  check('successful canary + edge creates evidence',r.status===0&&fs.existsSync(path.join(dir,'evidence.json')));
  const ev=JSON.parse(fs.readFileSync(path.join(dir,'evidence.json'),'utf8'));
  check('evidence records exact target commit',ev.target_commit_sha==='abcdef1234567890');
  check('evidence records canary/edge hashes',/^[0-9a-f]{64}$/.test(ev.canary_evidence_sha256)&&/^[0-9a-f]{64}$/.test(ev.edge_evidence_sha256));
  const badCanary=write('canary-bad.json',{ok:false});
  r=run(badCanary,okEdge); check('failed canary blocks evidence',r.status!==0);
  const badEdge=write('edge-bad.json',{ok:false});
  r=run(okCanary,badEdge); check('failed edge blocks evidence',r.status!==0);
  r=run(okCanary,okEdge,'not-a-sha'); check('invalid target SHA is rejected',r.status!==0);
}finally{fs.rmSync(dir,{recursive:true,force:true})}
console.log(`\nApplication Recovery Evidence Test: ${pass}/${pass+fail}`); if(fail)process.exit(1);
