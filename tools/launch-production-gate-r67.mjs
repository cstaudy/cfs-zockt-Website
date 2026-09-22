import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';
import {verifyRecoveryEvidenceHmac} from './database-backup-lib.mjs';

const require=createRequire(import.meta.url);
const {databaseRuntimeSecurity}=require('../lib/database-runtime-security.js');
const {canonicalAppOrigin}=require('../lib/runtime-origin-security.js');
const {verifyDrillRecord:verifyMailDrill}=require('../lib/account-mail-drill-security.js');
const {verifyAuthDrillRecord}=require('../lib/account-auth-drill-security.js');
const {monitorAlertConfig,verifyMonitorEvidence}=require('../lib/production-monitor-security.js');
const {verifyStripeLiveEvidence}=require('../lib/stripe-live-production-evidence.js');
const windowsDrill=require('../launcher/src/windows-production-drill.js');
const liveSoakDrill=require('../launcher/src/live-soak-production-drill.js');
const {LAUNCH_GATE_STATUS,LAUNCH_GATE_SOURCE,LAUNCH_EVIDENCE_POLICY,policyForKind,signLaunchGateEvidence,evaluateLaunchGate}=require('../lib/launch-production-gate.js');

const argv=process.argv.slice(2);
const root=path.resolve(argv[0]&&!argv[0].startsWith('--')?argv.shift():'.');
const args=[...argv];
const has=name=>args.includes(name);
function values(name){const out=[];for(let i=0;i<args.length;i++)if(args[i]===name&&args[i+1])out.push(args[++i]);return out}
const importFiles=values('--import').map(file=>path.resolve(file));
const collectDefaults=has('--collect-defaults');
const verifyMode=has('--verify');
const resetMode=has('--reset');
const statusMode=has('--status')||(!verifyMode&&!collectDefaults&&!importFiles.length&&!resetMode);
const env=process.env;
const databaseUrl=String(env.DATABASE_URL||'').trim();
const nodeEnv=String(env.NODE_ENV||'').trim();
const releaseVersion=String(env.CFS_RELEASE_EVIDENCE_VERSION||'0.42.0').trim();
const auditSecret=String(env.CFS_ADMIN_AUDIT_HMAC_SECRET||'');
const billingRequired=String(env.CFS_BILLING_LIVE_REQUIRED||'').trim().toLowerCase()==='true';
const reportsDir=path.join(root,'reports');
const masterEvidencePath=path.join(reportsDir,'launch-production-gate-evidence.json');
const DEFAULT_FILES=[
  'reports/render-production-drill-r59.json',
  'reports/database-recovery-drill-evidence.json',
  'reports/account-mail-drill-evidence.json',
  'reports/account-auth-drill-evidence.json',
  'reports/production-monitor-drill-evidence.json',
  'reports/stripe-live-drill-evidence.json',
  'launcher/reports/windows-production-drill-evidence.json',
  'launcher/reports/live-soak-production-drill-evidence.json'
];

function fail(message,code=2){console.error(`Launch Production Gate R67: FAIL · ${message}`);process.exit(code)}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function sha256File(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
function sha256Json(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}
function safeText(value,max=500){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
function safeError(value){return safeText(value?.message||value,1200).replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'postgresql://[redacted]').replace(/(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]+/g,'[redacted-stripe-key]').replace(/whsec_[A-Za-z0-9_-]+/g,'[redacted-stripe-webhook]')}
function observedDate(value){const t=Date.parse(value||'');if(!Number.isFinite(t))throw new Error('Evidence-Zeitstempel fehlt oder ist ungültig.');if(t>Date.now()+5*60*1000)throw new Error('Evidence-Zeitstempel liegt unplausibel in der Zukunft.');return new Date(t)}
function ensureFresh(kind,date){const policy=policyForKind(kind);if(!policy)throw new Error(`Unbekannte Launch-Evidence-Art: ${kind}`);const age=Date.now()-date.getTime();if(age>policy.max_age_ms)throw new Error(`${policy.label} ist zu alt (${(age/86400000).toFixed(1)} Tage).`);return new Date(date.getTime()+policy.max_age_ms)}
function coreConfig(){
  if(nodeEnv!=='production')throw new Error('R67 muss mit NODE_ENV=production laufen.');
  if(!databaseUrl)throw new Error('DATABASE_URL fehlt.');
  if(!releaseVersion)throw new Error('CFS_RELEASE_EVIDENCE_VERSION fehlt.');
  if(auditSecret.length<32)throw new Error('CFS_ADMIN_AUDIT_HMAC_SECRET fehlt oder ist zu kurz.');
  databaseRuntimeSecurity({databaseUrl,nodeEnv:'production'});
  const app=canonicalAppOrigin(String(env.APP_BASE_URL||''),'production');
  return{origin:app.origin,host:app.hostname};
}
async function pool(){const runtime=databaseRuntimeSecurity({databaseUrl,nodeEnv:'production'});const pg=await import('pg');const Pool=pg.Pool||pg.default?.Pool;if(!Pool)throw new Error('pg Pool konnte nicht geladen werden.');return new Pool({connectionString:databaseUrl,...runtime.poolOptions,max:2})}
function requireSecret(name,min=32){const value=String(env[name]||'');if(value.length<min)throw new Error(`${name} fehlt oder ist zu kurz.`);return value}
function baseRecord(kind,file,data,observedAt,expiresAt,extra={}){
  return{kind,status:'verified',source:LAUNCH_GATE_SOURCE,release_version:releaseVersion,environment:'production',target:safeText(extra.target||'',500),reference:safeText(extra.reference||path.basename(file),500),artifact_sha256:sha256File(file),notes:safeText(extra.notes||`${kind} durch R67 kryptografisch/strukturell geprüft.`,4000),details:{r67_verified:true,evidence_type:extra.evidence_type||kind,source_status:safeText(data.status,80),source_observed_at:observedAt.toISOString(),source_file:path.basename(file),...extra.details},observed_at:observedAt.toISOString(),expires_at:expiresAt.toISOString()};
}
function validateRender(file,data,config){
  if(data?.schema!==1||data?.status!=='LIVE_PASS'||data?.live_requested!==true||data?.strict_env!==true)throw new Error('R59 Render-Evidence ist kein LIVE_PASS mit strict-env.');
  if(String(data.target||'')!==config.origin)throw new Error('R59 Render-Evidence gehört zu einer anderen Production-Origin.');
  const requiredIds=['config_doctor','database_transport','dns','root_https','health_payload','health_schema','tls_trust','csp'];
  const byId=new Map((Array.isArray(data.checks)?data.checks:[]).map(row=>[String(row.id||''),row]));
  for(const id of requiredIds)if(byId.get(id)?.status!=='PASS')throw new Error(`R59 Pflichtcheck fehlt oder ist nicht PASS: ${id}`);
  if((data.checks||[]).some(row=>row?.blocking!==false&&row?.status==='FAIL'))throw new Error('R59 enthält einen blockierenden FAIL.');
  const expectedCommit=String(env.RENDER_GIT_COMMIT||'').trim();
  if(expectedCommit&&String(data.render_git_commit||'')!==expectedCommit)throw new Error('R59 wurde nicht auf dem aktuell laufenden Render-Git-Commit erzeugt.');
  const observed=observedDate(data.generated_at),expires=ensureFresh('render_live',observed);
  return baseRecord('render_live',file,data,observed,expires,{target:config.origin,evidence_type:'render_r59',reference:`r59:${safeText(data.render_git_commit||data.generated_at,120)}`,details:{render_git_commit:safeText(data.render_git_commit,80),summary:data.summary||{}}});
}
function validateRecovery(file,data){
  const secret=requireSecret('CFS_BACKUP_ENCRYPTION_KEY');
  if(!verifyRecoveryEvidenceHmac(data,secret))throw new Error('R60 Recovery-Evidence-HMAC ist ungültig.');
  if(data?.status!=='LIVE_RESTORE_PASS'||data?.source_target_separate!==true||data?.critical_tables_ok!==true||data?.write_probe_ok!==true||Number(data?.invalid_indexes)!==0||Number(data?.unvalidated_constraints)!==0)throw new Error('R60 Recovery-Evidence enthält keinen vollständigen LIVE_RESTORE_PASS.');
  const observed=observedDate(data.verified_at),expires=ensureFresh('recovery_restore',observed);
  return baseRecord('recovery_restore',file,data,observed,expires,{target:safeText(data?.target?.database||'recovery-db',120),evidence_type:'recovery_r60',reference:safeText(data.drill_id,200),details:{drill_id:safeText(data.drill_id,160),critical_tables:Number(data?.critical_tables_verified?.length||0),write_probe_ok:true}});
}
function validateMail(file,data){
  const secret=requireSecret('CFS_ACCOUNT_MAIL_WEBHOOK_SECRET');
  if(!verifyMailDrill(data,secret))throw new Error('R61 Mail-Evidence-HMAC ist ungültig.');
  if(data?.status!=='LIVE_MAIL_PASS'||data?.inbox_confirmation!==true||data?.webhook_hmac!==true||!Array.isArray(data?.categories)||data.categories.length<3)throw new Error('R61 Mail-Evidence ist kein vollständiger LIVE_MAIL_PASS.');
  const observed=observedDate(data.verified_at),expires=ensureFresh('mail_delivery',observed);
  return baseRecord('mail_delivery',file,data,observed,expires,{target:safeText(data.relay_host,200),evidence_type:'mail_r61',reference:safeText(data.drill_id,200),details:{drill_id:safeText(data.drill_id,160),relay_host:safeText(data.relay_host,200),categories:data.categories.slice(0,8),inbox_confirmation:true}});
}
function validateAuth(file,data,config){
  const secret=requireSecret('CFS_ACCOUNT_ELEVATION_SECRET');
  if(!verifyAuthDrillRecord(data,secret))throw new Error('R62 Auth-Evidence-HMAC ist ungültig.');
  if(data?.status!=='LIVE_AUTH_PASS'||data?.canonical_origin!==config.origin||data?.user_verification!=='required'||data?.passkey_login_verified!==true||data?.passkey_stepup_verified!==true||data?.totp_login_verified!==true||data?.totp_stepup_verified!==true||data?.recovery_stepup_verified!==true||data?.temporary_passkey_removed!==true)throw new Error('R62 Auth-Evidence ist kein vollständiger LIVE_AUTH_PASS für diese Origin.');
  const observed=observedDate(data.verified_at),expires=ensureFresh('auth_live',observed);
  return baseRecord('auth_live',file,data,observed,expires,{target:config.origin,evidence_type:'auth_r62',reference:safeText(data.drill_id,200),details:{drill_id:safeText(data.drill_id,160),rp_id:safeText(data.rp_id,180),user_verification:'required'}});
}
function validateWindows(file,data){
  if(data?.status!=='LIVE_WINDOWS_PASS')throw new Error('R63 Windows-Evidence ist kein LIVE_WINDOWS_PASS.');
  const {status,verified_at,state_sha256,...state}=data;
  if(sha256Json(state)!==String(state_sha256||'').toLowerCase())throw new Error('R63 Windows-Evidence state_sha256 ist ungültig.');
  const result=windowsDrill.evaluateDrill(state);if(!result.ok)throw new Error(`R63 Windows-Evidence Recheck fehlgeschlagen: ${result.errors.join(', ')}`);
  if(String(state.release_version||'')!==releaseVersion)throw new Error(`R63 Windows-Evidence gehört zu Release ${state.release_version||'unknown'}, erwartet ${releaseVersion}.`);
  const observed=observedDate(verified_at),expires=ensureFresh('windows_live',observed);
  return baseRecord('windows_live',file,data,observed,expires,{target:`Windows ${state.windows_build}`,evidence_type:'windows_r63',reference:`launcher:${state.release_version}`,details:{release_version:state.release_version,windows_build:Number(state.windows_build||0),signer_thumbprint:safeText(state.expected_signer_thumbprint,64),steps_passed:result.steps.passed,steps_total:result.steps.total}});
}
function validateSoak(file,data){
  const result=liveSoakDrill.validateFinalEvidence(data);if(!result.ok)throw new Error(`R64 LIVE-Soak-Evidence Recheck fehlgeschlagen: ${result.errors.join(', ')}`);
  if(String(data?.state?.release_version||'')!==releaseVersion)throw new Error(`R64 LIVE-Soak gehört zu Release ${data?.state?.release_version||'unknown'}, erwartet ${releaseVersion}.`);
  const observed=observedDate(data.verified_at),expires=ensureFresh('live_soak',observed);
  return baseRecord('live_soak',file,data,observed,expires,{target:`Windows ${data.state.windows_build}`,evidence_type:'soak_r64',reference:`soak:${safeText(data.state_sha256,80)}`,details:{release_version:data.state.release_version,duration_ms:Number(result.recalculated?.timing?.union_duration_ms||0),coverage_pct:Number(result.recalculated?.timing?.coverage_pct||0),segments:Number(data.state.segments?.length||0)}});
}
function validateMonitor(file,data){
  const cfg=monitorAlertConfig(env,nodeEnv||'production');
  if(!cfg.enabled||cfg.webhookSecret.length<32)throw new Error('Production Monitoring ist nicht vollständig konfiguriert.');
  if(!verifyMonitorEvidence(cfg.webhookSecret,data))throw new Error('R65 Monitor-Evidence-HMAC ist ungültig.');
  if(data?.status!=='LIVE_MONITOR_PASS'||data?.monitor_required!==true||data?.delivery_confirmed_by_external_code!==true)throw new Error('R65 Monitor-Evidence ist kein vollständiger LIVE_MONITOR_PASS.');
  const observed=observedDate(data.verified_at),expires=ensureFresh('monitor_live',observed);
  return baseRecord('monitor_live',file,data,observed,expires,{target:safeText(data.webhook_host,200),evidence_type:'monitor_r65',reference:safeText(data.drill_id,200),details:{drill_id:safeText(data.drill_id,160),webhook_host:safeText(data.webhook_host,200),external_confirmation:true}});
}
function validateBilling(file,data,config){
  const secret=requireSecret('CFS_STRIPE_WEBHOOK_SECRET',8);
  if(!verifyStripeLiveEvidence(secret,data))throw new Error('R66 Stripe-LIVE-Evidence-HMAC ist ungültig.');
  if(data?.status!=='LIVE_BILLING_PASS'||data?.core_verified!==true||data?.resilience_verified!==true||data?.real_financial_actions_were_manual!==true)throw new Error('R66 Billing-Evidence ist nicht FULL LIVE_BILLING_PASS.');
  if(String(data.release_version||'')!==releaseVersion||String(data.origin||'')!==config.origin)throw new Error('R66 Billing-Evidence gehört zu einem anderen Release oder einer anderen Origin.');
  const observed=observedDate(data.verified_at),expires=ensureFresh('billing_live',observed);
  return baseRecord('billing_live',file,data,observed,expires,{target:`stripe-live:${safeText(data.plan,30)}`,evidence_type:'stripe_r66',reference:safeText(data.drill_id,200),details:{plan:safeText(data.plan,30),core_verified:true,resilience_verified:true,matched_events:Number(data.matched_events||0),subscription_id:safeText(data.subscription_id,160)}});
}
function validateArtifact(file,config){
  if(!fs.existsSync(file))throw new Error(`Evidence-Datei fehlt: ${file}`);
  const data=readJson(file);
  if(data?.status==='LIVE_PASS'&&Object.hasOwn(data,'live_requested'))return validateRender(file,data,config);
  if(data?.status==='LIVE_RESTORE_PASS')return validateRecovery(file,data);
  if(data?.status==='LIVE_MAIL_PASS')return validateMail(file,data);
  if(data?.status==='LIVE_AUTH_PASS')return validateAuth(file,data,config);
  if(data?.status==='LIVE_WINDOWS_PASS')return validateWindows(file,data);
  if(data?.status==='LIVE_SOAK_PASS')return validateSoak(file,data);
  if(data?.status==='LIVE_MONITOR_PASS')return validateMonitor(file,data);
  if(data?.status==='LIVE_BILLING_PASS'||data?.status==='LIVE_BILLING_CORE_PASS')return validateBilling(file,data,config);
  throw new Error(`Unbekannte oder nicht bestandene Production-Evidence: ${path.basename(file)} (${safeText(data?.status||'unknown',80)})`);
}
async function insertEvidence(db,row){
  const existing=await db.query(`SELECT id FROM creator_production_evidence WHERE kind=$1 AND artifact_sha256=$2 AND source=$3 LIMIT 1`,[row.kind,row.artifact_sha256,LAUNCH_GATE_SOURCE]);
  if(existing.rowCount)return{inserted:false,id:String(existing.rows[0].id)};
  const result=await db.query(`INSERT INTO creator_production_evidence(kind,status,source,release_version,environment,target,reference,artifact_sha256,notes,details,observed_at,expires_at,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,NULL,NOW(),NOW()) RETURNING id`,[row.kind,row.status,row.source,row.release_version,row.environment,row.target,row.reference,row.artifact_sha256,row.notes,JSON.stringify(row.details),row.observed_at,row.expires_at]);
  return{inserted:true,id:String(result.rows[0].id)};
}
async function runtimeGateState(db){
  const cfg=monitorAlertConfig(env,nodeEnv||'production');
  const [monitorState,alerts,incident]=await Promise.all([
    db.query(`SELECT status,last_success_at FROM creator_production_monitor_state WHERE slot='production' LIMIT 1`),
    db.query(`SELECT severity FROM creator_production_monitor_alerts WHERE state='open'`),
    db.query(`SELECT mode FROM creator_incident_state WHERE slot='website' LIMIT 1`)
  ]);
  const state=monitorState.rows[0]||{},lastSuccess=Date.parse(state.last_success_at||'');
  const workerFresh=Boolean(Number.isFinite(lastSuccess)&&Date.now()-lastSuccess<=cfg.intervalSeconds*1000*3);
  const critical=alerts.rows.some(row=>String(row.severity)==='critical');
  const warning=alerts.rows.some(row=>String(row.severity)==='warning');
  const monitorHealthy=cfg.enabled&&workerFresh&&!critical&&!warning;
  const incidentNormal=String(incident.rows[0]?.mode||'normal')==='normal';
  return{monitorHealthy,incidentNormal,monitor:{configured:cfg.enabled,worker_fresh:workerFresh,critical,warning,last_success_at:state.last_success_at||null},incident_mode:String(incident.rows[0]?.mode||'normal')};
}
async function gateRows(db){return (await db.query(`SELECT kind,status,source,release_version,environment,target,reference,artifact_sha256,notes,details,observed_at,expires_at,created_at FROM creator_production_evidence WHERE release_version=$1 ORDER BY observed_at DESC,created_at DESC LIMIT 1000`,[releaseVersion])).rows}
function printGate(gate,runtime){
  console.log(`\nLaunch Production Gate R67: ${gate.ready?'READY':'BLOCKED'} · ${gate.passed}/${gate.total} · ${gate.score}%`);
  for(const item of gate.checks)console.log(`${item.status.padEnd(7)} ${item.label}${item.observed_at?` · ${new Date(item.observed_at).toISOString()}`:''}`);
  console.log(`Monitor aktuell: ${runtime.monitorHealthy?'HEALTHY':'BLOCKED'} · Incident: ${runtime.incident_mode.toUpperCase()}`);
  if(gate.blocking.length)console.log(`Offen: ${gate.blocking.join(', ')}`);
}
async function writeMaster(db,gate,runtime){
  if(!gate.ready)throw new Error(`Master-Gate noch blockiert: ${gate.blocking.join(', ')}`);
  const verifiedAt=new Date().toISOString(),sourceRows=gate.checks.filter(item=>item.artifact_sha256).map(item=>({id:item.id,kind:item.kind,artifact_sha256:item.artifact_sha256,observed_at:item.observed_at,expires_at:item.expires_at}));
  const record=signLaunchGateEvidence({schema:1,pass:'R67',status:LAUNCH_GATE_STATUS,verified_at:verifiedAt,release_version:releaseVersion,origin:coreConfig().origin,billing_required:billingRequired,checks:gate.checks.map(({id,label,required,ok,status,observed_at,expires_at,artifact_sha256})=>({id,label,required,ok,status,observed_at,expires_at,artifact_sha256})),runtime:{monitor:runtime.monitor,incident_mode:runtime.incident_mode},source_evidence:sourceRows},auditSecret);
  fs.mkdirSync(reportsDir,{recursive:true,mode:0o700});fs.writeFileSync(masterEvidencePath,JSON.stringify(record,null,2)+'\n',{mode:0o600});
  const hash=sha256File(masterEvidencePath),expiresAt=gate.expires_at||new Date(Date.now()+24*3600000).toISOString();
  const exists=await db.query(`SELECT id FROM creator_production_evidence WHERE kind='launch_master' AND artifact_sha256=$1 AND source=$2 LIMIT 1`,[hash,LAUNCH_GATE_SOURCE]);
  if(!exists.rowCount)await db.query(`INSERT INTO creator_production_evidence(kind,status,source,release_version,environment,target,reference,artifact_sha256,notes,details,observed_at,expires_at,created_by,created_at,updated_at) VALUES('launch_master','verified',$1,$2,'production',$3,$4,$5,$6,$7::jsonb,$8,$9,NULL,NOW(),NOW())`,[LAUNCH_GATE_SOURCE,releaseVersion,record.origin,'R67 LIVE_LAUNCH_PASS',hash,'R67 zentraler Produktionsnachweis aus acht verifizierten Live-Drills.',JSON.stringify({r67_verified:true,status:LAUNCH_GATE_STATUS,source_evidence:sourceRows}),verifiedAt,expiresAt]);
  console.log(`\nLaunch Production Gate R67: ${LAUNCH_GATE_STATUS}`);console.log(`Evidence: ${path.relative(root,masterEvidencePath)}`);
}

let db;
try{
  const config=coreConfig();db=await pool();await db.query('SELECT 1');
  if(resetMode){
    await db.query(`DELETE FROM creator_production_evidence WHERE source=$1 AND kind=ANY($2::text[])`,[LAUNCH_GATE_SOURCE,[...LAUNCH_EVIDENCE_POLICY.map(item=>item.kind),'launch_master']]);
    fs.rmSync(masterEvidencePath,{force:true});console.log('Launch Production Gate R67: RESET');process.exit(0);
  }
  const files=[];
  if(collectDefaults)for(const rel of DEFAULT_FILES){const file=path.join(root,rel);if(fs.existsSync(file))files.push(file)}
  for(const file of importFiles)if(!files.includes(file))files.push(file);
  for(const file of files){const row=validateArtifact(file,config);const result=await insertEvidence(db,row);console.log(`${result.inserted?'IMPORTED':'KNOWN   '} ${row.kind.padEnd(16)} ${path.relative(root,file)} · ${row.artifact_sha256.slice(0,12)}…`)}
  const [rows,runtime]=await Promise.all([gateRows(db),runtimeGateState(db)]);
  const gate=evaluateLaunchGate(rows,{releaseVersion,billingRequired,monitorHealthy:runtime.monitorHealthy,incidentNormal:runtime.incidentNormal});
  printGate(gate,runtime);
  if(verifyMode){if(!gate.ready)process.exit(3);await writeMaster(db,gate,runtime)}
  else if(statusMode||files.length)process.exitCode=gate.ready?0:3;
}catch(error){fail(safeError(error),2)}finally{if(db)await db.end().catch(()=>{})}
