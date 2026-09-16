import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {assertCommand,decryptAndVerify,requireSecret} from './database-backup-lib.mjs';

const archive=process.argv.find(v=>v.endsWith('.cfsbackup'));
if(!archive){console.error('Nutzung: npm run dbbackup:verify -- backups/<datei>.cfsbackup');process.exit(2);}
const cipherFile=path.resolve(archive);
const manifestFile=cipherFile.replace(/\.cfsbackup$/,'.manifest.json');
if(!fs.existsSync(cipherFile)||!fs.existsSync(manifestFile)){console.error('Backup oder zugehöriges Manifest fehlt.');process.exit(2);}
const secret=requireSecret(); assertCommand('pg_restore');
let tempFile='';
try{
  const verified=await decryptAndVerify({cipherFile,manifestFile,secret,tempDir:os.tmpdir()}); tempFile=verified.tempFile;
  const list=spawnSync('pg_restore',['--list',tempFile],{encoding:'utf8',maxBuffer:16*1024*1024});
  if(list.status!==0) throw new Error(`pg_restore --list fehlgeschlagen: ${String(list.stderr||'').trim()}`);
  const entries=String(list.stdout||'').split('\n').filter(line=>line&&!line.startsWith(';')).length;
  console.log(`PASS Backup kryptografisch verifiziert`);
  console.log(`PASS PostgreSQL-Archiv lesbar (${entries} TOC-Einträge)`);
  console.log(`Created: ${verified.manifest.created_at}`);
  console.log(`Source: ${verified.manifest.source.host}/${verified.manifest.source.database}`);
}catch(error){console.error(`FAIL ${error.message}`);process.exitCode=1;}finally{if(tempFile)fs.rmSync(tempFile,{force:true});}
