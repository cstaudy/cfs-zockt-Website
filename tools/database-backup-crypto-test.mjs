import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {decryptAndVerify,encryptDump} from './database-backup-lib.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-backup-crypto-'));
const plain=path.join(dir,'sample.dump'),cipher=path.join(dir,'sample.cfsbackup'),manifestFile=path.join(dir,'sample.manifest.json');
const secret=crypto.randomBytes(48).toString('hex');
let pass=0,fail=0; const check=(label,ok)=>{console.log(`${ok?'PASS':'FAIL'}  ${label}`);ok?pass++:fail++;};
try{
  const original=crypto.randomBytes(8192); fs.writeFileSync(plain,original,{mode:0o600});
  const manifest=await encryptDump({plainFile:plain,cipherFile:cipher,secret,source:{host:'db.example.invalid',port:5432,database:'cfs_test'},pgDumpVersion:'pg_dump test'});
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2));
  check('ciphertext differs from plaintext',!fs.readFileSync(cipher).equals(original));
  const verified=await decryptAndVerify({cipherFile:cipher,manifestFile,secret,tempDir:dir});
  check('decrypt roundtrip is byte-identical',fs.readFileSync(verified.tempFile).equals(original)); fs.rmSync(verified.tempFile,{force:true});
  check('manifest records plaintext and ciphertext hashes',/^[a-f0-9]{64}$/.test(manifest.plaintext_sha256)&&/^[a-f0-9]{64}$/.test(manifest.ciphertext_sha256));
  const wrongSecret=crypto.randomBytes(48).toString('hex'); let wrongRejected=false;
  try{const x=await decryptAndVerify({cipherFile:cipher,manifestFile,secret:wrongSecret,tempDir:dir});fs.rmSync(x.tempFile,{force:true});}catch{wrongRejected=true;}
  check('wrong backup key is rejected',wrongRejected);
  const tampered={...manifest,plaintext_bytes:manifest.plaintext_bytes+1}; fs.writeFileSync(manifestFile,JSON.stringify(tampered)); let metaRejected=false;
  try{const x=await decryptAndVerify({cipherFile:cipher,manifestFile,secret,tempDir:dir});fs.rmSync(x.tempFile,{force:true});}catch{metaRejected=true;}
  check('tampered manifest is rejected',metaRejected);
  fs.writeFileSync(manifestFile,JSON.stringify(manifest)); const buf=fs.readFileSync(cipher); buf[Math.floor(buf.length/2)]^=1; fs.writeFileSync(cipher,buf); let cipherRejected=false;
  try{const x=await decryptAndVerify({cipherFile:cipher,manifestFile,secret,tempDir:dir});fs.rmSync(x.tempFile,{force:true});}catch{cipherRejected=true;}
  check('tampered ciphertext is rejected',cipherRejected);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(`\nDatabase Backup Crypto Test: ${pass}/${pass+fail}`); if(fail)process.exit(1);
