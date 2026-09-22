import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const require=createRequire(import.meta.url);
const {withDatabaseBootstrapLock,DEFAULT_TIMEOUT_MS,DEFAULT_LOCK_NAMESPACE}=require('../lib/database-bootstrap-lock.js');
const {DATABASE_SCHEMA_VERSION,DATABASE_SCHEMA_SLOT}=require('../lib/database-schema-contract.js');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const server=read('server.js');
const lockLib=read('lib/database-bootstrap-lock.js');
const doctor=read('tools/predeploy-production-doctor-r68.mjs');
const render=read('render.blueprint.example.yaml');
const pkg=JSON.parse(read('package.json'));
const project=read('tools/project-small-regression-check.mjs');
const r59=read('tools/render-production-drill-r59.mjs');
const r67=read('tools/launch-production-gate-r67.mjs');

let passed=0,total=0;
function check(name,fn){total++;try{fn();passed++;console.log(`PASS ${name}`)}catch(error){console.error(`FAIL ${name}: ${error.message}`);process.exitCode=1}}

check('schema contract version 68',()=>assert.equal(DATABASE_SCHEMA_VERSION,68));
check('schema contract production slot',()=>assert.equal(DATABASE_SCHEMA_SLOT,'production'));
check('bootstrap lock namespace stable',()=>assert.equal(DEFAULT_LOCK_NAMESPACE,68068));
check('bootstrap wait bounded to 45 seconds',()=>assert.equal(DEFAULT_TIMEOUT_MS,45_000));
check('bootstrap uses try advisory lock',()=>assert.match(lockLib,/pg_try_advisory_lock/));
check('bootstrap lock scoped to current database',()=>assert.match(lockLib,/hashtext\(current_database\(\)\)/));
check('bootstrap uses numeric application namespace',()=>assert.match(lockLib,/\$1::int/));
check('bootstrap uses polling not unbounded blocking lock',()=>assert.doesNotMatch(lockLib,/SELECT\s+pg_advisory_lock\(/));
check('bootstrap timeout fails closed',()=>assert.match(lockLib,/elapsed >= timeoutMs/));
check('bootstrap always unlocks',()=>assert.match(lockLib,/pg_advisory_unlock/));
check('failed unlock destroys pooled client',()=>assert.match(lockLib,/client\.release\(destroyConnection\)/));

{
  const queries=[];let releases=[];let calls=0;
  const client={
    async query(sql){queries.push(sql);if(sql.includes('pg_try_advisory_lock'))return{rows:[{locked:true}]};if(sql.includes('pg_advisory_unlock'))return{rows:[{unlocked:true}]};throw new Error('unexpected query')},
    release(destroy){releases.push(Boolean(destroy))}
  };
  const pool={async connect(){return client}};
  const result=await withDatabaseBootstrapLock(pool,async()=>{calls++;return 'ok'},{timeoutMs:50,pollMs:5});
  check('immediate lock returns task result',()=>assert.equal(result,'ok'));
  check('immediate lock executes task once',()=>assert.equal(calls,1));
  check('immediate lock unlocks once',()=>assert.equal(queries.filter(q=>q.includes('pg_advisory_unlock')).length,1));
  check('healthy unlock keeps pooled connection reusable',()=>assert.deepEqual(releases,[false]));
}
{
  let attempts=0;let waited=0;let released=false;
  const client={
    async query(sql){if(sql.includes('pg_try_advisory_lock')){attempts++;return{rows:[{locked:attempts>=3}]}};if(sql.includes('pg_advisory_unlock'))return{rows:[{unlocked:true}]};throw new Error('unexpected')},
    release(){released=true}
  };
  const pool={async connect(){return client}};
  await withDatabaseBootstrapLock(pool,async()=>true,{timeoutMs:200,pollMs:2,onWait:()=>{waited++}});
  check('contention retries advisory lock',()=>assert.equal(attempts,3));
  check('contention reports wait callback',()=>assert.equal(waited,2));
  check('contention path releases client',()=>assert.equal(released,true));
}
{
  let destroyed=null;
  const client={
    async query(sql){if(sql.includes('pg_try_advisory_lock'))return{rows:[{locked:true}]};if(sql.includes('pg_advisory_unlock'))throw new Error('connection lost');throw new Error('unexpected')},
    release(value){destroyed=Boolean(value)}
  };
  const pool={async connect(){return client}};
  await withDatabaseBootstrapLock(pool,async()=>true,{timeoutMs:50,pollMs:2});
  check('unlock failure destroys connection',()=>assert.equal(destroyed,true));
}
{
  let released=false;let taskRan=false;
  const client={async query(sql){if(sql.includes('pg_try_advisory_lock'))return{rows:[{locked:false}]};throw new Error('unexpected')},release(){released=true}};
  const pool={async connect(){return client}};
  let error='';try{await withDatabaseBootstrapLock(pool,async()=>{taskRan=true},{timeoutMs:8,pollMs:2})}catch(e){error=e.message}
  check('lock contention timeout rejects startup',()=>assert.match(error,/Schema-Bootstrap/));
  check('task never runs without lock',()=>assert.equal(taskRan,false));
  check('timeout releases waiting client',()=>assert.equal(released,true));
}

check('server imports bootstrap lock',()=>assert.match(server,/require\("\.\/lib\/database-bootstrap-lock"\)/));
check('server imports schema contract',()=>assert.match(server,/database-schema-contract/));
check('server bootstraps DB under advisory lock',()=>assert.match(server,/withDatabaseBootstrapLock\([\s\S]{0,500}\(\) => initDatabase\(\)/));
const startBlock=server.slice(server.indexOf('async function startServer()'));
check('workers start after locked DB bootstrap',()=>assert.ok(startBlock.indexOf('withDatabaseBootstrapLock(')<startBlock.indexOf('startAccountMailOutboxWorker();')));
check('HTTP listen starts after locked DB bootstrap',()=>assert.ok(startBlock.indexOf('withDatabaseBootstrapLock(')<startBlock.indexOf('httpServer.listen(')));
check('server creates schema state table',()=>assert.match(server,/CREATE TABLE IF NOT EXISTS creator_database_schema_state/));
check('schema state slot constrained to production',()=>assert.match(server,/creator_database_schema_state_slot_check[\s\S]{0,100}CHECK \(slot = 'production'\)/));
check('schema state stores backend version',()=>assert.match(server,/backend_version TEXT NOT NULL/));
check('schema state upsert occurs after DDL',()=>assert.ok(server.indexOf('CREATE TABLE IF NOT EXISTS creator_module_state')<server.indexOf('INSERT INTO creator_database_schema_state')));
check('health reads schema state',()=>assert.match(server,/SELECT schema_version[\s\S]{0,140}creator_database_schema_state/));
check('health fails closed on mismatch',()=>assert.match(server,/observedSchemaVersion !== DATABASE_SCHEMA_VERSION/));
check('schema mismatch is HTTP 503',()=>assert.match(server,/observedSchemaVersion !== DATABASE_SCHEMA_VERSION[\s\S]{0,200}status\(503\)/));
check('schema mismatch advertises retry-after',()=>assert.match(server,/observedSchemaVersion !== DATABASE_SCHEMA_VERSION[\s\S]{0,160}Retry-After/));
check('healthy health payload exposes schema version',()=>assert.match(server,/database:\s*"connected",[\s\S]{0,120}schema_version:\s*DATABASE_SCHEMA_VERSION/));

check('Render stays manual deploy',()=>assert.match(render,/autoDeployTrigger:\s*["']?off["']?/));
check('Render build remains npm ci',()=>assert.match(render,/buildCommand:\s*npm ci --omit=dev --ignore-scripts --no-audit --no-fund/));
check('Render start remains npm start',()=>assert.match(render,/startCommand:\s*npm start/));
check('Render health uses schema-aware health route',()=>assert.match(render,/healthCheckPath:\s*\/api\/health/));
check('predeploy doctor script registered',()=>assert.equal(pkg.scripts['predeploy:doctor'],'node tools/predeploy-production-doctor-r68.mjs .'));
check('security68 script registered',()=>assert.equal(pkg.scripts['security68:check'],'node tools/predeploy-migration-safety-pass68-test.mjs .'));
check('full predeploy gate registered',()=>assert.equal(pkg.scripts['predeploy:gate'],'npm run predeploy:doctor && npm run release:preflight'));
check('security68 wired into project check',()=>assert.match(project,/\['security68',\['npm','run','security68:check'\]\]/));
check('doctor verifies lockfile parity',()=>assert.match(doctor,/Locked root dependencies exactly match package\.json/));
check('doctor scans merge conflicts',()=>assert.match(doctor,/No unresolved merge-conflict markers/));
check('doctor verifies schema mismatch fail-closed',()=>assert.match(doctor,/Health fails closed on schema mismatch/));
check('R59 checks deployed schema generation',()=>assert.match(r59,/health_schema/));
check('R67 requires R59 schema check',()=>assert.match(r67,/health_schema/));

console.log(`\nPre-Deploy Migration Safety R68: ${passed}/${total}${process.exitCode? ' FAIL':' PASS'}`);
if(process.exitCode)process.exit(1);
