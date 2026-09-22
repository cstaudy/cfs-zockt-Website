import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {spawnSync} from 'node:child_process';

export const BACKUP_SCHEMA=1;
export const BACKUP_MAGIC='cfs_zockt-postgres-backup';
export function requireSecret(value=process.env.CFS_BACKUP_ENCRYPTION_KEY){
  const secret=String(value||'');
  if(secret.length<32) throw new Error('CFS_BACKUP_ENCRYPTION_KEY muss mindestens 32 Zeichen lang sein.');
  return secret;
}
export function parseDatabaseUrl(value){
  const raw=String(value||'').trim();
  if(!raw) throw new Error('DATABASE_URL fehlt.');
  const url=new URL(raw);
  if(!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL muss postgres:// oder postgresql:// verwenden.');
  const db=decodeURIComponent(url.pathname.replace(/^\//,''));
  if(!db) throw new Error('DATABASE_URL enthält keinen Datenbanknamen.');
  return {url,host:url.hostname,port:url.port||'5432',database:db,user:decodeURIComponent(url.username||''),password:decodeURIComponent(url.password||'')};
}
export function pgEnvFromUrl(value){
  const p=parseDatabaseUrl(value);
  const env={...process.env,PGHOST:p.host,PGPORT:p.port,PGDATABASE:p.database};
  if(p.user) env.PGUSER=p.user;
  if(p.password) env.PGPASSWORD=p.password;
  const sslmode=p.url.searchParams.get('sslmode');
  if(sslmode) env.PGSSLMODE=sslmode;
  else if(/render\.com$/i.test(p.host)||/\.render\.com$/i.test(p.host)) env.PGSSLMODE='require';
  return {env,identity:`${p.host.toLowerCase()}:${p.port}/${p.database}`,source:{host:p.host,port:Number(p.port),database:p.database}};
}
export function commandVersion(command){
  const r=spawnSync(command,['--version'],{encoding:'utf8'});
  if(r.status!==0) return null;
  return String(r.stdout||r.stderr||'').trim();
}

export function assertCommand(command){
  const version=commandVersion(command);
  if(!version) throw new Error(`${command} ist nicht verfügbar. Installiere die PostgreSQL-Clienttools passend zur Server-Major-Version.`);
  return version;
}
export function canonicalJson(value){
  if(Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if(value&&typeof value==='object'){
    return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export function deriveKeys(secret,salt){
  const master=crypto.scryptSync(secret,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  const encKey=Buffer.from(crypto.hkdfSync('sha256',master,salt,Buffer.from('cfs_zockt backup encryption v1'),32));
  const macKey=Buffer.from(crypto.hkdfSync('sha256',master,salt,Buffer.from('cfs_zockt backup manifest hmac v1'),32));
  master.fill(0);
  return {encKey,macKey};
}
export async function hashFile(file){
  const hash=crypto.createHash('sha256');
  let bytes=0;
  await new Promise((resolve,reject)=>{
    const stream=fs.createReadStream(file);
    stream.on('data',chunk=>{bytes+=chunk.length;hash.update(chunk);});
    stream.on('end',resolve); stream.on('error',reject);
  });
  return {sha256:hash.digest('hex'),bytes};
}
export function manifestHmac(manifest,macKey){
  const body={...manifest}; delete body.manifest_hmac_sha256;
  return crypto.createHmac('sha256',macKey).update(canonicalJson(body)).digest('hex');
}

export function safeEqualHex(a,b){
  try{const aa=Buffer.from(String(a),'hex'),bb=Buffer.from(String(b),'hex'); return aa.length===bb.length&&aa.length>0&&crypto.timingSafeEqual(aa,bb);}catch{return false;}
}
export async function encryptDump({plainFile,cipherFile,secret,source,pgDumpVersion}){
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
  const {encKey,macKey}=deriveKeys(secret,salt);
  const plain=await hashFile(plainFile);
  const cipher=crypto.createCipheriv('aes-256-gcm',encKey,iv,{authTagLength:16});
  await pipeline(fs.createReadStream(plainFile),cipher,fs.createWriteStream(cipherFile,{mode:0o600}));
  const tag=cipher.getAuthTag();
  encKey.fill(0);
  const encrypted=await hashFile(cipherFile);
  const manifest={
    schema:BACKUP_SCHEMA,magic:BACKUP_MAGIC,created_at:new Date().toISOString(),
    archive_format:'postgres-custom',encryption:'aes-256-gcm',kdf:'scrypt-N32768-r8-p1+hkdf-sha256',
    salt_b64:salt.toString('base64'),iv_b64:iv.toString('base64'),auth_tag_b64:tag.toString('base64'),
    plaintext_sha256:plain.sha256,plaintext_bytes:plain.bytes,ciphertext_sha256:encrypted.sha256,ciphertext_bytes:encrypted.bytes,
    source,pg_dump_version:pgDumpVersion,archive_file:path.basename(cipherFile)
  };
  manifest.manifest_hmac_sha256=manifestHmac(manifest,macKey); macKey.fill(0);
  return manifest;
}
export function loadManifest(file){
  const m=JSON.parse(fs.readFileSync(file,'utf8'));
  if(m.schema!==BACKUP_SCHEMA||m.magic!==BACKUP_MAGIC) throw new Error('Unbekanntes Backup-Manifestformat.');
  return m;
}
export async function decryptAndVerify({cipherFile,manifestFile,secret,tempDir=os.tmpdir()}){
  const manifest=loadManifest(manifestFile);
  const salt=Buffer.from(manifest.salt_b64,'base64'),iv=Buffer.from(manifest.iv_b64,'base64'),tag=Buffer.from(manifest.auth_tag_b64,'base64');
  if(salt.length!==16||iv.length!==12||tag.length!==16) throw new Error('Backup-Metadaten sind ungültig.');
  const {encKey,macKey}=deriveKeys(secret,salt);
  const expectedHmac=manifestHmac(manifest,macKey); macKey.fill(0);
  if(!safeEqualHex(expectedHmac,manifest.manifest_hmac_sha256)) throw new Error('Manifest-HMAC ungültig: Metadaten wurden verändert oder der Schlüssel ist falsch.');
  const cipherHash=await hashFile(cipherFile);
  if(cipherHash.sha256!==manifest.ciphertext_sha256||cipherHash.bytes!==manifest.ciphertext_bytes) throw new Error('Ciphertext-Prüfsumme stimmt nicht.');
  const tmp=path.join(tempDir,`cfs-restore-${process.pid}-${crypto.randomBytes(8).toString('hex')}.dump`);
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',encKey,iv,{authTagLength:16}); decipher.setAuthTag(tag);
    await pipeline(fs.createReadStream(cipherFile),decipher,fs.createWriteStream(tmp,{mode:0o600}));
  }finally{encKey.fill(0);}
  const plain=await hashFile(tmp);
  if(plain.sha256!==manifest.plaintext_sha256||plain.bytes!==manifest.plaintext_bytes){fs.rmSync(tmp,{force:true});throw new Error('Entschlüsseltes Archiv stimmt nicht mit dem Manifest überein.');}
  return {manifest,tempFile:tmp};
}
export function timestampName(date=new Date()){
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
}

// R60: Manipulationssichtbare Recovery-Drill-Evidence. Derselbe Backup-Key wird
// domain-separiert abgeleitet; der Klartext-Key wird weder in Evidence noch Logs geschrieben.
function recoveryEvidenceKey(secretValue=process.env.CFS_BACKUP_ENCRYPTION_KEY){
  const secret=requireSecret(secretValue);
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(secret,'utf8'),
    Buffer.from('cfs_zockt recovery evidence salt v1','utf8'),
    Buffer.from('cfs_zockt recovery evidence hmac v1','utf8'),
    32
  ));
}
export function recoveryEvidenceHmac(evidence,secretValue=process.env.CFS_BACKUP_ENCRYPTION_KEY){
  const body={...evidence};
  delete body.evidence_hmac_sha256;
  const key=recoveryEvidenceKey(secretValue);
  try{return crypto.createHmac('sha256',key).update(canonicalJson(body)).digest('hex');}
  finally{key.fill(0);}
}
export function signRecoveryEvidence(evidence,secretValue=process.env.CFS_BACKUP_ENCRYPTION_KEY){
  const record={...evidence};
  delete record.evidence_hmac_sha256;
  record.evidence_hmac_sha256=recoveryEvidenceHmac(record,secretValue);
  return record;
}
export function verifyRecoveryEvidenceHmac(evidence,secretValue=process.env.CFS_BACKUP_ENCRYPTION_KEY){
  if(!evidence||typeof evidence!=='object') return false;
  const supplied=String(evidence.evidence_hmac_sha256||'');
  if(!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  try{return safeEqualHex(supplied,recoveryEvidenceHmac(evidence,secretValue));}
  catch{return false;}
}
