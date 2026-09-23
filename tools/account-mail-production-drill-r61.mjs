import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {accountMailConfig,validateAccountMailConfig,sendAccountMail}=require('../lib/account-mail-security.js');
const {mailDrillCodeHash,signDrillRecord}=require('../lib/account-mail-drill-security.js');

const argv=process.argv.slice(2);
const root=path.resolve(argv[0]&&!argv[0].startsWith('--')?argv.shift():'.');
const has=n=>argv.includes(n);
const value=(n,f='')=>{const i=argv.indexOf(n);return i>=0?String(argv[i+1]??f):f};
const prepare=has('--prepare');
const verify=has('--verify');
const status=has('--status')||(!prepare&&!verify);
const reports=path.join(root,'reports');
const pendingFile=path.join(reports,'account-mail-drill-pending.json');
const evidenceFile=path.join(reports,'account-mail-drill-evidence.json');
const env=process.env;
const cfg=accountMailConfig(env,'production');
const recipient=value('--to',env.CFS_MAIL_DRILL_RECIPIENT||'').trim().toLowerCase();
const categories=['email_verification','password_reset','security_alert'];
function fail(message,code=2){console.error(`Account Mail Production Drill R61: FAIL · ${message}`);process.exit(code)}
function safeJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function write(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600})}
function emailOk(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254}
function code(){return crypto.randomBytes(6).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8).padEnd(8,'X')}
function sha256(v){return crypto.createHash('sha256').update(String(v)).digest('hex')}
try{
  validateAccountMailConfig(cfg);
  if(cfg.mode!=='webhook'||!cfg.enabled)throw new Error('Account-Mail muss in Production im webhook-Modus vollständig konfiguriert sein.');
  const relayHost=new URL(cfg.webhookUrl).hostname.toLowerCase();
  if(status){
    const pending=fs.existsSync(pendingFile)?safeJson(pendingFile):null;
    const evidence=fs.existsSync(evidenceFile)?safeJson(evidenceFile):null;
    console.log(JSON.stringify({pending:pending?{drill_id:pending.drill_id,started_at:pending.started_at,recipient_hash:pending.recipient_hash,categories:pending.categories}:null,evidence:evidence?{status:evidence.status,verified_at:evidence.verified_at,drill_id:evidence.drill_id}:null},null,2));
    process.exit(0);
  }
  if(prepare){
    if(!emailOk(recipient))throw new Error('Für --prepare ist eine gültige Test-E-Mail via --to oder CFS_MAIL_DRILL_RECIPIENT erforderlich.');
    const drillId=crypto.randomUUID(),startedAt=new Date().toISOString(),rows=[];
    for(const category of categories){
      const challenge=code();
      const subject=`[CFS R61] ${category} · ${drillId.slice(0,8)}`;
      const text=[`CFS ZOCKT Production Mail Drill R61`,`Kategorie: ${category}`,`Drill: ${drillId}`,`Bestätigungscode: ${challenge}`,'','Diesen Code nur im lokalen R61-Runner eingeben.'].join('\n');
      await sendAccountMail(cfg,{kind:`production_drill_${category}`,to:recipient,subject,text});
      rows.push({category,code_hash:mailDrillCodeHash(cfg.webhookSecret,drillId,category,challenge)});
    }
    write(pendingFile,{schema:1,pass:'R61',drill_id:drillId,started_at:startedAt,relay_host:relayHost,recipient_hash:sha256(recipient),categories:[...categories],challenges:rows});
    console.log(`Account Mail Production Drill R61: PREPARED · ${categories.length} signierte Testmails wurden an das Testpostfach übergeben.`);
    console.log(`Pending: ${path.relative(root,pendingFile)}`);
    process.exit(0);
  }
  if(verify){
    if(!fs.existsSync(pendingFile))throw new Error('R61 Pending-Datei fehlt. Zuerst --prepare ausführen.');
    const pending=safeJson(pendingFile),age=Date.now()-Date.parse(pending.started_at||'');
    if(!Number.isFinite(age)||age<0||age>60*60*1000)throw new Error('R61 Mail-Drill ist abgelaufen. Bitte neu vorbereiten.');
    const supplied=value('--codes',env.CFS_MAIL_DRILL_CODES||'').split(',').map(v=>v.trim().toUpperCase()).filter(Boolean);
    if(supplied.length!==categories.length)throw new Error(`Es werden exakt ${categories.length} Inbox-Codes benötigt, Reihenfolge: ${categories.join(', ')}.`);
    for(let i=0;i<categories.length;i++){
      const row=pending.challenges?.find(r=>r.category===categories[i]);
      const actual=mailDrillCodeHash(cfg.webhookSecret,pending.drill_id,categories[i],supplied[i]);
      if(!row||!crypto.timingSafeEqual(Buffer.from(String(row.code_hash||''),'hex'),Buffer.from(actual,'hex')))throw new Error(`Inbox-Code für ${categories[i]} ist ungültig.`);
    }
    const record=signDrillRecord({schema:1,pass:'R61',status:'LIVE_MAIL_PASS',drill_id:pending.drill_id,verified_at:new Date().toISOString(),relay_host:relayHost,categories:[...categories],inbox_confirmation:true,webhook_hmac:true,recipient_hash:pending.recipient_hash,delivery_count:categories.length},cfg.webhookSecret);
    write(evidenceFile,record);fs.rmSync(pendingFile,{force:true});
    console.log('Account Mail Production Drill R61: LIVE_MAIL_PASS');
    console.log(`Evidence: ${path.relative(root,evidenceFile)}`);
    process.exit(0);
  }
}catch(error){fail(String(error?.message||error));}
