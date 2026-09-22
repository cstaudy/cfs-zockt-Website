import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const checks=[];
const add=(label,ok)=>checks.push({label,ok:Boolean(ok)});

let pkg={},drill='',lib='',restore='',r67='';
try{pkg=JSON.parse(read('package.json'));}catch{}
try{drill=read('tools/database-recovery-drill-r60.mjs');}catch{}
try{lib=read('tools/database-backup-lib.mjs');}catch{}
try{restore=read('tools/database-restore.mjs');}catch{}
try{r67=read('tools/launch-production-gate-r67.mjs');}catch{}

add('recovery drill npm script registered',pkg?.scripts?.['recovery:drill']==='node tools/database-recovery-drill-r60.mjs .');
add('security60 npm script registered',pkg?.scripts?.['security60:check']==='node tools/database-recovery-drill-pass60-test.mjs .');
add('R60 drill file exists',exists('tools/database-recovery-drill-r60.mjs'));
add('backup implementation exists',exists('tools/database-backup.mjs'));
add('backup verifier exists',exists('tools/database-backup-verify.mjs'));
add('restore implementation exists',exists('tools/database-restore.mjs'));
add('recovery policy exists',exists('ops/database-recovery-policy.json'));
add('drill requires production DATABASE_URL',/process\.env\.DATABASE_URL/.test(drill));
add('drill requires separate recovery target env',/CFS_RESTORE_TARGET_URL/.test(drill));
add('drill supports preflight',/--preflight/.test(drill)&&/PREFLIGHT_READY/.test(drill));
add('drill requires explicit live mode',/--live/.test(drill)&&/LIVE_RESTORE_PASS/.test(drill));
add('live restore requires explicit confirmation',/CFS_RESTORE_CONFIRM/.test(drill)&&/RESTORE_TO_EMPTY_DATABASE/.test(drill));
add('source and target identities must differ',/source\.identity===target\.identity/.test(drill));
add('target must be empty before restore',/targetTablesBefore!==0/.test(drill));
add('production backup is created with existing backup tool',/database-backup\.mjs/.test(drill));
add('backup is cryptographically verified before restore',/database-backup-verify\.mjs/.test(drill));
add('restore uses hardened restore tool',/database-restore\.mjs/.test(drill));
add('restore tool separately blocks backup source target',/target\.identity===sourceIdentity/.test(restore));
add('restore tool separately blocks DATABASE_URL target',/target\.identity===current\.identity/.test(restore));
add('restore tool separately requires empty target',/tables!==0/.test(restore));
add('restore tool requires explicit execute flag',/--execute/.test(restore));
add('critical account table is verified',/creator_accounts/.test(drill));
add('critical session table is verified',/creator_sessions/.test(drill));
add('critical settings table is verified',/creator_settings/.test(drill));
add('critical module state table is verified',/creator_module_state/.test(drill));
add('schema state table is verified',/creator_database_schema_state/.test(drill));
add('production evidence table is verified',/creator_production_evidence/.test(drill));
add('schema generation is checked after restore',/DATABASE_SCHEMA_VERSION/.test(drill)&&/schemaVersion/.test(drill));
add('invalid PostgreSQL indexes are checked',/indisvalid/.test(drill)&&/invalidIndexes/.test(drill));
add('unvalidated PostgreSQL constraints are checked',/convalidated/.test(drill)&&/unvalidatedConstraints/.test(drill));
add('write probe uses a temporary table',/CREATE TEMP TABLE cfs_recovery_write_probe_r60/.test(drill));
add('write probe is rolled back',/ROLLBACK/.test(drill));
add('critical row counts are recorded without source mutation',/critical_table_row_counts/.test(drill));
add('R60 evidence path matches R67 default collector',/database-recovery-drill-evidence\.json/.test(drill)&&/database-recovery-drill-evidence\.json/.test(r67));
add('R60 evidence has source-target-separate flag',/source_target_separate:true/.test(drill));
add('R60 evidence has critical tables flag',/critical_tables_ok:true/.test(drill));
add('R60 evidence has write probe flag',/write_probe_ok:true/.test(drill));
add('R60 evidence records invalid index count',/invalid_indexes:invalidIndexes/.test(drill));
add('R60 evidence records constraint validation count',/unvalidated_constraints:unvalidatedConstraints/.test(drill));
add('recovery evidence signing function exists',/export function signRecoveryEvidence/.test(lib));
add('recovery evidence verification function exists',/export function verifyRecoveryEvidenceHmac/.test(lib));
add('recovery evidence HMAC excludes its own signature',/delete body\.evidence_hmac_sha256/.test(lib));
add('recovery evidence HMAC uses timing safe comparison',/safeEqualHex\(supplied,recoveryEvidenceHmac/.test(lib));
add('recovery evidence key is domain separated',/cfs_zockt recovery evidence hmac v1/.test(lib));
add('R67 imports recovery evidence verifier',/verifyRecoveryEvidenceHmac/.test(r67));
add('R67 requires full LIVE_RESTORE_PASS',/LIVE_RESTORE_PASS/.test(r67));
add('R67 requires critical tables ok',/critical_tables_ok/.test(r67));
add('R67 requires write probe ok',/write_probe_ok/.test(r67));
add('R67 requires zero invalid indexes',/invalid_indexes/.test(r67));
add('R67 requires zero unvalidated constraints',/unvalidated_constraints/.test(r67));

let failed=0;
for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'} ${c.label}`);if(!c.ok)failed++;}
console.log(`\nDatabase Recovery Drill Security R60: ${checks.length-failed}/${checks.length} PASS`);
if(failed) process.exitCode=1;
