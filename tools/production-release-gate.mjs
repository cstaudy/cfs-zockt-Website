import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const npm=process.platform==='win32'?'npm.cmd':'npm';
const target=process.env.APP_BASE_URL||process.env.CFS_PRODUCTION_URL||'https://cfs-zockt.de';
const externalOnly=process.argv.includes('--external-only');
const checks=[];
function run(id,label,command,args,cwd=root,env={}){
  const result=spawnSync(command,args,{cwd,stdio:'inherit',env:{...process.env,...env}});
  const ok=result.status===0;
  checks.push({id,label,ok,exit_code:result.status});
  return ok;
}
function file(id,label,file){const ok=fs.existsSync(path.join(root,file));checks.push({id,label,ok,detail:file});return ok}

console.log('=== cfs_zockt PRODUCTION GO/NO-GO ===');
if(!externalOnly)run('internal_preflight','Internal release preflight',npm,['run','release:preflight']);
else checks.push({id:'internal_preflight',label:'Internal release preflight',ok:true,detail:'skipped by --external-only; run npm run release:preflight separately'});
run('supply_baseline','Supply-chain baseline',npm,['run','supply:check']);
const rootLock=file('root_lock','Backend lockfile','package-lock.json');
const launcherLock=file('launcher_lock','Launcher lockfile','launcher/package-lock.json');
const locks=rootLock&&launcherLock;
if(locks)run('lock_integrity','Lockfile integrity',npm,['run','lockfiles:check']);
else checks.push({id:'lock_integrity',label:'Lockfile integrity',ok:false,detail:'skipped because lockfiles are missing'});
run('edge','Production DNS/TLS/headers',process.execPath,['tools/production-edge-check.mjs',target]);

const failed=checks.filter(c=>!c.ok);
const report={schema:1,generated_at:new Date().toISOString(),target,status:failed.length?'NO-GO':'GO',checks};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports','production-go-no-go.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(root,'reports','production-go-no-go.md'),`# Production GO/NO-GO\n\n**Generated:** ${report.generated_at}\n\n**Target:** ${target}\n\n**Status:** **${report.status}**\n\n${checks.map(c=>`- ${c.ok?'PASS':'FAIL'} — ${c.label}${c.detail?` (${c.detail})`:''}`).join('\n')}\n`);
console.log(`\nPRODUCTION STATUS: ${report.status}`);
console.log(`Report: reports/production-go-no-go.json`);
if(failed.length)process.exit(1);
