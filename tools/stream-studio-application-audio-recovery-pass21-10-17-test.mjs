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
const main=read('launcher/main.js');
const renderer=read('launcher/renderer/app.js');
const rendererHtml=read('launcher/renderer/index.html');
const soak=read('launcher/tools/application-audio-windows-soak.mjs');
const rootPkg=JSON.parse(read('package.json'));
const launcherPkg=JSON.parse(read('launcher/package.json'));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
const detail=read('STREAM_STUDIO_APPLICATION_AUDIO_RECOVERY_PASS21_10_17.md');
const keys=['game','discord','music','alerts'];

let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
async function checkAsync(name,fn){try{await fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
function yes(name,value){check(name,()=>assert.equal(Boolean(value),true))}

check('Recovery backoff begins at 500 ms',()=>assert.equal(audioApi.RECOVERY_DELAYS[0],500));
check('Recovery backoff caps at 10 s',()=>assert.equal(audioApi.RECOVERY_DELAYS.at(-1),10000));
check('Continuity starts after bounded no-PCM window',()=>assert.equal(audioApi.CONTINUITY_AFTER_MS,1200));
check('Continuity PCM chunk is 100 ms',()=>assert.equal(audioApi.CONTINUITY_CHUNK_MS,100));
check('Continuity chunk matches 48k stereo s16le',()=>assert.equal(audioApi.CONTINUITY_CHUNK_BYTES,19200));
check('Process names normalize .exe suffix',()=>assert.equal(audioApi.normalizeProcessName('Discord.exe'),'discord'));
check('Process rows normalize PowerShell field names',()=>assert.deepEqual(audioApi.normalizeProcessRows([{Id:42,ProcessName:'Game',MainWindowTitle:'Play'}]),[{id:42,name:'Game',title:'Play'}]));

function makeTimers(){
  const timeouts=[],intervals=[];
  const setTimeoutFn=(fn,ms)=>{const row={fn,ms,cleared:false,unref(){}};timeouts.push(row);return row};
  const clearTimeoutFn=row=>{if(row)row.cleared=true};
  const setIntervalFn=(fn,ms)=>{const row={fn,ms,cleared:false,unref(){}};intervals.push(row);return row};
  const clearIntervalFn=row=>{if(row)row.cleared=true};
  return{timeouts,intervals,setTimeoutFn,clearTimeoutFn,setIntervalFn,clearIntervalFn};
}
function fakeChild(){
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{child.killed=true};return child;
}
function fakeSink(){
  const sink=new EventEmitter();sink.chunks=[];sink.ended=false;sink.write=chunk=>{sink.chunks.push(Buffer.from(chunk));return true};sink.end=()=>{sink.ended=true};sink.off=sink.removeListener.bind(sink);return sink;
}

let now=100000;
let processRows=[{id:111,name:'Game',title:'Game Window'},{id:999,name:'explorer',title:''}];
const timers=makeTimers();
const children=[];const spawnArgs=[];
const manager=new audioApi.ApplicationAudioSourceManager({
  platform:'win32',
  env:{CFS_AUDIO_LOOPBACK_PATH:'C:\\cfs-audio-loopback.exe'},
  fsImpl:{existsSync:()=>true},
  osRelease:'10.0.22631',
  processResolver:async()=>processRows,
  spawnFn:(_file,args)=>{const child=fakeChild();children.push(child);spawnArgs.push(args);return child},
  nowFn:()=>now,
  setTimeoutFn:timers.setTimeoutFn,
  clearTimeoutFn:timers.clearTimeoutFn,
  setIntervalFn:timers.setIntervalFn,
  clearIntervalFn:timers.clearIntervalFn,
  monitorIntervalMs:500,
  continuityAfterMs:1200
});
manager.prepare([{key:'game',processId:111,processName:'Game',includeTree:true}]);
const sinkA=fakeSink(),sinkB=fakeSink();
const detachA=manager.attach('game',sinkA);const detachB=manager.attach('game',sinkB);
check('One helper is shared across multiple FFmpeg sinks',()=>assert.equal(children.length,1));
check('Initial helper targets configured PID',()=>assert.deepEqual(spawnArgs[0].slice(0,2),['--pid','111']));
children[0].stdout.emit('data',Buffer.from([1,2,3,4]));
check('Real PCM reaches first sink',()=>assert.equal(sinkA.chunks.at(-1).length,4));
check('Real PCM reaches second sink',()=>assert.equal(sinkB.chunks.at(-1).length,4));

children[0].emit('close',7);
check('Unexpected helper close schedules restart',()=>assert.equal(timers.timeouts.filter(row=>!row.cleared).at(-1).ms,500));
check('Unexpected helper close starts continuity',()=>assert.equal(manager.snapshot().sources[0].continuityActive,true));
const restart1=timers.timeouts.filter(row=>!row.cleared).at(-1);await restart1.fn();
check('Helper restart does not recreate FFmpeg sink',()=>assert.equal(sinkA.ended,false));
check('Helper restart launches second helper',()=>assert.equal(children.length,2));
check('Helper restart telemetry increments',()=>assert.equal(manager.snapshot().sources[0].helperRestarts,1));
children[1].stdout.emit('data',Buffer.from([5,6,7,8]));
check('PCM resumes through same sink after helper restart',()=>assert.deepEqual([...sinkA.chunks.at(-1)],[5,6,7,8]));

processRows=[{id:222,name:'Game.exe',title:'Game Window'},{id:999,name:'explorer',title:''}];
await manager.monitorTick();
check('Process restart rebinds source by normalized process name',()=>assert.equal(manager.snapshot().sources[0].processId,222));
check('Process rebind increments telemetry',()=>assert.equal(manager.snapshot().sources[0].processRebinds,1));
check('Process rebind launches helper on new PID',()=>assert.deepEqual(spawnArgs.at(-1).slice(0,2),['--pid','222']));

processRows=[{id:999,name:'explorer',title:''}];
await manager.monitorTick();
check('Missing application enters waiting state',()=>assert.equal(manager.snapshot().sources[0].waitingForProcess,true));
check('Missing application keeps continuity active',()=>assert.equal(manager.snapshot().sources[0].continuityActive,true));
const continuity=timers.intervals.filter(row=>row.ms===100&&!row.cleared).at(-1);
const beforeContinuity=sinkA.chunks.length;continuity.fn();
check('Continuity pump writes 100 ms silence frame',()=>assert.equal(sinkA.chunks.length,beforeContinuity+1));
check('Continuity telemetry counts injected bytes',()=>assert.equal(manager.snapshot().sources[0].continuityBytes,audioApi.CONTINUITY_CHUNK_BYTES));

processRows=[{id:333,name:'Game',title:'Returned'},{id:999,name:'explorer',title:''}];
await manager.monitorTick();
check('Returned application rebinds without rebuilding stream target',()=>assert.equal(manager.snapshot().sources[0].processId,333));
check('Returned application launches helper again',()=>assert.deepEqual(spawnArgs.at(-1).slice(0,2),['--pid','333']));
check('Second process rebind is counted',()=>assert.equal(manager.snapshot().sources[0].processRebinds,2));

const childAfterReturn=children.at(-1);childAfterReturn.stdout.emit('data',Buffer.from([9,10]));
check('Real PCM stops continuity after process returns',()=>assert.equal(manager.snapshot().sources[0].continuityActive,false));
check('Recovery total includes helper restart and process rebinds',()=>assert.equal(manager.snapshot().recovery.recoveries>=3,true));

processRows=[];
await manager.monitorTick();
check('Empty process snapshot is treated as enumeration failure, not mass process loss',()=>assert.equal(manager.snapshot().sources[0].waitingForProcess,false));

detachA();
check('Helper stays alive while one sink remains',()=>assert.equal(Boolean(manager.snapshot().sources[0].running),true));
detachB();
check('Final detach stops helper',()=>assert.equal(Boolean(manager.snapshot().sources[0].running),false));
manager.releaseAll();
check('Release clears all prepared sources',()=>assert.equal(manager.snapshot().prepared,0));
check('Release stops process monitor',()=>assert.equal(manager.snapshot().monitoring,false));

// Integration and acceptance tooling.
yes('Launcher injects process resolver into application-audio manager',main.includes('processResolver:listWindowsProcessCandidates'));
yes('Launcher broadcasts application-audio recovery events',main.includes('applicationAudioSourceManager.on("recovery"'));
yes('Renderer shows recovery count',renderer.includes('Recovery ${recoveryCount}'));
yes('Launcher notice documents PID rebind recovery',rendererHtml.includes('App-Neustarts werden per Prozessname auf neue PIDs rebunden'));
yes('Manager keeps FFmpeg pipes alive with local continuity PCM',managerText.includes('startContinuity(entry')&&managerText.includes('CONTINUITY_CHUNK'));
yes('Manager has bounded helper restart backoff',managerText.includes('RECOVERY_DELAYS'));
yes('Manager avoids teardown on empty process enumeration snapshot',managerText.includes('processSnapshotUsable'));
yes('Windows soak tool uses ApplicationAudioSourceManager',soak.includes('new ApplicationAudioSourceManager'));
yes('Windows soak tool supports all four application buses',soak.includes("const keys=['game','discord','music','alerts']")&&soak.includes('`--${key}-pid`'));
yes('Windows soak tool records helper PCM separately from continuity bytes',soak.includes('helperPcmBytes')&&soak.includes('continuityBytes'));
yes('Windows soak tool records recovery telemetry',soak.includes('processRebinds')&&soak.includes('helperRestarts'));
yes('Windows soak tool never persists raw audio',soak.includes('rawAudioPersisted:false')&&!soak.includes('writeFileSync(reportPath,chunk'));
yes('Launcher exposes audio recovery soak command',launcherPkg.scripts['audio-helper:soak']?.includes('application-audio-windows-soak.mjs'));
yes('Root exposes audio recovery soak command',rootPkg.scripts['audio-helper:soak']?.includes('--prefix launcher'));
yes('Root package registers pass 21.10.17 check',rootPkg.scripts['studio-audio-recovery21:check']?.includes('21-10-17'));
yes('Combined Stream Studio check includes pass 21.10.17',rootPkg.scripts['stream-studio21:check']?.includes('studio-audio-recovery21:check'));
yes('Master checklist retains pass 21.10.17 milestone',checklist.includes('Pass 21.10.17 Update – Application Audio Recovery & Soak Foundation'));
yes('Checklist records application restart recovery',checklist.includes('App-Neustart / PID-Rebind'));
yes('Checklist keeps real Windows soak open',checklist.includes('echter Windows Multi-Audio-Soak-Test'));
yes('Pass detail documentation exists',detail.includes('# Pass 21.10.17'));
yes('Pass detail documents FFmpeg targets stay alive during app recovery',detail.includes('FFmpeg-Ziele bleiben bestehen'));
yes('Pass detail documents no raw audio evidence',detail.includes('keine Audio-Payload'));

console.log(`\nStream Studio Application Audio Recovery Pass 21.10.17: ${pass}/${pass+fail} ${fail?'FAIL':'PASS'}`);
if(fail)process.exitCode=1;
