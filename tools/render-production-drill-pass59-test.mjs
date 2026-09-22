import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const drill=read('tools/render-production-drill-r59.mjs');
const project=read('tools/project-small-regression-check.mjs');
const blueprint=read('render.blueprint.example.yaml');

let passed=0,total=0;
function check(name,fn){
  total++;
  try{fn();passed++;console.log(`PASS ${name}`)}
  catch(error){console.error(`FAIL ${name}: ${error.message}`);process.exitCode=1}
}

check('render drill npm script registered',()=>assert.equal(pkg.scripts?.['render:drill'],'node tools/render-production-drill-r59.mjs .'));
check('security59 npm script registered',()=>assert.equal(pkg.scripts?.['security59:check'],'node tools/render-production-drill-pass59-test.mjs .'));
check('security59 wired into project regression',()=>assert.match(project,/\['security59',\['npm','run','security59:check'\]\]/));
check('drill requires HTTPS production target',()=>assert.match(drill,/Production target muss HTTPS verwenden/));
check('drill supports explicit live mode',()=>assert.match(drill,/args\.includes\('--live'\)/));
check('drill supports strict Render env mode',()=>assert.match(drill,/args\.includes\('--strict-env'\)/));
check('drill supports external-only mode',()=>assert.match(drill,/args\.includes\('--external-only'\)/));
check('strict-env and external-only are mutually exclusive',()=>assert.match(drill,/strictEnv&&externalOnly/));
check('external-only suppresses runtime env evaluation',()=>assert.match(drill,/if\(!externalOnly&&\(runtimeSignal\|\|strictEnv\)\)/));
check('external-only reason is explicit in report checks',()=>assert.match(drill,/skipped by --external-only/));
check('report records external-only mode',()=>assert.match(drill,/external_only:externalOnly/));
check('runtime doctor remains wired for strict env',()=>assert.match(drill,/runtimeDoctor\(process\.env\)/));
check('database transport policy remains wired',()=>assert.match(drill,/databaseRuntimeSecurity\(\{databaseUrl:process\.env\.DATABASE_URL,nodeEnv:'production'\}\)/));
check('lockfile readiness is checked',()=>assert.match(drill,/Backend lockfile exists/));
check('Node 22 engine readiness is checked',()=>assert.match(drill,/Node\.js 22\+ declared/));
check('Render blueprint readiness is checked',()=>assert.match(drill,/Render Blueprint exists/));
check('Render build must use npm ci',()=>assert.match(drill,/Render build uses npm ci/));
check('Render health path must be api health',()=>assert.match(drill,/Render health check uses \/api\/health/));
check('canonical production domain is checked',()=>assert.match(drill,/Canonical domain declared/));
check('production origin pin is checked',()=>assert.match(drill,/Blueprint pins production APP_BASE_URL/));
check('plaintext production credentials are rejected',()=>assert.match(drill,/Blueprint contains no obvious plaintext production credential/));
check('live DNS resolution is checked',()=>assert.match(drill,/Canonical DNS resolves/));
check('HTTP to HTTPS redirect is checked',()=>assert.match(drill,/HTTP permanently redirects to HTTPS/));
check('canonical redirect origin is checked',()=>assert.match(drill,/HTTP redirect targets canonical origin/));
check('HTTPS root response is checked',()=>assert.match(drill,/Production root responds over HTTPS/));
check('HSTS is checked',()=>assert.match(drill,/HSTS header present/));
check('CSP is checked',()=>assert.match(drill,/CSP header present/));
check('nosniff is checked',()=>assert.match(drill,/X-Content-Type-Options nosniff/));
check('Referrer-Policy is checked',()=>assert.match(drill,/Referrer-Policy present/));
check('Permissions-Policy is checked',()=>assert.match(drill,/Permissions-Policy present/));
check('X-Powered-By absence is checked',()=>assert.match(drill,/X-Powered-By absent/));
check('request ID is checked',()=>assert.match(drill,/X-Request-ID present/));
check('health endpoint HTTP 200 is checked',()=>assert.match(drill,/Render health endpoint returns 200/));
check('health payload requires app and database online',()=>assert.match(drill,/Health confirms app and database online/));
check('deployed backend version is checked',()=>assert.match(drill,/Health version matches deployed package/));
check('deployed schema generation is checked',()=>assert.match(drill,/Health schema generation matches this release/));
check('health no-store is checked',()=>assert.match(drill,/Health response is no-store/));
check('health Set-Cookie absence is checked',()=>assert.match(drill,/Health response sets no cookies/));
check('public status accepts only online or degraded',()=>assert.match(drill,/body\?\.ok===true&&\['online','degraded'\]\.includes/));
check('public status no-store is checked',()=>assert.match(drill,/Public status is no-store/));
check('private env path exposure is probed',()=>assert.match(drill,/\['\/\.env','\/\.git\/config','\/package\.json'\]/));
check('malformed JSON handling is probed',()=>assert.match(drill,/body:'\{'/));
check('TLS trust uses rejectUnauthorized',()=>assert.match(drill,/rejectUnauthorized:true/));
check('TLS expiry is checked',()=>assert.match(drill,/TLS certificate is not expired/));
check('external DNS limitations become BLOCKED not fake PASS',()=>assert.match(drill,/EXTERNAL_BLOCKED/));
check('live failures produce LIVE_FAIL',()=>assert.match(drill,/LIVE_FAIL/));
check('successful live suite produces LIVE_PASS',()=>assert.match(drill,/LIVE_PASS/));
check('blocking failures set nonzero exit',()=>assert.match(drill,/if\(blockingFails\.length\)process\.exitCode=1/));
check('externally blocked suite uses distinct exit code',()=>assert.match(drill,/else if\(blockedChecks\.length\)process\.exitCode=2/));
check('Blueprint remains manual deploy',()=>assert.match(blueprint,/autoDeployTrigger:\s*["']?off["']?/));
check('Blueprint health check remains api health',()=>assert.match(blueprint,/healthCheckPath:\s*\/api\/health/));

console.log(`\nRender Production Drill Security R59: ${passed}/${total}${process.exitCode?' FAIL':' PASS'}`);
if(process.exitCode)process.exit(1);
