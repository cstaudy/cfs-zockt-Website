import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {
  assertCommand,
  loadManifest,
  parseDatabaseUrl,
  pgEnvFromUrl,
  requireSecret,
  signRecoveryEvidence
} from './database-backup-lib.mjs';

const require=createRequire(import.meta.url);
const {DATABASE_SCHEMA_VERSION,DATABASE_SCHEMA_SLOT}=require('../lib/database-schema-contract.js');
const argv=process.argv.slice(2);
const root=path.resolve(argv[0]&&!argv[0].startsWith('--')?argv.shift():'.');
const live=argv.includes('--live');
const preflight=argv.includes('--preflight')||!live;
if(live&&argv.includes('--preflight')) fail('Nutze entweder --preflight oder --live, nicht beides.');

const reportsDir=path.join(root,'reports');
const backupDir=path.join(root,'backups','recovery-drill');
const evidencePath=path.join(reportsDir,'database-recovery-drill-evidence.json');
const sourceUrl=String(process.env.DATABASE_URL||'').trim();
const targetUrl=String(process.env.CFS_RESTORE_TARGET_URL||'').trim();
const criticalTables=Object.freeze([
  'creator_accounts',
  'creator_sessions',
  'creator_settings',
  'creator_module_state',
  'creator_database_schema_state',
  'creator_production_evidence'
]);

function fail(message,code=1){console.error(`Database Recovery Drill R60: FAIL · ${message}`);process.exit(code)}
function runNode(script,args=[],env=process.env){
  const r=spawnSync(process.execPath,[path.join(root,'tools',script),...args],{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024});
  if(r.stdout) process.stdout.write(r.stdout);
  if(r.stderr) process.stderr.write(r.stderr);
  if(r.status!==0) throw new Error(`${script} fehlgeschlagen (Exit ${r.status??'unknown'}).`);
  return r;
}
function psql(url,sql){
  const {env}=pgEnvFromUrl(url);
  const r=spawnSync('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',sql],{env,encoding:'utf8',maxBuffer:16*1024*1024});
  if(r.status!==0) throw new Error(`psql-Prüfung fehlgeschlagen: ${String(r.stderr||r.stdout||'').trim()}`);
  return String(r.stdout||'').trim();
}
function count(url,sql){
  const n=Number(psql(url,sql).split(/\r?\n/).filter(Boolean).at(-1));
  if(!Number.isFinite(n)) throw new Error('Numerische Datenbankprüfung lieferte keinen gültigen Wert.');
  return n;
}
function sqlLiteral(value){return `'${String(value).replaceAll("'","''")}'`}
function tableList(url){
  const names=criticalTables.map(sqlLiteral).join(',');
  return psql(url,`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename IN (${names}) ORDER BY tablename;`).split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
}
function validatePolicy(){
  const file=path.join(root,'ops','database-recovery-policy.json');
  const policy=JSON.parse(fs.readFileSync(file,'utf8'));
  if(policy?.restore?.require_separate_target!==true) throw new Error('Recovery-Policy verlangt kein separates Restore-Ziel.');
  if(policy?.restore?.require_empty_target_for_logical_restore!==true) throw new Error('Recovery-Policy verlangt kein leeres Restore-Ziel.');
  if(policy?.restore?.never_overwrite_primary_by_default!==true) throw new Error('Recovery-Policy sperrt Primary-Overwrite nicht.');
  return policy;
}
function newestCreatedArchive(before){
  const files=fs.readdirSync(backupDir).filter(name=>name.endsWith('.cfsbackup')&&!before.has(name)).map(name=>({name,file:path.join(backupDir,name),mtime:fs.statSync(path.join(backupDir,name)).mtimeMs})).sort((a,b)=>b.mtime-a.mtime);
  if(!files.length) throw new Error('Backup-Prozess hat kein neues .cfsbackup erzeugt.');
  return files[0].file;
}
function criticalRowCounts(url){
  const out={};
  for(const table of criticalTables) out[table]=count(url,`SELECT COUNT(*) FROM ${table};`);
  return out;
}

try{
  validatePolicy();
  if(!sourceUrl) throw new Error('DATABASE_URL fehlt. Nutze die Production-DB nur als Backup-Quelle.');
  if(!targetUrl) throw new Error('CFS_RESTORE_TARGET_URL fehlt. Nutze eine separate leere Recovery-Datenbank.');
  const secret=requireSecret();
  const source=pgEnvFromUrl(sourceUrl),target=pgEnvFromUrl(targetUrl);
  const sourceParsed=parseDatabaseUrl(sourceUrl),targetParsed=parseDatabaseUrl(targetUrl);
  if(source.identity===target.identity) throw new Error('Recovery-Ziel entspricht der Production-Quelle. Restore ist gesperrt.');

  const pgDumpVersion=assertCommand('pg_dump');
  const pgRestoreVersion=assertCommand('pg_restore');
  const psqlVersion=assertCommand('psql');
  const sourcePing=psql(sourceUrl,'SELECT current_database();');
  const targetPing=psql(targetUrl,'SELECT current_database();');
  if(sourcePing!==sourceParsed.database) throw new Error('Production-Quellverbindung zeigt auf eine unerwartete Datenbank.');
  if(targetPing!==targetParsed.database) throw new Error('Recovery-Zielverbindung zeigt auf eine unerwartete Datenbank.');

  const sourceCritical=tableList(sourceUrl);
  const missingSource=criticalTables.filter(name=>!sourceCritical.includes(name));
  if(missingSource.length) throw new Error(`Production-Quelle enthält nicht alle kritischen Tabellen: ${missingSource.join(', ')}`);
  const targetTablesBefore=count(targetUrl,"SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');");
  if(targetTablesBefore!==0) throw new Error(`Recovery-Zieldatenbank ist nicht leer (${targetTablesBefore} Tabellen). Nutze eine frische separate DB.`);

  console.log(`PASS Recovery-Policy verlangt separates leeres Ziel`);
  console.log(`PASS Production-Quelle erreichbar · ${sourceParsed.host}/${sourceParsed.database}`);
  console.log(`PASS Recovery-Ziel separat und leer · ${targetParsed.host}/${targetParsed.database}`);
  console.log(`PASS Kritische Production-Tabellen vorhanden · ${sourceCritical.length}/${criticalTables.length}`);
  console.log(`PASS PostgreSQL-Clienttools verfügbar · ${pgDumpVersion} · ${pgRestoreVersion} · ${psqlVersion}`);

  if(preflight&&!live){
    console.log('\nDatabase Recovery Drill R60: PREFLIGHT_READY');
    console.log('Kein Restore ausgeführt. Für den echten Drill --live und CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE verwenden.');
    process.exit(0);
  }
  if(process.env.CFS_RESTORE_CONFIRM!=='RESTORE_TO_EMPTY_DATABASE') throw new Error('CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE fehlt.');

  fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  fs.mkdirSync(reportsDir,{recursive:true,mode:0o700});
  const before=new Set(fs.readdirSync(backupDir));

  console.log('\nR60 Schritt 1/5: verschlüsseltes Production-Backup erstellen');
  runNode('database-backup.mjs',[`--out=${backupDir}`]);
  const archive=newestCreatedArchive(before);
  const manifestFile=archive.replace(/\.cfsbackup$/,'.manifest.json');
  const manifest=loadManifest(manifestFile);

  console.log('\nR60 Schritt 2/5: Backup kryptografisch + PostgreSQL-TOC verifizieren');
  runNode('database-backup-verify.mjs',[archive]);

  console.log('\nR60 Schritt 3/5: Restore ausschließlich in leere Recovery-DB');
  runNode('database-restore.mjs',[archive,'--execute'],{...process.env,CFS_RESTORE_TARGET_URL:targetUrl,CFS_RESTORE_CONFIRM:'RESTORE_TO_EMPTY_DATABASE'});

  console.log('\nR60 Schritt 4/5: Restore-Integrität prüfen');
  const targetCritical=tableList(targetUrl);
  const missingTarget=criticalTables.filter(name=>!targetCritical.includes(name));
  if(missingTarget.length) throw new Error(`Restore enthält nicht alle kritischen Tabellen: ${missingTarget.join(', ')}`);
  const restoredUserTables=count(targetUrl,"SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname='public';");
  if(restoredUserTables<criticalTables.length) throw new Error(`Restore enthält unerwartet wenige Anwendungstabellen (${restoredUserTables}).`);
  const schemaVersion=count(targetUrl,`SELECT schema_version FROM creator_database_schema_state WHERE slot=${sqlLiteral(DATABASE_SCHEMA_SLOT)} LIMIT 1;`);
  if(schemaVersion!==Number(DATABASE_SCHEMA_VERSION)) throw new Error(`Schema-Version im Restore ist ${schemaVersion}, erwartet ${DATABASE_SCHEMA_VERSION}.`);
  const invalidIndexes=count(targetUrl,"SELECT COUNT(*) FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid;");
  if(invalidIndexes!==0) throw new Error(`Restore enthält ${invalidIndexes} ungültige Indizes.`);
  const unvalidatedConstraints=count(targetUrl,"SELECT COUNT(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND NOT c.convalidated;");
  if(unvalidatedConstraints!==0) throw new Error(`Restore enthält ${unvalidatedConstraints} unvalidierte Constraints.`);
  const writeProbe=psql(targetUrl,"BEGIN; CREATE TEMP TABLE cfs_recovery_write_probe_r60(id integer PRIMARY KEY,note text NOT NULL); INSERT INTO cfs_recovery_write_probe_r60(id,note) VALUES(1,'r60'); SELECT 'CFS_R60_WRITE_PROBE='||COUNT(*) FROM cfs_recovery_write_probe_r60; ROLLBACK;");
  const writeProbeOk=writeProbe.includes('CFS_R60_WRITE_PROBE=1');
  if(!writeProbeOk) throw new Error('Transaktionaler Write-Probe auf Recovery-DB fehlgeschlagen.');
  const rowCounts=criticalRowCounts(targetUrl);

  console.log(`PASS Kritische Tabellen restauriert · ${targetCritical.length}/${criticalTables.length}`);
  console.log(`PASS Schema-Version restauriert · ${schemaVersion}`);
  console.log(`PASS Ungültige Indizes · ${invalidIndexes}`);
  console.log(`PASS Unvalidierte Constraints · ${unvalidatedConstraints}`);
  console.log('PASS Transaktionaler Write-Probe · rollback ohne persistente Testdaten');

  console.log('\nR60 Schritt 5/5: manipulationssichtbare Launch-Evidence schreiben');
  const evidence=signRecoveryEvidence({
    schema:1,
    pass:'R60',
    status:'LIVE_RESTORE_PASS',
    drill_id:`r60-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
    verified_at:new Date().toISOString(),
    mode:'separate-empty-target',
    source_target_separate:true,
    target_was_empty:true,
    backup_created_at:manifest.created_at,
    backup_ciphertext_sha256:manifest.ciphertext_sha256,
    backup_archive:path.basename(archive),
    source:{host:manifest.source.host,database:manifest.source.database},
    target:{host:targetParsed.host,database:targetParsed.database},
    restored_user_tables:restoredUserTables,
    critical_tables_verified:[...targetCritical],
    critical_table_row_counts:rowCounts,
    critical_tables_ok:true,
    schema_version:schemaVersion,
    schema_version_expected:Number(DATABASE_SCHEMA_VERSION),
    schema_version_ok:true,
    invalid_indexes:invalidIndexes,
    unvalidated_constraints:unvalidatedConstraints,
    write_probe_ok:true,
    pg_dump_version:pgDumpVersion,
    pg_restore_version:pgRestoreVersion,
    psql_version:psqlVersion
  },secret);
  fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
  console.log(`PASS Recovery-Evidence · ${path.relative(root,evidencePath)}`);
  console.log('\nDatabase Recovery Drill R60: LIVE_RESTORE_PASS');
}catch(error){
  const safe=String(error?.message||error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'postgresql://[redacted]');
  fail(safe,1);
}
