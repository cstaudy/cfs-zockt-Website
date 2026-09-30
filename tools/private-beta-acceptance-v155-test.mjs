import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const launcherPkg=json('launcher/package.json');
const env=read('.env.example');
const project=read('tools/project-small-regression-check.mjs');
const runner=read('RUN-PRIVATE-BETA-ACCEPTANCE.cmd');
const doc=read('PRIVATE-BETA-ACCEPTANCE-v155.md');
const credentialTest=read('launcher/tools/stream-credential-store-test.mjs');
let pass=0,total=0;
const ok=(name,value)=>{total++;console.log(`${value?'PASS':'FAIL'} ${name}`);if(value)pass++;};
const versionAtLeast=(actual,minimum)=>{
  const a=String(actual||'').split('.').map(Number),m=String(minimum||'').split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}return true;
};

ok('backend >= 3.20.1',versionAtLeast(pkg.version,'3.20.1'));
ok('launcher >= 0.47.27',versionAtLeast(launcherPkg.version,'0.47.27'));
ok('private beta commercial mode defaults off',/^CFS_COMMERCIAL_MODE=false$/m.test(env));
ok('private beta runner exists',fs.existsSync(path.join(root,'RUN-PRIVATE-BETA-ACCEPTANCE.cmd')));
ok('private beta acceptance document exists',fs.existsSync(path.join(root,'PRIVATE-BETA-ACCEPTANCE-v155.md')));
ok('runner requires Node 22+',runner.includes('Node.js 22+'));
ok('runner invokes only private beta gate',runner.includes('npm run private-beta155:check'));
ok('runner does not execute Stripe LIVE',!/(npm\s+run\s+security66:check|stripe-live-production-drill-r66|RUN-R66-PRODUCTION-DRILL)/i.test(runner));
ok('documentation explicitly excludes Stripe LIVE',doc.includes('keine')&&doc.includes('Stripe-LIVE-Tests'));
ok('documentation keeps TikTok official-access only',doc.includes('offiziell Encoder-/Stream-Key-Zugang'));
ok('documentation keeps YouTube setup-gated',doc.includes('wenn Google-/YouTube-OAuth beim Betreiber vollständig eingerichtet ist'));
ok('documentation requires destination failure isolation',doc.includes('andere Ziele dürfen nicht beendet werden'));
ok('documentation requires manual stop no reconnect',doc.includes('keinen automatischen Reconnect'));
ok('documentation prohibits secret sharing',doc.includes('Keine Secrets teilen'));
ok('stream credential executable test exists',fs.existsSync(path.join(root,'launcher/tools/stream-credential-store-test.mjs')));
ok('credential test verifies plaintext key absence',credentialTest.includes('does not contain plaintext stream key'));
ok('credential test verifies plaintext server URL absence',credentialTest.includes('does not contain full plaintext server URL'));
ok('credential test verifies encryption fail closed',credentialTest.includes('store fails closed without OS encryption'));
ok('credential test verifies snapshot secret omission',credentialTest.includes('snapshot omits secrets'));
ok('credential test verifies bounded target count',credentialTest.includes('target count is bounded'));
for(let n=59;n<=68;n++)ok(`project regression includes security${n}`,project.includes(`["security${n}",["npm","run","security${n}:check"]]`));
ok('root credential-store test script registered',pkg.scripts?.['stream-credential-store155:check']==='node launcher/tools/stream-credential-store-test.mjs');
ok('private beta gate script registered',pkg.scripts?.['private-beta155:check']==='node tools/private-beta-acceptance-v155-test.mjs . && npm run project:check && npm run stream-provider-target153:check && npm run beta-handbook154:check && npm run feature-freeze154:check && node tools/release-readiness-finish-v88-test.mjs . && npm run stream-credential-store155:check');
ok('v155 release chains v154 and private-beta gate',pkg.scripts?.['release:v155']==='npm run release:v154 && npm run private-beta155:check');
ok('launcher credential-store test script registered',launcherPkg.scripts?.['test:stream-credential-store']==='node tools/stream-credential-store-test.mjs');

console.log(`\nPrivate Beta Acceptance v155: ${pass}/${total} ${pass===total?'PASS':'FAIL'}`);
if(pass!==total)process.exit(1);
