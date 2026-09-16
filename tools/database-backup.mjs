import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {assertCommand,encryptDump,pgEnvFromUrl,requireSecret,timestampName} from './database-backup-lib.mjs';

const outArg=process.argv.find(v=>v.startsWith('--out='));
const outDir=path.resolve(outArg?outArg.slice(6):'backups');
const databaseUrl=process.env.DATABASE_URL;
const secret=requireSecret();
const pgDumpVersion=assertCommand('pg_dump');
const {env,source}=pgEnvFromUrl(databaseUrl);
fs.mkdirSync(outDir,{recursive:true,mode:0o700});
const stamp=timestampName();
const base=`cfs-zockt-${stamp}-${crypto.randomBytes(4).toString('hex')}`;
const temp=path.join(os.tmpdir(),`${base}.dump`);
const cipherFile=path.join(outDir,`${base}.cfsbackup`);
const manifestFile=path.join(outDir,`${base}.manifest.json`);
try{
  console.log(`Backup: PostgreSQL Custom Format -> verschlüsseltes Archiv (${source.host}/${source.database})`);
  const r=spawnSync('pg_dump',['--format=custom','--no-owner','--no-privileges','--file',temp],{env,stdio:['ignore','inherit','inherit']});
  if(r.status!==0) throw new Error(`pg_dump fehlgeschlagen (Exit ${r.status}).`);
  const manifest=await encryptDump({plainFile:temp,cipherFile,secret,source,pgDumpVersion});
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
  console.log(`OK  ${cipherFile}`);
  console.log(`OK  ${manifestFile}`);
  console.log(`SHA256 (verschlüsselt): ${manifest.ciphertext_sha256}`);
  console.log('WICHTIG: Backup + Manifest gemeinsam und getrennt vom App-Server aufbewahren.');
}catch(error){
  fs.rmSync(cipherFile,{force:true}); fs.rmSync(manifestFile,{force:true});
  console.error(`Backup fehlgeschlagen: ${error.message}`); process.exitCode=1;
}finally{fs.rmSync(temp,{force:true});}
