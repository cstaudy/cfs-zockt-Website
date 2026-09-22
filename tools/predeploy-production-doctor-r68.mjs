import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {DATABASE_SCHEMA_VERSION}=require('../lib/database-schema-contract.js');

const root=path.resolve(process.argv[2]||'.');
const checks=[];
const add=(id,label,ok,detail='')=>checks.push({id,label,ok:Boolean(ok),detail:String(detail||'')});
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const exists=rel=>fs.existsSync(path.join(root,rel));

const pkg=json('package.json');
const lock=json('package-lock.json');
const launcher=json('launcher/package.json');
const server=read('server.js');
const blueprint=read('render.blueprint.example.yaml');
const lockLib=read('lib/database-bootstrap-lock.js');
const schemaContract=read('lib/database-schema-contract.js');
const project=read('tools/project-small-regression-check.mjs');
const startBlock=server.slice(server.indexOf('async function startServer()'));

const backendVersion=server.match(/\bBACKEND_VERSION\s*=\s*["']([^"']+)["']/)?.[1]||'';
const blueprintLauncher=blueprint.match(/key:\s*CFS_LAUNCHER_BUILD_TARGET_VERSION[\s\S]{0,80}?value:\s*([^\s#]+)/)?.[1]||'';
const blueprintEvidence=blueprint.match(/key:\s*CFS_RELEASE_EVIDENCE_VERSION[\s\S]{0,80}?value:\s*([^\s#]+)/)?.[1]||'';

add('node_runtime','Current pre-deploy runtime is Node.js 22+',Number(process.versions.node.split('.')[0])>=22,process.versions.node);
add('package_lock','package-lock.json exists and uses lockfile v3',exists('package-lock.json')&&Number(lock.lockfileVersion)===3,`lockfileVersion=${lock.lockfileVersion}`);
add('version_backend','package.json and backend version match',String(pkg.version)===backendVersion,`${pkg.version} / ${backendVersion||'missing'}`);
add('version_lock','package-lock root version matches package',String(lock.version)===String(pkg.version)&&String(lock.packages?.['']?.version)===String(pkg.version),String(lock.version||'missing'));
const packageDeps=Object.entries(pkg.dependencies||{}).sort(([a],[b])=>a.localeCompare(b));
const lockedDeps=Object.entries(lock.packages?.['']?.dependencies||{}).sort(([a],[b])=>a.localeCompare(b));
add('deps_lock','Locked root dependencies exactly match package.json',JSON.stringify(lockedDeps)===JSON.stringify(packageDeps),`${packageDeps.length} runtime deps`);
add('node_engine','Node engine requires 22+',/^>=?22(?:\.|$)/.test(String(pkg.engines?.node||'')),String(pkg.engines?.node||'missing'));
add('launcher_version','Launcher release values match launcher package',blueprintLauncher===launcher.version&&blueprintEvidence===launcher.version,`${launcher.version} / ${blueprintLauncher||'missing'} / ${blueprintEvidence||'missing'}`);

add('render_manual','Render auto deploy stays explicitly disabled',/autoDeployTrigger:\s*["']?off["']?/.test(blueprint));
add('render_build','Render build uses reproducible npm ci without install scripts',/buildCommand:\s*npm ci\s+--omit=dev\s+--ignore-scripts\s+--no-audit\s+--no-fund/.test(blueprint));
add('render_start','Render start command is npm start',/startCommand:\s*npm start/.test(blueprint));
add('render_health','Render health check is /api/health',/healthCheckPath:\s*\/api\/health/.test(blueprint));
add('render_shutdown','Render shutdown window is at least 30 seconds',/maxShutdownDelaySeconds:\s*(?:3\d|[4-9]\d|\d{3,})/.test(blueprint));
add('render_database_secret','DATABASE_URL is external/non-hardcoded',/key:\s*DATABASE_URL[\s\S]{0,80}sync:\s*false/.test(blueprint));
add('render_launcher_secret','Launcher API key is external/non-hardcoded',/key:\s*CFS_LAUNCHER_API_KEY[\s\S]{0,80}sync:\s*false/.test(blueprint));
add('render_no_secret_literal','Blueprint contains no obvious plaintext production secret',!/(sk_live_|rk_live_|whsec_[A-Za-z0-9_-]{12,}|postgres(?:ql)?:\/\/[^\s]+@|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/.test(blueprint));

add('bootstrap_try_lock','Schema bootstrap uses non-blocking PostgreSQL advisory lock',lockLib.includes('pg_try_advisory_lock')&&lockLib.includes('hashtext(current_database())'));
add('bootstrap_timeout','Schema bootstrap has a bounded lock wait',lockLib.includes('DEFAULT_TIMEOUT_MS = 45_000')&&lockLib.includes('elapsed >= timeoutMs'));
add('bootstrap_unlock','Schema bootstrap always attempts advisory unlock',lockLib.includes('pg_advisory_unlock')&&lockLib.includes('client.release(destroyConnection)'));
add('bootstrap_destroy','Failed unlock destroys the pooled connection',lockLib.includes('destroyConnection = true'));
add('bootstrap_before_workers','Server serializes DB bootstrap before workers and listen',startBlock.indexOf('withDatabaseBootstrapLock(')>=0&&startBlock.indexOf('withDatabaseBootstrapLock(')<startBlock.indexOf('startAccountMailOutboxWorker();')&&startBlock.indexOf('startAccountMailOutboxWorker();')<startBlock.indexOf('httpServer.listen('));

add('schema_contract','Database schema contract is explicit',DATABASE_SCHEMA_VERSION===68&&schemaContract.includes('DATABASE_SCHEMA_SLOT = "production"'),String(DATABASE_SCHEMA_VERSION));
add('schema_state_table','Database bootstrap persists schema generation',server.includes('CREATE TABLE IF NOT EXISTS creator_database_schema_state')&&server.includes('schema_version = EXCLUDED.schema_version'));
add('health_schema_failclosed','Health fails closed on schema mismatch',server.includes('observedSchemaVersion !== DATABASE_SCHEMA_VERSION')&&server.includes('status:"schema_mismatch"')&&server.includes('Retry-After'));
add('health_schema_success','Healthy response exposes current schema generation',server.includes('schema_version:')&&server.includes('DATABASE_SCHEMA_VERSION'));

const sourceExtensions=new Set(['.js','.mjs','.cjs','.json','.yaml','.yml','.html','.css']);
const roots=['server.js','lib','tools','public','launcher/src','launcher/tools','package.json','package-lock.json','render.blueprint.example.yaml'];
const conflicts=[];
function scan(target){
  const abs=path.join(root,target);
  if(!fs.existsSync(abs))return;
  const st=fs.statSync(abs);
  if(st.isDirectory()){
    for(const entry of fs.readdirSync(abs)){if(['node_modules','dist','reports'].includes(entry))continue;scan(path.join(target,entry));}
    return;
  }
  if(!sourceExtensions.has(path.extname(abs))&&!['package.json','package-lock.json'].includes(path.basename(abs)))return;
  const text=fs.readFileSync(abs,'utf8');
  if(/^<{7} |^={7}$|^>{7} /m.test(text))conflicts.push(target);
}
for(const target of roots)scan(target);
add('merge_conflicts','No unresolved merge-conflict markers in deploy sources',conflicts.length===0,conflicts.slice(0,5).join(', '));
add('security68_wired','R68 security gate is wired into project regression',project.includes("['security68',['npm','run','security68:check']"));
add('predeploy_script','package.json exposes predeploy doctor',pkg.scripts?.['predeploy:doctor']==='node tools/predeploy-production-doctor-r68.mjs .');
add('predeploy_gate','package.json exposes full pre-deploy gate',pkg.scripts?.['predeploy:gate']==='npm run predeploy:doctor && npm run release:preflight');

let failed=0;
for(const c of checks){if(!c.ok)failed++;console.log(`${c.ok?'PASS':'FAIL'}  ${c.label}${c.detail?` · ${c.detail}`:''}`)}
const status=failed?'NO_GO':'PREDEPLOY_READY';
console.log(`\nPre-Deploy Doctor R68: ${status} (${checks.length-failed}/${checks.length})`);
if(failed)process.exit(1);
