import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {databaseRuntimeSecurity}=require('../lib/database-runtime-security.js');
const {signAuthDrillRecord,verifyAuthDrillRecord}=require('../lib/account-auth-drill-security.js');
const argv=process.argv.slice(2);
const root=path.resolve(argv[0]&&!argv[0].startsWith('--')?argv.shift():'.');
const has=n=>argv.includes(n);const value=(n,f='')=>{const i=argv.indexOf(n);return i>=0?String(argv[i+1]??f):f};
const prepare=has('--prepare'),verify=has('--verify'),status=has('--status')||(!prepare&&!verify);
const target=new URL(value('--target',process.env.APP_BASE_URL||'https://cfs-zockt.de')).origin;
const email=value('--email',process.env.CFS_AUTH_DRILL_EMAIL||'').trim().toLowerCase();
const dbUrl=String(process.env.DATABASE_URL||'').trim();
const secret=String(process.env.CFS_ACCOUNT_ELEVATION_SECRET||'');
const reports=path.join(root,'reports'),pendingFile=path.join(reports,'account-auth-drill-pending.json'),evidenceFile=path.join(reports,'account-auth-drill-evidence.json');
function fail(m,c=2){console.error(`Account Auth Production Drill R62: FAIL · ${m}`);process.exit(c)}
function write(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600})}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
async function readiness(){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);try{const r=await fetch(`${target}/api/public/auth-readiness`,{redirect:'error',headers:{'user-agent':'cfs-zockt-auth-drill-r62/1.0'},signal:ctl.signal});if(!r.ok)throw new Error(`Auth-Readiness HTTP ${r.status}`);return await r.json()}finally{clearTimeout(timer)}}
async function openDb(){if(!dbUrl)throw new Error('DATABASE_URL fehlt.');const sec=databaseRuntimeSecurity({databaseUrl:dbUrl,nodeEnv:'production'});const pg=await import('pg');const Pool=pg.Pool||pg.default?.Pool;return new Pool({connectionString:dbUrl,...sec.poolOptions,max:2})}
function requiredEventCounts(rows){const counts={};for(const row of rows)counts[row.event_type]=(counts[row.event_type]||0)+1;return counts}
try{
  if(secret.length<32)throw new Error('CFS_ACCOUNT_ELEVATION_SECRET fehlt oder ist zu kurz.');
  if(new URL(target).protocol!=='https:')throw new Error('Production Auth target muss HTTPS sein.');
  if(status){const p=fs.existsSync(pendingFile)?read(pendingFile):null,e=fs.existsSync(evidenceFile)?read(evidenceFile):null;console.log(JSON.stringify({pending:p?{drill_id:p.drill_id,started_at:p.started_at,email_hash:p.email_hash}:null,evidence:e?{status:e.status,verified_at:e.verified_at,drill_id:e.drill_id}:null},null,2));process.exit(0)}
  const live=await readiness(),host=new URL(target).hostname.toLowerCase();
  if(live?.ok!==true||String(live.canonical_origin||'')!==target||String(live.passkeys?.rp_id||'').toLowerCase()!==host||live.passkeys?.user_verification!=='required'||live.mfa?.totp!==true||live.mfa?.recovery_codes!==true||live.mfa?.passkey_login!==true||live.mfa?.account_step_up!==true)throw new Error('Public Auth-Readiness entspricht nicht dem erwarteten Production-Vertrag.');
  const db=await openDb();
  try{
    if(prepare){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Für --prepare ist --email bzw. CFS_AUTH_DRILL_EMAIL erforderlich.');
      const account=(await db.query(`SELECT id FROM creator_accounts WHERE lower(email)=lower($1) LIMIT 1`,[email])).rows[0];
      if(!account)throw new Error('Test-Account wurde in Production nicht gefunden.');
      const baseline=Number((await db.query(`SELECT COUNT(*)::int AS count FROM creator_webauthn_credentials WHERE creator_id=$1`,[account.id])).rows[0]?.count||0);
      const pending=signAuthDrillRecord({schema:1,pass:'R62',status:'PENDING',drill_id:crypto.randomUUID(),started_at:new Date().toISOString(),canonical_origin:target,rp_id:host,user_verification:'required',creator_id_hash:crypto.createHash('sha256').update(String(account.id)).digest('hex'),email_hash:crypto.createHash('sha256').update(email).digest('hex'),creator_id:String(account.id),baseline_passkeys:baseline},secret);
      write(pendingFile,pending);
      console.log('Account Auth Production Drill R62: PREPARED');
      console.log('Führe jetzt auf https://cfs-zockt.de mit genau diesem Testkonto aus:');
      console.log('  1) temporären Passkey hinzufügen');
      console.log('  2) Passkey-Login');
      console.log('  3) sensible Aktion mit Passkey-Step-up');
      console.log('  4) TOTP-Login');
      console.log('  5) sensible Aktion mit TOTP-Step-up');
      console.log('  6) sensible Aktion mit genau EINEM Recovery-Code-Step-up');
      console.log('  7) temporären Passkey wieder entfernen');
      console.log(`Pending: ${path.relative(root,pendingFile)}`);process.exit(0);
    }
    if(verify){
      if(!fs.existsSync(pendingFile))throw new Error('R62 Pending-Datei fehlt. Zuerst --prepare ausführen.');
      const pending=read(pendingFile);if(!verifyAuthDrillRecord(pending,secret)||pending.status!=='PENDING')throw new Error('R62 Pending-Datei ist manipuliert oder ungültig.');
      const age=Date.now()-Date.parse(pending.started_at||'');if(!Number.isFinite(age)||age<0||age>4*60*60*1000)throw new Error('R62 Drill-Fenster ist abgelaufen. Bitte neu vorbereiten.');
      const rows=(await db.query(`SELECT event_type,created_at FROM creator_security_events WHERE creator_id=$1 AND created_at >= $2::timestamptz ORDER BY created_at ASC`,[pending.creator_id,pending.started_at])).rows;
      const c=requiredEventCounts(rows),current=Number((await db.query(`SELECT COUNT(*)::int AS count FROM creator_webauthn_credentials WHERE creator_id=$1`,[pending.creator_id])).rows[0]?.count||0);
      const checks={passkey_login:(c.login_success_passkey||0)>=1,passkey_stepup:(c.account_elevation_passkey_granted||0)>=1,totp_login:(c.login_success_mfa||0)>=1,totp_stepup:(c.account_elevation_totp_granted||0)>=1,recovery_stepup:(c.account_elevation_recovery_granted||0)>=1&&Number(c.mfa_recovery_code_used||0)===1,temp_passkey_added:(c.passkey_added||0)>=1,temp_passkey_removed:(c.passkey_removed||0)>=1&&current===Number(pending.baseline_passkeys)};
      const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);if(failed.length)throw new Error(`Echte Production Security-Events fehlen: ${failed.join(', ')}`);
      const record=signAuthDrillRecord({schema:1,pass:'R62',status:'LIVE_AUTH_PASS',drill_id:pending.drill_id,verified_at:new Date().toISOString(),canonical_origin:target,rp_id:host,user_verification:'required',passkey_login_verified:true,passkey_stepup_verified:true,totp_login_verified:true,totp_stepup_verified:true,recovery_stepup_verified:true,temporary_passkey_removed:true,event_count:rows.length,event_types:Object.keys(c).sort(),account_reference_hash:pending.email_hash},secret);
      write(evidenceFile,record);fs.rmSync(pendingFile,{force:true});
      console.log('Account Auth Production Drill R62: LIVE_AUTH_PASS');console.log(`Evidence: ${path.relative(root,evidenceFile)}`);process.exit(0);
    }
  }finally{await db.end().catch(()=>{})}
}catch(error){fail(String(error?.message||error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'postgresql://[redacted]'));}
