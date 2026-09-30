import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {StreamCredentialStore,normalizeServerUrl,normalizeStreamKey,MAX_TARGETS}=require('../src/stream-credential-store.js');

let passed=0,total=0;
function check(name,fn){total++;try{fn();passed++;console.log(`PASS ${name}`)}catch(error){console.error(`FAIL ${name}: ${error.message}`);process.exitCode=1}}
async function checkAsync(name,fn){total++;try{await fn();passed++;console.log(`PASS ${name}`)}catch(error){console.error(`FAIL ${name}: ${error.message}`);process.exitCode=1}}

function fakeSafeStorage(available=true){
  return {
    isEncryptionAvailable(){return available},
    encryptString(value){return Buffer.from(`cipher:${Buffer.from(String(value),'utf8').toString('base64')}`,'utf8')},
    decryptString(buffer){
      const raw=Buffer.from(buffer).toString('utf8');
      if(!raw.startsWith('cipher:'))throw new Error('bad ciphertext');
      return Buffer.from(raw.slice(7),'base64').toString('utf8');
    }
  };
}

check('RTMPS server accepted',()=>assert.equal(normalizeServerUrl('rtmps://live.example.test/app/'),'rtmps://live.example.test/app'));
check('RTMP server accepted',()=>assert.equal(normalizeServerUrl('rtmp://live.example.test/app'),'rtmp://live.example.test/app'));
check('HTTP server rejected',()=>assert.throws(()=>normalizeServerUrl('https://live.example.test/app'),/Nur RTMP oder RTMPS/));
check('credentials in server URL rejected',()=>assert.throws(()=>normalizeServerUrl('rtmps://user:pass@live.example.test/app'),/Benutzername\/Passwort/));
check('query in server URL rejected',()=>assert.throws(()=>normalizeServerUrl('rtmps://live.example.test/app?key=x'),/Query-Parameter/));
check('fragment in server URL rejected',()=>assert.throws(()=>normalizeServerUrl('rtmps://live.example.test/app#secret'),/Fragmente/));
check('stream key accepted',()=>assert.equal(normalizeStreamKey('abcd-1234_SAFE'),'abcd-1234_SAFE'));
check('stream key whitespace rejected',()=>assert.throws(()=>normalizeStreamKey('abc def'),/Leer- oder Steuerzeichen/));
check('short stream key rejected',()=>assert.throws(()=>normalizeStreamKey('abc'),/ungültige Länge/));

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-stream-credential-test-'));
const file=path.join(dir,'stream-targets.json');
const warnings=[];
const store=new StreamCredentialStore(file,fakeSafeStorage(true),{warn:(...args)=>warnings.push(args.join(' '))});
const server='rtmps://live.example.test/app';
const key='super-secret-stream-key-12345';

check('SafeStorage availability reported',()=>assert.equal(store.encryptionAvailable(),true));
check('set returns only public metadata',()=>{
  const entry=store.set('twitch',{serverUrl:server,streamKey:key});
  assert.equal(entry.id,'twitch');
  assert.equal(entry.configured,true);
  assert.equal(entry.server,'rtmps://live.example.test');
  assert.equal('streamKey' in entry,false);
  assert.equal('serverUrl' in entry,false);
});
check('credential file exists',()=>assert.equal(fs.existsSync(file),true));
check('credential file does not contain plaintext stream key',()=>assert.equal(fs.readFileSync(file,'utf8').includes(key),false));
check('credential file does not contain full plaintext server URL',()=>assert.equal(fs.readFileSync(file,'utf8').includes(server),false));
check('credential file contains no URL credentials',()=>assert.equal(/user:pass@/.test(fs.readFileSync(file,'utf8')),false));
check('credential file has restrictive mode where supported',()=>{
  if(process.platform==='win32')return;
  const mode=fs.statSync(file).mode & 0o777;
  assert.equal(mode,0o600);
});
check('atomic temp file is not left behind',()=>assert.equal(fs.existsSync(`${file}.tmp`),false));
check('get decrypts credential only on local request',()=>assert.deepEqual(store.get('twitch'),{id:'twitch',serverUrl:server,streamKey:key,updatedAt:store.get('twitch').updatedAt}));
check('public entry omits encrypted blobs and secrets',()=>{
  const entry=store.publicEntry('twitch');
  assert.deepEqual(Object.keys(entry).sort(),['configured','id','server','updatedAt'].sort());
  assert.equal(JSON.stringify(entry).includes(key),false);
});
check('snapshot omits secrets',()=>{
  const snapshot=store.snapshot(['twitch']);
  assert.equal(snapshot.encryptionAvailable,true);
  assert.equal(JSON.stringify(snapshot).includes(key),false);
  assert.equal(JSON.stringify(snapshot).includes(server),false);
  assert.equal(snapshot.targets.twitch.server,'rtmps://live.example.test');
});
check('invalid target ID rejected',()=>assert.throws(()=>store.set('../evil',{serverUrl:server,streamKey:key}),/Streaming-Ziel-ID/));
check('store fails closed without OS encryption',()=>{
  const unavailable=new StreamCredentialStore(path.join(dir,'unavailable.json'),fakeSafeStorage(false));
  assert.throws(()=>unavailable.set('twitch',{serverUrl:server,streamKey:key}),/Betriebssystem-Verschlüsselung/);
});
check('target count is bounded',()=>{
  const bounded=new StreamCredentialStore(path.join(dir,'bounded.json'),fakeSafeStorage(true));
  for(let i=0;i<MAX_TARGETS;i++)bounded.set(`target${i}`,{serverUrl:`rtmps://live${i}.example.test/app`,streamKey:`key-${i}-safe`});
  assert.throws(()=>bounded.set('overflow',{serverUrl:server,streamKey:key}),/Maximal/);
});
check('existing target can be updated at max capacity',()=>{
  const bounded=new StreamCredentialStore(path.join(dir,'bounded-update.json'),fakeSafeStorage(true));
  for(let i=0;i<MAX_TARGETS;i++)bounded.set(`target${i}`,{serverUrl:`rtmps://live${i}.example.test/app`,streamKey:`key-${i}-safe`});
  const result=bounded.set('target0',{serverUrl:'rtmps://replacement.example.test/app',streamKey:'replacement-safe-key'});
  assert.equal(result.configured,true);
});
check('remove deletes one target',()=>{
  assert.equal(store.remove('twitch'),true);
  assert.equal(store.get('twitch'),null);
  assert.equal(store.remove('twitch'),false);
});
check('clear removes all targets',()=>{
  store.set('youtube',{serverUrl:'rtmps://youtube.example.test/live2',streamKey:'youtube-safe-key'});
  store.set('custom',{serverUrl:'rtmp://custom.example.test/live',streamKey:'custom-safe-key'});
  store.clear();
  assert.deepEqual(store.snapshot().targets,{});
});
check('corrupt credential file fails closed to empty store',()=>{
  fs.writeFileSync(file,'not-json','utf8');
  assert.deepEqual(store.snapshot().targets,{});
});
check('decrypt failure returns null rather than leaking ciphertext',()=>{
  const brokenFile=path.join(dir,'broken.json');
  fs.writeFileSync(brokenFile,JSON.stringify({schema:1,targets:{twitch:{serverUrlEncrypted:'YmFk',streamKeyEncrypted:'YmFk',serverLabel:'rtmps://live.example.test',updatedAt:'x'}}}));
  const broken=new StreamCredentialStore(brokenFile,fakeSafeStorage(true),{warn:(...args)=>warnings.push(args.join(' '))});
  assert.equal(broken.get('twitch'),null);
});
check('decrypt warning contains no stream secret',()=>assert.equal(warnings.some(value=>value.includes(key)),false));

try{fs.rmSync(dir,{recursive:true,force:true})}catch{}
console.log(`\nStream Credential Store: ${passed}/${total}${process.exitCode?' FAIL':' PASS'}`);
if(process.exitCode)process.exit(1);
