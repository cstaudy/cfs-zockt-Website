import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const reportPath=path.join(root,'reports','current-contract-regression-v58.json');
const checks=[
  ['backend-syntax',['npm','run','check']],
  ['trust',['npm','run','trust:check']],
  ['security-current',['npm','run','security3:check']],
  ['admin-privileged',['npm','run','admin16:check']],
  ['admin-audit',['npm','run','admin17:check']],
  ['widget-core',['npm','run','coreflows:check']],
  ['widget-ux',['npm','run','ux30:check']],
  ['launcher-static',['npm','run','check','--prefix','launcher']],
  ['launcher-stability',['npm','run','test:stability','--prefix','launcher']],
  ['stream-current',['npm','run','stream-studio21:check']],
  ['cut-foundation',['npm','run','cut52:check']],
  ['cut-windows-contract',['npm','run','cut53:check']],
  ['cut-release-binding',['npm','run','cut54:check']],
  ['cut-evidence-bundle',['npm','run','cut55:check']],
  ['cut-provider-contract',['npm','run','cut57:check']],
  ['r59-contract',['npm','run','security59:check']],
  ['r60-contract',['npm','run','security60:check']],
  ['r61-contract',['npm','run','security61:check']],
  ['r62-contract',['npm','run','security62:check']],
  ['r63-contract',['npm','run','security63:check']],
  ['r64-contract',['npm','run','security64:check']],
  ['r65-contract',['npm','run','security65:check']],
  ['r66-contract',['npm','run','security66:check']],
  ['r67-contract',['npm','run','security67:check']],
  ['r68-contract',['npm','run','security68:check']],
  ['website-current-acceptance',['npm','run','website21:check']],
  ['nexus-current',['npm','run','nexus65:check']],
  ['interactive-games-current',['npm','run','games72:check']],
  ['interactive-games-module-platform',['npm','run','games76:check']],
  ['interactive-games-profile-platform',['npm','run','games80:check']],
  ['website-creator-finish',['npm','run','website84:check']],
  ['release-readiness-finish',['npm','run','release88:check']],
  ['interactive-games-live-patterns',['npm','run','games89:check']],
  ['interactive-games-expansion',['npm','run','games95:check']],
  ['interactive-games-tikfinity-unification',['npm','run','games99:check']],
  ['tikfinity-operations-v103',['npm','run','tikfinity103:check']],
  ['live-readiness-v107',['npm','run','live107:check']],
  ['live-soak-release-binding-v108',['npm','run','live108:check']],
  ['final-evidence-bundle-v109',['npm','run','acceptance109:check']],
  ['windows-live-operator-kit-v110',['npm','run','acceptance110:check']],
  ['final-readiness-v111',['npm','run','acceptance111:check']],
  ['gaming-home-v112',['npm','run','gaming112:check']],
  ['logo-palette-v115',['npm','run','brand115:check']],
  ['game-activity-v116',['npm','run','gameactivity116:check']],
  ['game-activity-v117',['npm','run','gameactivity117:check']],
  ['game-activity-v118',['npm','run','gameactivity118:check']],
  ['game-activity-v119',['npm','run','gameactivity119:check']],
  ['game-activity-v120',['npm','run','game120:check']],
  ['game-activity-v121',['npm','run','game121:check']],
  ['game-context-v122',['npm','run','game122:check']],
  ['recording-game-context-v123',['npm','run','gamecontext123:check']],
  ['game-context-operations-v124',['npm','run','gamecontext124:check']]
];
const rows=[];
for(const [name,args] of checks){
  const r=spawnSync(args[0],args.slice(1),{cwd:root,encoding:'utf8',stdio:'pipe',maxBuffer:20*1024*1024});
  const ok=r.status===0;
  rows.push({name,ok,exit_code:r.status,stdout_tail:String(r.stdout||'').slice(-5000),stderr_tail:String(r.stderr||'').slice(-3000)});
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok && r.stderr) console.error(String(r.stderr).slice(-1200));
}
const passed=rows.filter(r=>r.ok).length;
const payload={schema:1,type:'cfs_current_contract_regression_v58',generated_at:new Date().toISOString(),historical_scope_note:'This is a current-contract replacement suite. It does not recreate or claim execution of the 24 missing historical test files.',total:rows.length,passed,failed:rows.length-passed,status:passed===rows.length?'CURRENT_CONTRACT_REGRESSION_PASS':'CURRENT_CONTRACT_REGRESSION_FAIL',rows};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(payload,null,2)+'\n');
console.log(`\nCurrent Contract Regression v58: ${passed}/${rows.length} ${passed===rows.length?'PASS':'FAIL'}`);
if(passed!==rows.length)process.exit(1);
