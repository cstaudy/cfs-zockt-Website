import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||'.');
const checks=[]; const add=(label,ok,detail='')=>checks.push({label,ok:Boolean(ok),detail});
let policy=null; try{policy=JSON.parse(fs.readFileSync(path.join(root,'ops/application-recovery-policy.json'),'utf8'))}catch{}
add('Application-Recovery-Policy vorhanden',Boolean(policy),'ops/application-recovery-policy.json');
add('Rollback trennt DB-Wiederherstellung',policy?.rollback?.never_restore_database_as_part_of_app_rollback===true);
add('Canary nach Recovery verpflichtend',policy?.rollback?.require_canary_after_recovery===true);
add('External Edge Gate nach Recovery verpflichtend',policy?.rollback?.require_external_edge_gate_after_recovery===true);
add('Production-Recovery-Workflow vorhanden',fs.existsSync(path.join(root,'.github/workflows/production-recovery.yml')));
try{execFileSync('git',['--version'],{stdio:'ignore'});add('git verfügbar',true)}catch{add('git verfügbar',false)}
add('Root lockfile vorhanden',fs.existsSync(path.join(root,'package-lock.json')));
add('Launcher lockfile vorhanden',fs.existsSync(path.join(root,'launcher/package-lock.json')));
add('Render Deploy Hook konfiguriert',Boolean(process.env.RENDER_DEPLOY_HOOK_URL),'secret presence only');
add('Canonical Production URL konfiguriert',(process.env.CFS_PRODUCTION_URL||process.env.APP_BASE_URL||'')==='https://cfs-zockt.de',process.env.CFS_PRODUCTION_URL||process.env.APP_BASE_URL||'missing');
const evPath=path.join(root,policy?.evidence?.path||'reports/application-recovery-evidence.json'); let ev=null; try{ev=JSON.parse(fs.readFileSync(evPath,'utf8'))}catch{}
add('Application-Recovery-Evidence vorhanden',Boolean(ev),ev?.verified_at||'missing');
if(ev&&policy?.evidence?.max_age_days){const age=(Date.now()-Date.parse(ev.verified_at))/86400000;add('Recovery-Evidence noch aktuell',Number.isFinite(age)&&age<=policy.evidence.max_age_days,`${age.toFixed(1)} Tage`)}
let fail=0; for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'}  ${c.label}${c.detail?` · ${c.detail}`:''}`); if(!c.ok)fail++}
console.log(`\nApplication Recovery Doctor: ${fail?'NO-GO':'GO'} (${checks.length-fail}/${checks.length})`); if(fail)process.exitCode=1;
