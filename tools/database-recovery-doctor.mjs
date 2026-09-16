import fs from 'node:fs';
import path from 'node:path';
import {commandVersion} from './database-backup-lib.mjs';
const root=path.resolve(process.argv[2]||'.');
const checks=[]; const add=(label,ok,detail='')=>checks.push({label,ok:Boolean(ok),detail});
const policyPath=path.join(root,'ops','database-recovery-policy.json');
let policy=null; try{policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));}catch{}
add('Recovery-Policy vorhanden',Boolean(policy),'ops/database-recovery-policy.json');
add('Policy verlangt Restore in separates Ziel',policy?.restore?.require_separate_target===true);
add('Policy verlangt Restore-Drill',Number(policy?.restore?.max_drill_age_days)>0,`${policy?.restore?.max_drill_age_days||'n/a'} Tage`);
add('pg_dump verfügbar',Boolean(commandVersion('pg_dump')),commandVersion('pg_dump')||'missing');
add('pg_restore verfügbar',Boolean(commandVersion('pg_restore')),commandVersion('pg_restore')||'missing');
add('psql verfügbar',Boolean(commandVersion('psql')),commandVersion('psql')||'missing');
add('Backup-Verschlüsselungsschlüssel vorhanden',String(process.env.CFS_BACKUP_ENCRYPTION_KEY||'').length>=32,process.env.CFS_BACKUP_ENCRYPTION_KEY?'configured':'missing');
const evidence=path.join(root,'reports','database-recovery-evidence.json');
let ev=null; try{ev=JSON.parse(fs.readFileSync(evidence,'utf8'));}catch{}
add('Restore-Drill-Evidence vorhanden',Boolean(ev),ev?.verified_at||'missing');
if(ev&&policy?.restore?.max_drill_age_days){const age=(Date.now()-Date.parse(ev.verified_at))/86400000;add('Restore-Drill noch aktuell',Number.isFinite(age)&&age<=policy.restore.max_drill_age_days,`${age.toFixed(1)} Tage`);}
let fail=0; for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'}  ${c.label}${c.detail?` · ${c.detail}`:''}`);if(!c.ok)fail++;}
console.log(`\nDatabase Recovery Doctor: ${fail?'NO-GO':'GO'} (${checks.length-fail}/${checks.length})`); if(fail)process.exitCode=1;
