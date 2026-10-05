import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const launcher=json('launcher/package.json');
const backend=json('package.json');
const env=read('.env.example');
const render=read('render.blueprint.example.yaml');
const recovery=json('ops/application-recovery-policy.json');
const state=read('PROJECT_CURRENT_STATE.md');
const index=read('public/index.html');
const roadmap=read('public/pages/roadmap.html');
const suite=read('public/pages/creator-suite.html');
const system=read('public/pages/system-check.html');
const systemJs=read('public/assets/js/page-system-check.js');
const dashboardJs=read('public/assets/js/page-dashboard.js');
const currentLauncher=String(launcher.version||'');
const currentBackend=String(backend.version||'');
const currentSchema=Number((read('lib/database-schema-contract.js').match(/DATABASE_SCHEMA_VERSION\s*=\s*(\d+)/)||[])[1]||0);
const checks=[
  ['launcher package has semver',/^\d+\.\d+\.\d+$/.test(currentLauncher)],
  ['project current header matches launcher',state.includes(`**Launcher: ${currentLauncher}**`)],
  ['env build target matches launcher',env.includes(`CFS_LAUNCHER_BUILD_TARGET_VERSION=${currentLauncher}`)],
  ['env evidence version matches launcher',env.includes(`CFS_RELEASE_EVIDENCE_VERSION=${currentLauncher}`)],
  ['render build target matches launcher',render.includes('CFS_LAUNCHER_BUILD_TARGET_VERSION')&&render.includes(`value: ${currentLauncher}`)],
  ['recovery policy matches launcher',recovery.launcher_version===currentLauncher],
  ['homepage keeps launcher out of public brand surface',!index.includes(`Launcher ${currentLauncher}`)&&!index.includes('href="/pages/launcher-download.html"')],
  ['roadmap current launcher copy',roadmap.includes(`Launcher ${currentLauncher}`)],
  ['creator suite current launcher copy',suite.includes(`Launcher ${currentLauncher}`)&&suite.includes(`LAUNCHER ${currentLauncher}`)],
  ['system check v3 title',system.includes('System Check v3')&&system.includes('SYSTEM CHECK V3')],
  ['system check readiness cards',system.includes('backendReadiness')&&system.includes('launcherReadiness')&&system.includes('creatorReadiness')&&system.includes('externalReadiness')],
  ['system check expected contract',systemJs.includes(`backend:"${currentBackend}"`)&&systemJs.includes(`schema:${currentSchema}`)&&systemJs.includes(`launcher:"${currentLauncher}"`)],
  ['system check backend health',systemJs.includes('/api/health')&&systemJs.includes('VERSION DRIFT')],
  ['system check launcher policy',systemJs.includes('/api/creator/launcher/releases?channel=stable')&&systemJs.includes('TARGET DRIFT')],
  ['system check games runtime',systemJs.includes('/api/creator/games/runtime')],
  ['system check stream runtime',systemJs.includes('/api/creator/stream-studio/runtime')],
  ['system check cut runtime',systemJs.includes('/api/creator/cut-studio/projects')],
  ['dashboard release policy awareness',dashboardJs.includes('/api/creator/launcher/releases?channel=stable')],
  ['dashboard required update warning',dashboardJs.includes('Launcher Update erforderlich')&&dashboardJs.includes('policy.update_required')],
  ['dashboard compatible state',dashboardJs.includes('Creator-PC kompatibel')&&dashboardJs.includes('policy.compatible')]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)pass++;}
console.log(`\nRelease Readiness Finish v88: ${pass}/${checks.length} ${pass===checks.length?'PASS':'FAIL'}`);
if(pass!==checks.length)process.exit(1);
