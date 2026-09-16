import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.');
const args=process.argv.slice(2); const value=n=>{const i=args.indexOf(n);return i>=0?(args[i+1]||''):''};
const snapPath=path.resolve(root,value('--snapshot')||'reports/release-state-snapshot.json');
let snap; try{snap=JSON.parse(fs.readFileSync(snapPath,'utf8'))}catch(e){console.error(`Snapshot missing/invalid: ${snapPath}`);process.exit(1)}
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const checks=[]; const add=(label,ok,detail='')=>checks.push({label,ok:Boolean(ok),detail});
for(const [file,expected] of Object.entries(snap.critical_files||{})){
  const exists=fs.existsSync(path.join(root,file)); add(`critical file ${file}`,exists&&sha(file)===expected,exists?'hash checked':'missing');
}
try{const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); if(snap.git_sha)add('git SHA matches snapshot',head===snap.git_sha,`${head.slice(0,12)} vs ${String(snap.git_sha).slice(0,12)}`)}catch{}
let failed=0; for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'}  ${c.label}${c.detail?` · ${c.detail}`:''}`);if(!c.ok)failed++}
console.log(`\nRelease snapshot verify: ${checks.length-failed}/${checks.length}`); if(failed)process.exit(1);
