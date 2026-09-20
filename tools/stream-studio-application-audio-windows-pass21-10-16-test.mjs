import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const require=createRequire(import.meta.url);
const audioApi=require(path.join(root,'launcher/src/application-audio-source-manager.js'));

const managerText=read('launcher/src/application-audio-source-manager.js');
const engineText=read('launcher/src/stream-engine.js');
const main=read('launcher/main.js');
const preload=read('launcher/preload.js');
const rendererHtml=read('launcher/renderer/index.html');
const rendererJs=read('launcher/renderer/app.js');
const buildCmd=read('launcher/native/audio-loopback/build.cmd');
const helperReadme=read('launcher/native/audio-loopback/README.md');
const acceptance=read('launcher/tools/application-audio-windows-acceptance.mjs');
const rootPkg=JSON.parse(read('package.json'));
const launcherPkg=JSON.parse(read('launcher/package.json'));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
const detail=read('STREAM_STUDIO_APPLICATION_AUDIO_WINDOWS_PASS21_10_16.md');

let pass=0,fail=0;
function check(name,fn){try{awaitMaybe(fn);pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
function awaitMaybe(fn){const value=fn();if(value&&typeof value.then==='function')throw new Error('async check must use checkAsync')}
async function checkAsync(name,fn){try{await fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
function yes(name,value){check(name,()=>assert.equal(Boolean(value),true))}

check('Windows build parser reads Windows 11 build',()=>assert.equal(audioApi.parseWindowsBuild('10.0.22631'),22631));
check('Windows build parser reads Server-style build',()=>assert.equal(audioApi.parseWindowsBuild('10.0.20348'),20348));
check('Windows build parser rejects incomplete release',()=>assert.equal(audioApi.parseWindowsBuild('10.0'),0));
check('Minimum Windows process-loopback build is 20348',()=>assert.equal(audioApi.MIN_WINDOWS_BUILD,20348));
check('Helper protocol constant is stable',()=>assert.equal(audioApi.PROCESS_LOOPBACK_PROTOCOL,'CFS_AUDIO_LOOPBACK_V1'));

const fakeFs={existsSync:()=>true};
const oldManager=new audioApi.ApplicationAudioSourceManager({platform:'win32',env:{CFS_AUDIO_LOOPBACK_PATH:'C:\\cfs-audio-loopback.exe'},fsImpl:fakeFs,osRelease:'10.0.19045'});
const oldProbe=oldManager.probe();
check('Unsupported Windows build is rejected',()=>assert.equal(oldProbe.available,false));
check('Old-build probe still reports staged helper',()=>assert.equal(oldProbe.staged,true));
yes('Old-build error names minimum build',String(oldProbe.error).includes('20348'));

function fakeChild(stdoutText='',stderrText='',code=0){
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{child.killed=true};
  queueMicrotask(()=>{if(stdoutText)child.stdout.emit('data',Buffer.from(stdoutText));if(stderrText)child.stderr.emit('data',Buffer.from(stderrText));child.emit('close',code)});
  return child;
}
let successArgs=[];
const successManager=new audioApi.ApplicationAudioSourceManager({platform:'win32',env:{CFS_AUDIO_LOOPBACK_PATH:'C:\\cfs-audio-loopback.exe'},fsImpl:fakeFs,osRelease:'10.0.22631',spawnFn:(_file,args)=>{successArgs=args;return fakeChild('CFS_AUDIO_LOOPBACK_V1\r\n','',0)}});
await checkAsync('Runtime probe succeeds on expected protocol',async()=>{const result=await successManager.probeRuntime({timeoutMs:1000});assert.equal(result.runtimeVerified,true);assert.equal(result.available,true);assert.equal(result.protocol,'CFS_AUDIO_LOOPBACK_V1')});
check('Runtime probe invokes --probe only',()=>assert.deepEqual(successArgs,['--probe']));
check('Successful manager snapshot retains verification',()=>assert.equal(successManager.snapshot().runtimeVerified,true));
await checkAsync('Doctor returns PASS after runtime verification',async()=>{const result=await successManager.doctor({timeoutMs:1000});assert.equal(result.ok,true);assert.equal(result.checks.every(row=>row.ok),true)});

const malformedManager=new audioApi.ApplicationAudioSourceManager({platform:'win32',env:{CFS_AUDIO_LOOPBACK_PATH:'C:\\cfs-audio-loopback.exe'},fsImpl:fakeFs,osRelease:'10.0.22631',spawnFn:()=>fakeChild('WRONG_PROTOCOL\n','',0)});
await checkAsync('Unexpected helper protocol is rejected',async()=>{const result=await malformedManager.probeRuntime({timeoutMs:1000});assert.equal(result.runtimeVerified,false);assert.equal(result.available,false);assert.match(result.error,/Probe fehlgeschlagen/)});
const failedManager=new audioApi.ApplicationAudioSourceManager({platform:'win32',env:{CFS_AUDIO_LOOPBACK_PATH:'C:\\cfs-audio-loopback.exe'},fsImpl:fakeFs,osRelease:'10.0.22631',spawnFn:()=>fakeChild('','activation error',7)});
await checkAsync('Non-zero helper probe exit is rejected',async()=>{const result=await failedManager.probeRuntime({timeoutMs:1000});assert.equal(result.runtimeVerified,false);assert.match(result.error,/Code 7/)});
const nonWin=new audioApi.ApplicationAudioSourceManager({platform:'linux',env:{},fsImpl:fakeFs,osRelease:'6.0.0'});
check('Non-Windows runtime is rejected without spawning helper',()=>assert.equal(nonWin.probe().available,false));

// Launcher runtime integration.
yes('StreamEngine probe performs runtime helper verification',engineText.includes('probeRuntime?await this.applicationAudioSourceManager.probeRuntime()'));
yes('StreamEngine start re-verifies helper before app audio',engineText.includes('const appProbe=this.applicationAudioSourceManager.probeRuntime?await this.applicationAudioSourceManager.probeRuntime()'));
yes('StreamEngine refuses unverified helper state',engineText.includes('appProbe.runtimeVerified===false'));
yes('Launcher preflight uses runtime application-audio probe',main.includes('applicationAudioSourceManager?.probeRuntime?await applicationAudioSourceManager.probeRuntime()'));
yes('Launcher exposes application audio doctor function',main.includes('async function applicationAudioDoctor()'));
yes('Launcher exposes application audio doctor IPC',main.includes('launcher:application-audio-doctor'));
yes('Preload exposes application audio doctor API',preload.includes('probeApplicationAudio'));
yes('Launcher UI exposes WASAPI helper test button',rendererHtml.includes('id="probeApplicationAudio"'));
yes('Renderer distinguishes runtimeVerified from staged',rendererJs.includes('appAudio.runtimeVerified===true'));
yes('Renderer shows HELPER PRÜFEN state',rendererJs.includes('HELPER PRÜFEN'));
yes('Renderer invokes application audio doctor',rendererJs.includes('window.CFSLauncher.probeApplicationAudio()'));
yes('Updated stream notice says helper is runtime-verified before use',rendererHtml.includes('Process-Loopback-Helper wird vor Nutzung runtime-verifiziert'));

// Build and packaging hardening.
yes('Build script can discover Visual Studio with vswhere',buildCmd.toLowerCase().includes('vswhere.exe'));
yes('Build script requires VC x64 tools component',buildCmd.includes('Microsoft.VisualStudio.Component.VC.Tools.x86.x64'));
yes('Build script loads vcvars64 when cl is not already available',buildCmd.toLowerCase().includes('vcvars64.bat'));
yes('Build script performs helper self-probe',buildCmd.includes('--probe')&&buildCmd.includes('CFS_AUDIO_LOOPBACK_V1'));
yes('Build script generates SHA-256 evidence',buildCmd.includes('Get-FileHash')&&buildCmd.toLowerCase().includes('sha256'));
yes('Build script enables Control Flow Guard',buildCmd.includes('/guard:cf'));
yes('Build script enables ASLR/DEP-compatible linker flags',buildCmd.includes('/DYNAMICBASE')&&buildCmd.includes('/NXCOMPAT'));
yes('Helper readme documents Windows build 20348',helperReadme.includes('20348'));
yes('Helper readme documents automatic vswhere discovery',helperReadme.toLowerCase().includes('vswhere.exe'));
yes('Helper readme documents runtime protocol',helperReadme.includes('CFS_AUDIO_LOOPBACK_V1'));
yes('Launcher dist:win builds audio helper before electron-builder',launcherPkg.scripts['dist:win'].indexOf('npm run audio-helper:build')>=0&&launcherPkg.scripts['dist:win'].indexOf('npm run audio-helper:build')<launcherPkg.scripts['dist:win'].indexOf('electron-builder'));
yes('Launcher portable build builds audio helper before electron-builder',launcherPkg.scripts['dist:portable'].indexOf('npm run audio-helper:build')>=0&&launcherPkg.scripts['dist:portable'].indexOf('npm run audio-helper:build')<launcherPkg.scripts['dist:portable'].indexOf('electron-builder'));
yes('Launcher release build builds audio helper before packaging',launcherPkg.scripts['release:win'].indexOf('npm run audio-helper:build')>=0&&launcherPkg.scripts['release:win'].indexOf('npm run audio-helper:build')<launcherPkg.scripts['release:win'].indexOf('electron-builder'));
yes('Launcher exposes audio helper doctor command',launcherPkg.scripts['audio-helper:doctor']?.includes('application-audio-windows-acceptance.mjs'));
yes('Launcher exposes real audio acceptance command',launcherPkg.scripts['audio-helper:acceptance']?.includes('application-audio-windows-acceptance.mjs'));
yes('Root exposes helper build convenience command',rootPkg.scripts['audio-helper:build']?.includes('--prefix launcher'));
yes('Root exposes helper doctor convenience command',rootPkg.scripts['audio-helper:doctor']?.includes('--prefix launcher'));
yes('Root exposes helper acceptance convenience command',rootPkg.scripts['audio-helper:acceptance']?.includes('--prefix launcher'));

// Windows evidence tool.
yes('Acceptance tool checks Windows build from os.release',acceptance.includes('parseWindowsBuild(os.release())'));
yes('Acceptance tool runs manager doctor first',acceptance.includes('await manager.doctor'));
yes('Acceptance tool accepts explicit PID',acceptance.includes("argValue('--pid'"));
yes('Acceptance tool bounds capture duration',acceptance.includes("argValue('--seconds'"));
yes('Acceptance tool launches include-tree process capture',acceptance.includes("'--include-tree'"));
yes('Acceptance tool counts raw PCM bytes',acceptance.includes('bytes+=chunk.length'));
yes('Acceptance evidence does not serialize raw PCM',!acceptance.includes('writeFileSync(reportPath,chunk')&&!acceptance.includes('Captured.wav'));
yes('Acceptance evidence records no target PID value',acceptance.includes('targetProcessProvided:Boolean(pid)')&&!acceptance.includes('targetProcessId:pid'));
yes('Acceptance writes JSON evidence report',acceptance.includes('application-audio-windows-acceptance.json'));
yes('Acceptance marks real capture only when PCM bytes arrive',acceptance.includes('ok:bytes>0'));

// Pass docs/checklist/scripts.
yes('Root package registers pass 21.10.16 check',rootPkg.scripts['studio-audio-windows21:check']?.includes('pass21-10-16-test.mjs'));
yes('Combined Stream Studio check includes pass 21.10.16',rootPkg.scripts['stream-studio21:check']?.includes('studio-audio-windows21:check'));
yes('Master checklist retains pass 21.10.16 milestone',checklist.includes('## Pass 21.10.16 Update – Windows WASAPI Helper Acceptance & Packaging'));
yes('Checklist records false-ready prevention',checklist.includes('kein falsches „WASAPI BEREIT“'));
yes('Checklist keeps real Windows helper build open',checklist.includes('echtem Windows')&&checklist.includes('weiterhin offen'));
yes('Pass detail document exists',detail.includes('Pass 21.10.16'));
yes('Pass detail documents no captured audio payload in evidence',detail.includes('keine Audio-Payload'));
yes('Pass detail documents minimum Windows build',detail.includes('20348'));

console.log(`\nStream Studio Application Audio Windows Pass 21.10.16: ${pass}/${pass+fail} ${fail?'FAIL':'PASS'}`);
if(fail)process.exitCode=1;
