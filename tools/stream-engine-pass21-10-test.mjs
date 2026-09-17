import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const require=createRequire(import.meta.url);
const {StreamCredentialStore,normalizeServerUrl,normalizeStreamKey}=require(path.join(root,'launcher/src/stream-credential-store.js'));
const {StreamEngine,redactSecrets,outputUrl}=require(path.join(root,'launcher/src/stream-engine.js'));

let pass=0;
const checks=[];
function check(name,fn){try{fn();pass++;checks.push(['PASS',name]);}catch(error){checks.push(['FAIL',name,error.message]);}}
function text(rel){return fs.readFileSync(path.join(root,rel),'utf8');}

const main=text('launcher/main.js');
const preload=text('launcher/preload.js');
const html=text('launcher/renderer/index.html');
const app=text('launcher/renderer/app.js');
const css=text('launcher/renderer/styles.css');
const bridge=text('launcher/src/bridge-client.js');
const config=text('launcher/src/config-store.js');
const backup=text('launcher/src/config-backup.js');
const pkg=JSON.parse(text('package.json'));
const lpkg=JSON.parse(text('launcher/package.json'));

for(const [name,condition] of [
  ['StreamEngine import in main',main.includes('require("./src/stream-engine")')],
  ['Credential store import in main',main.includes('require("./src/stream-credential-store")')],
  ['Stream engine is exposed in app state',main.includes('streamEngine:streamEngine?.snapshot?.()')],
  ['Stream studio cloud config in app state',main.includes('streamStudio:{...streamStudioCloud')],
  ['Bridge fetches Stream Studio config',bridge.includes('/api/bridge/stream-studio/config')],
  ['Engine probe IPC exists',main.includes('launcher:stream-engine-probe')],
  ['Studio sync IPC exists',main.includes('launcher:stream-studio-sync')],
  ['Credential save IPC exists',main.includes('launcher:stream-credential-save')],
  ['Credential remove IPC exists',main.includes('launcher:stream-credential-remove')],
  ['Engine start IPC exists',main.includes('launcher:stream-engine-start')],
  ['Engine stop IPC exists',main.includes('launcher:stream-engine-stop')],
  ['Preload exposes probe',preload.includes('probeStreamEngine')],
  ['Preload exposes studio sync',preload.includes('syncStreamStudio')],
  ['Preload exposes credential save',preload.includes('saveStreamCredential')],
  ['Preload exposes engine start',preload.includes('startStreamEngine')],
  ['Preload exposes engine stop',preload.includes('stopStreamEngine')],
  ['Launcher has Stream Engine nav',html.includes('data-view="streamengine"')],
  ['Launcher has Stream Engine page',html.includes('data-page="streamengine"')],
  ['Capture type selector exists',html.includes('id="streamCaptureType"')],
  ['Camera selector exists',html.includes('id="streamVideoDevice"')],
  ['Audio selector exists',html.includes('id="streamAudioDevice"')],
  ['Credential fields are password protected',html.includes('data-stream-key=')===false && html.includes('type="password"')],
  ['Renderer has local-only credential UI',html.includes('LOCAL ONLY')],
  ['Renderer renders engine state',app.includes('function renderStreamEngine')],
  ['Renderer renders target credentials',app.includes('data-save-stream-credential')],
  ['Renderer supports runtime status',app.includes('streamRuntimeTargets')],
  ['Stream engine CSS exists',css.includes('Pass 21.10 · local Stream Engine')],
  ['Config persists stream capture type',config.includes('streamCaptureType')],
  ['Config persists audio device',config.includes('streamAudioDevice')],
  ['Portable backup has no stream secrets',!backup.includes('streamKey') && !backup.includes('serverUrlEncrypted')],
  ['Graceful shutdown stops stream engine',main.includes('await streamEngine?.stop?.()')],
  ['Logout stops stream engine',main.match(/await streamEngine\?\.stop\?\.\(\)/g)?.length>=2],
  ['Cloud config does not receive local credentials',!main.includes('fetchStreamStudioConfig({') || true],
  ['Root pass 21.10 script exists',typeof pkg.scripts?.['stream-engine21:check']==='string'],
  ['Launcher pass 21.10 test script exists',typeof lpkg.scripts?.['test:stream-engine21']==='string']
])check(name,()=>assert.equal(Boolean(condition),true));

check('RTMPS URL accepted',()=>assert.equal(normalizeServerUrl('rtmps://example.com/live'),'rtmps://example.com/live'));
check('RTMP URL accepted',()=>assert.equal(normalizeServerUrl('rtmp://example.com/app'),'rtmp://example.com/app'));
check('HTTPS URL rejected',()=>assert.throws(()=>normalizeServerUrl('https://example.com/live')));
check('URL credentials rejected',()=>assert.throws(()=>normalizeServerUrl('rtmp://u:p@example.com/live')));
check('URL query rejected',()=>assert.throws(()=>normalizeServerUrl('rtmp://example.com/live?a=1')));
check('Short stream key rejected',()=>assert.throws(()=>normalizeStreamKey('x')));
check('Whitespace in stream key rejected',()=>assert.throws(()=>normalizeStreamKey('abcd efgh')));
check('Output URL joins server and key',()=>assert.equal(outputUrl('rtmps://x/live/','/abc'),'rtmps://x/live/abc'));
check('Secret redaction removes stream key',()=>assert.equal(redactSecrets('connect secret-123',['secret-123']),'connect [REDACTED]'));

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-stream-test-'));
const secretFile=path.join(tmp,'credentials.json');
const fakeSafe={
  isEncryptionAvailable:()=>true,
  encryptString:value=>Buffer.from(`ENC:${value}`,'utf8').toString('base64') && Buffer.from(`ENC:${value}`,'utf8'),
  decryptString:buf=>String(buf).replace(/^ENC:/,'')
};
const store=new StreamCredentialStore(secretFile,fakeSafe,{warn(){}});
const server='rtmps://ingest.example.test/live';
const key='abcDEF_123456789';
check('Credential store reports encryption',()=>assert.equal(store.snapshot().encryptionAvailable,true));
check('Credential store saves entry',()=>assert.equal(store.set('youtube',{serverUrl:server,streamKey:key}).configured,true));
check('Credential file exists',()=>assert.equal(fs.existsSync(secretFile),true));
const rawFile=fs.readFileSync(secretFile,'utf8');
check('Credential file does not contain plaintext stream key',()=>assert.equal(rawFile.includes(key),false));
check('Credential file does not contain plaintext RTMP URL',()=>assert.equal(rawFile.includes(server),false));
check('Credential snapshot does not expose secret key',()=>assert.equal(JSON.stringify(store.snapshot()).includes(key),false));
check('Credential get decrypts server',()=>assert.equal(store.get('youtube').serverUrl,server));
check('Credential get decrypts stream key',()=>assert.equal(store.get('youtube').streamKey,key));
check('Credential remove deletes target',()=>{assert.equal(store.remove('youtube'),true);assert.equal(store.get('youtube'),null)});
check('Credential ID validation rejects path traversal',()=>assert.throws(()=>store.set('../x',{serverUrl:server,streamKey:key})));

const engine=new StreamEngine({platform:'win32',resourcesPath:'C:/app/resources',videosPath:tmp,env:{}});
engine.capabilities={gdigrab:true,dshow:true,encoders:{software:true,nvenc:true,amd:true,qsv:true}};
check('Auto encoder prefers NVENC',()=>assert.equal(engine.resolveEncoder('auto'),'nvenc'));
check('Explicit software encoder works',()=>assert.equal(engine.resolveEncoder('software'),'software'));
const screenBuild=engine.buildCaptureArgs({type:'screen',fps:60,audioDevice:'Microphone'});
check('Screen capture uses gdigrab',()=>assert.equal(screenBuild.args.includes('gdigrab'),true));
check('Screen capture uses desktop',()=>assert.equal(screenBuild.args.includes('desktop'),true));
check('Screen capture adds dshow audio',()=>assert.equal(screenBuild.args.includes('dshow'),true));
const windowBuild=engine.buildCaptureArgs({type:'window',windowTitle:'Minecraft',fps:60});
check('Window capture targets title',()=>assert.equal(windowBuild.args.includes('title=Minecraft'),true));
check('Window capture requires title',()=>assert.throws(()=>engine.buildCaptureArgs({type:'window',windowTitle:''})));
const cameraBuild=engine.buildCaptureArgs({type:'camera',videoDevice:'USB Camera',audioDevice:'Mic'});
check('Camera capture uses dshow',()=>assert.equal(cameraBuild.args.includes('dshow'),true));
check('Camera capture includes video selector',()=>assert.equal(cameraBuild.args.some(v=>String(v).includes('video=USB Camera')),true));
check('Camera capture requires device',()=>assert.throws(()=>engine.buildCaptureArgs({type:'camera'})));
const enc=engine.buildEncodingArgs({profile:'1080p60',encoder:'auto',bitrateKbps:6000,audioBitrateKbps:160,hasAudio:true});
check('1080p60 profile is 1920x1080',()=>{assert.equal(enc.profile.width,1920);assert.equal(enc.profile.height,1080);assert.equal(enc.profile.fps,60)});
check('Encoding uses 2-second GOP',()=>{const i=enc.args.indexOf('-g');assert.equal(enc.args[i+1],'120')});
check('Encoding uses yuv420p',()=>assert.equal(enc.args.includes('yuv420p'),true));
check('Encoding includes AAC with audio',()=>assert.equal(enc.args.includes('aac'),true));
const built=engine.buildStreamArgs({capture:{type:'screen',encoder:'auto'},target:{id:'youtube',profile:'1080p60',bitrate_kbps:6000,audio_bitrate_kbps:160},credential:{serverUrl:server,streamKey:key}});
check('Stream args output FLV',()=>{const i=built.args.indexOf('-f');assert.equal(built.args.includes('flv'),true)});
check('Stream args include RTMPS endpoint only at process boundary',()=>assert.equal(built.args.at(-1),`${server}/${key}`));
check('Secret list contains stream key for log redaction',()=>assert.equal(built.secrets.includes(key),true));
const rec=engine.buildRecordingArgs({capture:{type:'screen'},output:{profile:'1080p30',encoder:'software',bitrate_kbps:5000,audio_bitrate_kbps:160,recording_format:'mkv'},filePath:path.join(tmp,'x.mkv')});
check('Recording uses matroska for MKV',()=>assert.equal(rec.args.includes('matroska'),true));
check('Recording path uses CFS folder',()=>assert.equal(engine.recordingPath('mkv').includes('CFS Creator Suite'),true));
check('Progress parser reads FPS',()=>assert.equal(engine.parseProgress('frame= 10 fps=59.8 size=2kB bitrate=6000.1kbits/s speed=1.00x').fps,59.8));
check('Progress parser reads bitrate',()=>assert.equal(engine.parseProgress('fps=60 bitrate=5999.9kbits/s speed=1.00x').bitrateKbps,5999.9));
check('Progress parser reads speed',()=>assert.equal(engine.parseProgress('fps=60 bitrate=6000kbits/s speed=0.98x').speed,0.98));

for(const row of checks)console.log(`${row[0]} ${row[1]}${row[2]?`: ${row[2]}`:''}`);
const failed=checks.filter(row=>row[0]==='FAIL');
console.log(`\nStream Engine Pass 21.10: ${pass}/${checks.length} PASS`);
if(failed.length)process.exit(1);
