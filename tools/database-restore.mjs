import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {assertCommand,decryptAndVerify,parseDatabaseUrl,pgEnvFromUrl,requireSecret} from './database-backup-lib.mjs';

const archive=process.argv.find(v=>v.endsWith('.cfsbackup'));
const targetArg=process.argv.find(v=>v.startsWith('--target-url='));
const execute=process.argv.includes('--execute');
if(!archive){console.error('Nutzung: npm run dbrestore:run -- backups/<datei>.cfsbackup --target-url=postgresql://... [--execute]');process.exit(2);}
const targetUrl=targetArg?targetArg.slice('--target-url='.length):String(process.env.CFS_RESTORE_TARGET_URL||'').trim();
if(!targetUrl){console.error('Ziel fehlt: --target-url=... oder CFS_RESTORE_TARGET_URL setzen.');process.exit(2);}
const cipherFile=path.resolve(archive),manifestFile=cipherFile.replace(/\.cfsbackup$/,'.manifest.json');
if(!fs.existsSync(cipherFile)||!fs.existsSync(manifestFile)){console.error('Backup oder Manifest fehlt.');process.exit(2);}
const secret=requireSecret(); assertCommand('pg_restore'); assertCommand('psql');
const target=pgEnvFromUrl(targetUrl),targetParsed=parseDatabaseUrl(targetUrl);
const current=process.env.DATABASE_URL?pgEnvFromUrl(process.env.DATABASE_URL):null;
let tempFile='';
try{
  const verified=await decryptAndVerify({cipherFile,manifestFile,secret,tempDir:os.tmpdir()}); tempFile=verified.tempFile;
  const sourceIdentity=`${String(verified.manifest.source.host).toLowerCase()}:${verified.manifest.source.port||5432}/${verified.manifest.source.database}`;
  if(target.identity===sourceIdentity) throw new Error('Restore in die im Backup vermerkte Quell-Datenbank ist gesperrt. Nutze eine separate Recovery-Datenbank.');
  if(current&&target.identity===current.identity) throw new Error('Restore in DATABASE_URL (laufende Primärdatenbank) ist gesperrt. Nutze eine separate Recovery-Datenbank.');
  const q="SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');";
  const check=spawnSync('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',q],{env:target.env,encoding:'utf8'});
  if(check.status!==0) throw new Error(`Zielprüfung fehlgeschlagen: ${String(check.stderr||'').trim()}`);
  const tables=Number(String(check.stdout||'').trim());
  if(!Number.isFinite(tables)||tables!==0) throw new Error(`Zieldatenbank ist nicht leer (${tables} Tabellen). Restore abgebrochen.`);
  console.log(`PASS Backup verifiziert`); console.log(`PASS separates leeres Ziel: ${targetParsed.host}/${targetParsed.database}`);
  if(!execute){console.log('DRY-RUN: kein Restore ausgeführt. Für den echten Restore zusätzlich --execute und CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE setzen.');process.exit(0);}
  if(process.env.CFS_RESTORE_CONFIRM!=='RESTORE_TO_EMPTY_DATABASE') throw new Error('CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE fehlt.');
  const r=spawnSync('pg_restore',['--exit-on-error','--no-owner','--no-privileges','--dbname',targetParsed.database,tempFile],{env:target.env,stdio:['ignore','inherit','inherit']});
  if(r.status!==0) throw new Error(`pg_restore fehlgeschlagen (Exit ${r.status}).`);
  const after=spawnSync('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',q],{env:target.env,encoding:'utf8'});
  if(after.status!==0) throw new Error(`Post-Restore-Prüfung fehlgeschlagen: ${String(after.stderr||'').trim()}`);
  const restoredTables=Number(String(after.stdout||'').trim());
  if(!Number.isFinite(restoredTables)||restoredTables<1) throw new Error('Restore abgeschlossen, aber es wurden keine Anwendungstabellen gefunden.');
  fs.mkdirSync(path.resolve('reports'),{recursive:true});
  fs.writeFileSync(path.resolve('reports','database-recovery-evidence.json'),JSON.stringify({schema:1,verified_at:new Date().toISOString(),backup_created_at:verified.manifest.created_at,backup_ciphertext_sha256:verified.manifest.ciphertext_sha256,source:{host:verified.manifest.source.host,database:verified.manifest.source.database},target:{host:targetParsed.host,database:targetParsed.database},restored_user_tables:restoredTables,mode:'separate-empty-target'},null,2)+'\n',{mode:0o600});
  console.log(`PASS Restore abgeschlossen (${restoredTables} Anwendungstabellen).`);
  console.log('PASS Recovery-Evidence geschrieben: reports/database-recovery-evidence.json');
  console.log('NÄCHSTER SCHRITT: Anwendung gegen die Recovery-Datenbank prüfen, bevor irgendein Umschalten erfolgt.');
}catch(error){console.error(`FAIL ${error.message}`);process.exitCode=1;}finally{if(tempFile)fs.rmSync(tempFile,{force:true});}
