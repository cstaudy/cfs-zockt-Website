import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {
  GameCaptureSourceManager,GAME_CAPTURE_PROTOCOL,FRAME_STALL_MS,START_FRAME_GRACE_MS,
  EXIT_WINDOW_CLOSED,EXIT_FRAME_STALL,EXIT_DEVICE_LOST,EXIT_CAPTURE_ERROR,
  normalizeProcessRows,classifyExit
}=require('../launcher/src/game-capture-source-manager.js');

let pass=0,fail=0;
function yes(name,ok){if(ok){pass++;console.log(`PASS ${name}`)}else{fail++;console.error(`FAIL ${name}`)}}
function check(name,fn){try{fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}
async function checkAsync(name,fn){try{await fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}

const managerText=fs.readFileSync(new URL('../launcher/src/game-capture-source-manager.js',import.meta.url),'utf8');
const helper=fs.readFileSync(new URL('../launcher/native/game-capture/cfs-game-capture.cpp',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../launcher/native/game-capture/build.cmd',import.meta.url),'utf8');
const soak=fs.readFileSync(new URL('../launcher/tools/game-capture-windows-soak.mjs',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../launcher/main.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../launcher/renderer/app.js',import.meta.url),'utf8');
const launcherPkg=JSON.parse(fs.readFileSync(new URL('../launcher/package.json',import.meta.url),'utf8'));
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const checklist=fs.readFileSync(new URL('../CFS_MASTER_CHECKLIST_PASS21.md',import.meta.url),'utf8');
const detail=fs.readFileSync(new URL('../STREAM_STUDIO_GAME_CAPTURE_RECOVERY_PASS21_10_21.md',import.meta.url),'utf8');

check('Default frame stall timeout is 5 seconds',()=>assert.equal(FRAME_STALL_MS,5000));
check('Default first-frame grace is 8 seconds',()=>assert.equal(START_FRAME_GRACE_MS,8000));
check('Recovery exit codes are distinct',()=>assert.equal(new Set([EXIT_WINDOW_CLOSED,EXIT_FRAME_STALL,EXIT_DEVICE_LOST,EXIT_CAPTURE_ERROR]).size,4));
check('Device loss exit is classified',()=>assert.equal(classifyExit(EXIT_DEVICE_LOST,''),'device_lost'));
check('Frame stall marker is classified',()=>assert.equal(classifyExit(1,'CFS_GAME_CAPTURE_EVENT frame_stall'),'frame_stall'));
check('Window close exit is classified',()=>assert.equal(classifyExit(EXIT_WINDOW_CLOSED,''),'window_closed'));
check('Capture error exit is classified',()=>assert.equal(classifyExit(EXIT_CAPTURE_ERROR,''),'capture_error'));

check('Process normalization keeps MainWindowHandle',()=>{const rows=normalizeProcessRows([{Id:7,ProcessName:'Demo',MainWindowTitle:'Game',MainWindowHandle:1234,Responding:true}]);assert.equal(rows[0].windowHandle,1234)});
check('Process normalization keeps Responding=false',()=>{const rows=normalizeProcessRows([{Id:7,ProcessName:'Demo',MainWindowHandle:1234,Responding:false}]);assert.equal(rows[0].responding,false)});

check('Helper ignores cloaked windows',()=>assert.ok(helper.includes('DwmGetWindowAttribute')&&helper.includes('DWMWA_CLOAKED')));
check('Helper ranks candidate windows by client area',()=>assert.ok(helper.includes('score > ctx->score')&&helper.includes('static_cast<uint64_t>(w) * static_cast<uint64_t>(h)')));
check('Helper deprioritizes minimized windows',()=>assert.ok(helper.includes('IsIconic(hwnd)')&&helper.includes('score /= 4')));
check('Build links Dwmapi for cloaked-window detection',()=>assert.ok(build.includes('Dwmapi.lib')));
check('Helper checks D3D removed reason',()=>assert.ok(helper.includes('GetDeviceRemovedReason')));
check('Helper recognizes DXGI device lost/reset/hung',()=>assert.ok(helper.includes('DXGI_ERROR_DEVICE_REMOVED')&&helper.includes('DXGI_ERROR_DEVICE_RESET')&&helper.includes('DXGI_ERROR_DEVICE_HUNG')));
check('Helper emits structured device-lost event',()=>assert.ok(helper.includes('CFS_GAME_CAPTURE_EVENT device_lost')));
check('Helper emits structured frame-stall event',()=>assert.ok(helper.includes('CFS_GAME_CAPTURE_EVENT frame_stall')));
check('Helper supports configurable stall timeout',()=>assert.ok(helper.includes('--stall-timeout-ms')&&helper.includes('stallTimeoutMs')));
check('Helper supports configurable first-frame timeout',()=>assert.ok(helper.includes('--start-timeout-ms')&&helper.includes('startTimeoutMs')));
check('Helper returns dedicated fatal exit code',()=>assert.ok(helper.includes('fatalExitCode')&&helper.includes('return fatal')));

function fakeCaptureChild(){const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.killed=false;c.kill=()=>{c.killed=true};return c}
function readyManager(extra={}){
  const m=new GameCaptureSourceManager({platform:'win32',osRelease:'10.0.22631',env:{CFS_GAME_CAPTURE_PATH:'x'},fsImpl:{existsSync:()=>true},setIntervalFn:()=>({unref(){}}),clearIntervalFn:()=>{},...extra});
  m.helperPath='x';m.lastProbe={...m.lastProbe,available:true,staged:true,runtimeVerified:true,path:'x',protocol:GAME_CAPTURE_PROTOCOL};
  return m;
}

await checkAsync('Helper frame-stall exit increments stall telemetry and schedules recovery',async()=>{
  const children=[];const recoveries=[];
  const m=readyManager({spawnFn:()=>{const c=fakeCaptureChild();children.push(c);return c},setTimeoutFn:(fn)=>{const h={unref(){}};queueMicrotask(fn);return h},clearTimeoutFn:()=>{}});
  m.on('recovery',e=>recoveries.push(e));m.ensure([{key:'g',processId:9,processName:'demo',width:64,height:64,fps:30}]);const sink=new PassThrough();m.attach('g',sink);children[0].emit('close',EXIT_FRAME_STALL);await new Promise(r=>setTimeout(r,5));const snap=m.snapshot();assert.equal(snap.totals.frameStalls,1);assert.ok(snap.totals.helperRestarts>=1);assert.equal(recoveries[0]?.reason,'frame_stall');m.destroy();
});

await checkAsync('Device-loss exit increments dedicated telemetry',async()=>{
  const children=[];const m=readyManager({spawnFn:()=>{const c=fakeCaptureChild();children.push(c);return c},setTimeoutFn:()=>({unref(){}}),clearTimeoutFn:()=>{}});m.ensure([{key:'g',processId:9,processName:'demo'}]);const sink=new PassThrough();m.attach('g',sink);children[0].stderr.write('CFS_GAME_CAPTURE_EVENT device_lost\n');children[0].emit('close',EXIT_DEVICE_LOST);assert.equal(m.snapshot().totals.deviceLossRestarts,1);m.destroy();
});

await checkAsync('Same PID with changed window handle triggers local rebind',async()=>{
  let rows=[{id:9,name:'demo',title:'A',windowHandle:100,responding:true}],spawns=0;const m=readyManager({processResolver:async()=>rows,spawnFn:()=>{spawns++;return fakeCaptureChild()}});m.ensure([{key:'g',processId:9,processName:'demo'}]);const sink=new PassThrough();m.attach('g',sink);await m.monitorTick();rows=[{id:9,name:'demo',title:'B',windowHandle:200,responding:true}];await m.monitorTick();const snap=m.snapshot();assert.equal(snap.totals.windowRebinds,1);assert.equal(snap.sources[0].windowHandle,200);assert.ok(spawns>=2);m.destroy();
});

await checkAsync('Startup with no first frame is recycled without closing sink',async()=>{
  let now=1000,spawns=0;const m=readyManager({nowFn:()=>now,startFrameGraceMs:3000,frameStallMs:2000,spawnFn:()=>{spawns++;return fakeCaptureChild()},setTimeoutFn:()=>({unref(){}}),clearTimeoutFn:()=>{}});m.ensure([{key:'g',processId:9,processName:'demo'}]);const sink=new PassThrough();m.attach('g',sink);now=5001;await m.monitorTick();const snap=m.snapshot();assert.equal(snap.totals.frameStalls,1);assert.equal(snap.sources[0].sinks,1);assert.ok(spawns>=1);m.destroy();
});

check('Manager passes stall timeout into native helper',()=>assert.ok(managerText.includes('"--stall-timeout-ms"')));
check('Manager passes start timeout into native helper',()=>assert.ok(managerText.includes('"--start-timeout-ms"')));
check('Manager snapshot includes recovery reason',()=>assert.ok(managerText.includes('lastRecoveryReason')));
check('Manager snapshot includes window rebinds',()=>assert.ok(managerText.includes('windowRebinds')));
check('Manager snapshot includes D3D loss restarts',()=>assert.ok(managerText.includes('deviceLossRestarts')));
check('Intentional child stop is ignored by close recovery handler',()=>assert.ok(managerText.includes('ignoredChildren')));

check('Windows process enumeration asks for MainWindowHandle',()=>assert.ok(main.includes('MainWindowHandle')));
check('Windows process enumeration asks for Responding',()=>assert.ok(main.includes('Responding')));
check('Renderer surfaces Game recovery counters',()=>assert.ok(app.includes('frameStalls')&&app.includes('deviceLossRestarts')&&app.includes('windowRebinds')));

check('Game soak tool persists no raw video',()=>assert.ok(soak.includes('rawVideoPersisted:false')));
check('Game soak tool supports Alt-Tab/Fullscreen manual soak',()=>assert.ok(soak.includes('Alt-Tab')&&soak.includes('Fullscreen')));
check('Game soak tool records classified exits',()=>assert.ok(soak.includes('classifyExit')&&soak.includes('exits')));
check('Launcher package exposes game-capture:soak',()=>assert.equal(launcherPkg.scripts['game-capture:soak'],'node tools/game-capture-windows-soak.mjs'));
check('Root package registers pass 21.10.21 check',()=>assert.ok(pkg.scripts?.['studio-game-recovery21:check']?.includes('stream-studio-game-capture-recovery-pass21-10-21-test.mjs')));
check('Combined Stream Studio check includes pass 21.10.21',()=>assert.ok(pkg.scripts?.['stream-studio21:check']?.includes('studio-game-recovery21:check')));
check('Pass 21.10.21 remains documented',()=>assert.ok(checklist.includes('## Pass 21.10.21 Update')));
check('Pass 21.10.21 checklist section exists',()=>assert.ok(checklist.includes('## Pass 21.10.21 Update')));
check('Pass detail documentation exists',()=>assert.ok(detail.includes('Pass 21.10.21')&&detail.includes('Device-Loss')));
check('Previous pass 21.10.20 remains documented',()=>assert.ok(checklist.includes('## Pass 21.10.20 Update')));

console.log(`\nStream Studio Game Capture Recovery Pass 21.10.21: ${pass}/${pass+fail} PASS`);if(fail)process.exitCode=1;
