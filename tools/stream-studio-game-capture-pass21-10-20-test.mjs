import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {GameCaptureSourceManager,GAME_CAPTURE_PROTOCOL,MIN_WINDOWS_BUILD,normalizeSpec,parseWindowsBuild}=require('../launcher/src/game-capture-source-manager.js');
const {StreamEngine}=require('../launcher/src/stream-engine.js');
const {ConfigStore,DEFAULTS}=require('../launcher/src/config-store.js');

let pass=0,fail=0;function yes(name,ok){if(ok){pass++;console.log(`PASS ${name}`)}else{fail++;console.error(`FAIL ${name}`)}}function check(name,fn){try{fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}async function checkAsync(name,fn){try{await fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}
const engineText=fs.readFileSync(new URL('../launcher/src/stream-engine.js',import.meta.url),'utf8');
const managerText=fs.readFileSync(new URL('../launcher/src/game-capture-source-manager.js',import.meta.url),'utf8');
const helper=fs.readFileSync(new URL('../launcher/native/game-capture/cfs-game-capture.cpp',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../launcher/native/game-capture/build.cmd',import.meta.url),'utf8');
const acceptance=fs.readFileSync(new URL('../launcher/tools/game-capture-windows-acceptance.mjs',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../launcher/main.js',import.meta.url),'utf8');
const preload=fs.readFileSync(new URL('../launcher/preload.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../launcher/renderer/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../launcher/renderer/app.js',import.meta.url),'utf8');
const launcherPkg=JSON.parse(fs.readFileSync(new URL('../launcher/package.json',import.meta.url),'utf8'));
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const checklist=fs.readFileSync(new URL('../CFS_MASTER_CHECKLIST_PASS21.md',import.meta.url),'utf8');
const detail=fs.readFileSync(new URL('../STREAM_STUDIO_GAME_CAPTURE_PASS21_10_20.md',import.meta.url),'utf8');

check('Game capture protocol is versioned',()=>assert.equal(GAME_CAPTURE_PROTOCOL,'CFS_GAME_CAPTURE_WGC_V1'));
check('Win32 interop minimum build is 18362',()=>assert.equal(MIN_WINDOWS_BUILD,18362));
check('Windows build parser extracts build component',()=>assert.equal(parseWindowsBuild('10.0.22631'),22631));
check('Game source spec clamps dimensions and FPS',()=>assert.deepEqual(normalizeSpec({key:'g',processId:9,width:99999,height:1,fps:999}).width,3840));
check('Invalid process id is rejected',()=>assert.equal(normalizeSpec({key:'g',processId:0}),null));

check('Helper uses Windows.Graphics.Capture',()=>assert.ok(helper.includes('Windows::Graphics::Capture')));
check('Helper targets HWND with IGraphicsCaptureItemInterop',()=>assert.ok(helper.includes('IGraphicsCaptureItemInterop')&&helper.includes('CreateForWindow')));
check('Helper uses D3D11',()=>assert.ok(helper.includes('D3D11CreateDevice')&&helper.includes('ID3D11Texture2D')));
check('Helper uses free-threaded capture frame pool',()=>assert.ok(helper.includes('CreateFreeThreaded')));
check('Helper outputs BGRA frames',()=>assert.ok(helper.includes('scale_bgra_letterbox')&&helper.includes('WriteFile')));
check('Helper waits for first real capture frame before stdout',()=>assert.ok(helper.includes('haveFrame.load(std::memory_order_acquire)')));
check('Helper finds visible top-level window for PID',()=>assert.ok(helper.includes('EnumWindows')&&helper.includes('GetWindowThreadProcessId')));
check('Helper exposes runtime probe protocol',()=>assert.ok(helper.includes('CFS_GAME_CAPTURE_WGC_V1')&&helper.includes('--probe')));
check('Build uses security hardening flags',()=>assert.ok(build.includes('/guard:cf')&&build.includes('/DYNAMICBASE')&&build.includes('/NXCOMPAT')));
check('Build verifies helper after compile',()=>assert.ok(build.includes('--probe')&&build.includes('PROBE_OK')));
check('Build writes SHA-256 sidecar',()=>assert.ok(build.includes('Get-FileHash')&&build.includes('.sha256')));
check('Acceptance stores no raw video payload',()=>assert.ok(acceptance.includes('rawVideoPersisted:false')));
check('Acceptance can require complete BGRA frame',()=>assert.ok(acceptance.includes('bytes>=frameBytes')));

await checkAsync('Runtime probe accepts exact helper protocol',async()=>{
  const fakeFs={existsSync:()=>true};
  const spawnFn=()=>{const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{};queueMicrotask(()=>{c.stdout.write(GAME_CAPTURE_PROTOCOL+'\n');c.emit('close',0)});return c};
  const manager=new GameCaptureSourceManager({platform:'win32',osRelease:'10.0.22631',env:{CFS_GAME_CAPTURE_PATH:'C:\\cfs-game-capture.exe'},fsImpl:fakeFs,spawnFn});
  const result=await manager.probeRuntime({timeoutMs:1000});assert.equal(result.runtimeVerified,true);assert.equal(result.protocol,GAME_CAPTURE_PROTOCOL);
});
await checkAsync('Runtime probe rejects wrong protocol',async()=>{
  const fakeFs={existsSync:()=>true};const spawnFn=()=>{const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{};queueMicrotask(()=>{c.stdout.write('WRONG\n');c.emit('close',0)});return c};
  const manager=new GameCaptureSourceManager({platform:'win32',osRelease:'10.0.22631',env:{CFS_GAME_CAPTURE_PATH:'C:\\cfs-game-capture.exe'},fsImpl:fakeFs,spawnFn});const result=await manager.probeRuntime({timeoutMs:1000});assert.equal(result.runtimeVerified,false);
});
check('Old Windows build is rejected before helper use',()=>{const manager=new GameCaptureSourceManager({platform:'win32',osRelease:'10.0.17763',env:{CFS_GAME_CAPTURE_PATH:'C:\\cfs-game-capture.exe'},fsImpl:{existsSync:()=>true}});assert.equal(manager.probe().available,false)});
check('Non-Windows platform is rejected',()=>{const manager=new GameCaptureSourceManager({platform:'linux',osRelease:'6.8'});assert.equal(manager.probe().available,false)});

check('Manager ensure preserves multiple output-profile sources',()=>{
  const m=new GameCaptureSourceManager({platform:'win32',osRelease:'10.0.22631',fsImpl:{existsSync:()=>true},env:{CFS_GAME_CAPTURE_PATH:'x'}});m.ensure([{key:'a',processId:1,processName:'game',width:1920,height:1080,fps:60}]);m.ensure([{key:'b',processId:1,processName:'game',width:1280,height:720,fps:30}]);assert.equal(m.sources.size,2);m.destroy();
});
check('Manager prepare can prune stale sources',()=>{const m=new GameCaptureSourceManager({platform:'win32',osRelease:'10.0.22631',fsImpl:{existsSync:()=>true},env:{CFS_GAME_CAPTURE_PATH:'x'}});m.ensure([{key:'a',processId:1,processName:'game'},{key:'b',processId:2,processName:'game2'}]);m.prepare([{key:'a',processId:1,processName:'game'}]);assert.deepEqual([...m.sources.keys()],['a']);m.destroy()});

const caps={gdigrab:true,dshow:true,processLoopback:false,gameCaptureWgc:true,xfade:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
check('Primary Game capture compiles to raw BGRA pipe when WGC is ready',()=>{const e=new StreamEngine({platform:'win32'});e.capabilities=caps;const b=e.buildCaptureWithAudio({type:'game',gameProcessId:55,gameProcessName:'demo',gameWidth:1280,gameHeight:720},60,3);assert.ok(b.args.includes('bgra'));assert.equal(b.gamePipes.length,1);assert.equal(b.gamePipes[0].fd,3)});
check('Primary Game capture falls back to GDI when WGC is unavailable',()=>{const e=new StreamEngine({platform:'win32'});e.capabilities={...caps,gameCaptureWgc:false};const b=e.buildCaptureWithAudio({type:'game',windowTitle:'Demo'},60,3);assert.ok(b.args.some(v=>String(v).includes('title=Demo')));assert.equal(b.gamePipes.length,0)});

const routing={live:true,recording:true,landscape:true,tiktok_vertical:true};
const gameNode={id:'game1',source_kind:'native',source_id:'native:game1',native_source:{id:'native:game1',type:'game',label:'Game',width:1920,height:1080},visible:true,x:0,y:0,scale:1,opacity:1,rotation:0,z_index:1,routing,filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0}};
const widgetNode={id:'w1',source_kind:'widget',source_id:'widget:w1',widget_id:'w1',widget:{id:'w1',name:'Test Widget',source_url:'https://example.test/widgets/test',canvas:{width:600,height:120}},visible:true,x:20,y:20,scale:1,opacity:1,rotation:0,z_index:2,routing,filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0}};
const scene={id:'s',name:'Game Scene',published_config:{profile:'landscape',layouts:{landscape:{canvas:{width:1920,height:1080,background:'#000000'},items:[gameNode,widgetNode]},tiktok_vertical:{canvas:{width:1080,height:1920,background:'#000000'},items:[]}}}};
check('Native Scene game node uses WGC pipe and keeps widget FD distinct',()=>{const e=new StreamEngine({platform:'win32'});e.capabilities=caps;const b=e.buildSceneCaptureArgs({scene,capture:{type:'screen',gameProcessId:55,gameProcessName:'demo'},profile:'1080p60'});assert.equal(b.gamePipes.length,1);assert.equal(b.widgetPipes.length,1);assert.notEqual(b.gamePipes[0].fd,b.widgetPipes[0].fd)});
check('Game node has GDI fallback when WGC capability is false',()=>{const e=new StreamEngine({platform:'win32'});e.capabilities={...caps,gameCaptureWgc:false};const b=e.buildSceneCaptureArgs({scene,capture:{gameProcessId:55,windowTitle:'Demo Window'},profile:'1080p60'});assert.ok(b.args.some(v=>String(v).includes('title=Demo Window')));assert.equal(b.gamePipes.length,0)});

const webScene={id:'web',name:'Web',published_config:{profile:'landscape',layouts:{landscape:{canvas:{width:1920,height:1080,background:'#000000'},items:[widgetNode]},tiktok_vertical:{canvas:{width:1080,height:1920,background:'#000000'},items:[]}}}};
check('Widget-only overlay over Game capture also uses WGC base pipe',()=>{const e=new StreamEngine({platform:'win32'});e.capabilities=caps;const b=e.buildSceneCaptureArgs({scene:webScene,capture:{type:'game',gameProcessId:55,gameProcessName:'demo',gameWidth:1280,gameHeight:720},profile:'1080p60'});assert.equal(b.gamePipes.length,1);assert.equal(b.widgetPipes.length,1);assert.notEqual(b.gamePipes[0].fd,b.widgetPipes[0].fd)});

await checkAsync('Game manager broadcasts helper BGRA bytes to FFmpeg sink',async()=>{
  const fakeFs={existsSync:()=>true};let helperChild=null;
  const spawnFn=(_file,args)=>{const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>queueMicrotask(()=>c.emit('close',0));if(args.includes('--probe'))queueMicrotask(()=>{c.stdout.write(GAME_CAPTURE_PROTOCOL+'\n');c.emit('close',0)});else helperChild=c;return c};
  const m=new GameCaptureSourceManager({platform:'win32',osRelease:'10.0.22631',env:{CFS_GAME_CAPTURE_PATH:'x'},fsImpl:fakeFs,spawnFn,setIntervalFn:()=>({unref(){}}),clearIntervalFn:()=>{}});await m.probeRuntime({timeoutMs:1000});m.ensure([{key:'game',processId:9,processName:'demo',width:64,height:64,fps:30}]);const sink=new PassThrough();let bytes=0;sink.on('data',c=>bytes+=c.length);const detach=m.attach('game',sink);helperChild.stdout.write(Buffer.alloc(64*64*4,1));await new Promise(r=>setTimeout(r,5));assert.equal(bytes,64*64*4);detach();m.destroy();
});

check('Config defaults include local game process binding',()=>{assert.equal(DEFAULTS.streamGameProcessId,0);assert.equal(DEFAULTS.streamGameProcessName,'');assert.equal(DEFAULTS.streamGameWindowTitle,'')});
check('Config accepts game capture type',()=>{const fake={readRaw:()=>({...DEFAULTS}),writeRaw(){},publicSettings(){return {...DEFAULTS}}};const text=fs.readFileSync(new URL('../launcher/src/config-store.js',import.meta.url),'utf8');assert.ok(text.includes('["screen","window","game","camera"]'))});
check('Main creates game capture manager with local process resolver',()=>assert.ok(main.includes('new GameCaptureSourceManager')&&main.includes('processResolver:listWindowsProcessCandidates')));
check('Preflight probes game capture helper',()=>assert.ok(main.includes('game_capture_helper')&&main.includes('probeRuntime')));
check('Launcher exposes game capture doctor IPC',()=>assert.ok(main.includes('launcher:game-capture-doctor')&&preload.includes('probeGameCapture')));
check('Launcher UI exposes Game capture option and process selector',()=>assert.ok(html.includes('value="game"')&&html.includes('id="streamGameProcess"')));
check('Launcher UI exposes helper test button',()=>assert.ok(html.includes('probeGameCapture')&&html.includes('GAME CAPTURE')));
check('Renderer persists process id/name/window title',()=>assert.ok(app.includes('gameProcessId')&&app.includes('gameProcessName')&&app.includes('gameWindowTitle')));
check('Stream Engine snapshot exposes game capture telemetry',()=>assert.ok(engineText.includes('gameCapture=this.gameCaptureSourceManager?.snapshot?.()')));
check('Stream Engine stop releases Game capture helpers',()=>assert.ok(engineText.includes('gameCaptureSourceManager?.releaseAll?.()')));
check('Electron release builds Game helper before package',()=>assert.ok(launcherPkg.scripts['release:win'].includes('game-capture:build')));
check('Electron package stages Game helper resources',()=>assert.ok(launcherPkg.build.extraResources.some(row=>row.from==='vendor/game-capture'&&row.to==='game-capture')));
check('Launcher package has Game helper build command',()=>assert.ok(launcherPkg.scripts['game-capture:build']));
check('Launcher package has Game helper doctor command',()=>assert.ok(launcherPkg.scripts['game-capture:doctor']));
check('Root package registers pass 21.10.20 check',()=>assert.ok(pkg.scripts?.['studio-game-capture21:check']?.includes('stream-studio-game-capture-pass21-10-20-test.mjs')));
check('Combined Stream Studio check includes pass 21.10.20',()=>assert.ok(pkg.scripts?.['stream-studio21:check']?.includes('studio-game-capture21:check')));
check('Pass 21.10.20 milestone remains documented',()=>assert.ok(checklist.includes('## Pass 21.10.20 Update')));
check('Pass detail documentation exists',()=>assert.ok(detail.includes('Pass 21.10.20')&&detail.includes('Windows.Graphics.Capture')));
check('Previous 21.10.19 milestone remains documented',()=>assert.ok(checklist.includes('## Pass 21.10.19 Update')));

console.log(`\nStream Studio Native Game Capture Pass 21.10.20: ${pass}/${pass+fail} PASS`);if(fail)process.exitCode=1;
