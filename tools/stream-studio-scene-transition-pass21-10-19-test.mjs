import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {StreamEngine,normalizeSceneTransition}=require('../launcher/src/stream-engine.js');
const {frameSizeFor}=require('../launcher/src/scene-frame-bus.js');

let pass=0,fail=0;
function yes(name,ok){if(ok){pass++;console.log(`PASS ${name}`)}else{fail++;console.error(`FAIL ${name}`)}}
function check(name,fn){try{fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}
async function checkAsync(name,fn){try{await fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}

const engineText=fs.readFileSync(new URL('../launcher/src/stream-engine.js',import.meta.url),'utf8');
const busText=fs.readFileSync(new URL('../launcher/src/scene-frame-bus.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../launcher/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../launcher/renderer/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../launcher/renderer/app.js',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const checklist=fs.readFileSync(new URL('../CFS_MASTER_CHECKLIST_PASS21.md',import.meta.url),'utf8');
const detail=fs.readFileSync(new URL('../STREAM_STUDIO_SCENE_TRANSITION_PASS21_10_19.md',import.meta.url),'utf8');

check('Transition normalizer preserves fade duration',()=>assert.deepEqual(normalizeSceneTransition({type:'fade',duration_ms:420,easing:'smooth'}),{type:'fade',durationMs:420,easing:'smooth'}));
check('CUT transition has zero duration',()=>assert.equal(normalizeSceneTransition({type:'cut',duration_ms:999}).durationMs,0));
check('Transition duration is clamped',()=>assert.equal(normalizeSceneTransition({type:'dissolve',duration_ms:9999}).durationMs,2500));
check('Unknown transition safely normalizes to CUT',()=>assert.equal(normalizeSceneTransition({type:'spin'}).type,'cut'));

const routing={live:true,recording:true,landscape:true,tiktok_vertical:true};
const native=(id,z=1,extra={})=>({id,source_kind:'native',source_id:`native:${id}`,native_source:{id:`native:${id}`,type:'screen',label:id,width:1920,height:1080},visible:true,x:0,y:0,scale:1,opacity:1,rotation:0,z_index:z,routing:{...routing},filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0},...extra});
const scene=(id,version,x=0)=>({id,name:`Scene ${id}`,version,published_at:`2026-09-18T10:0${version}:00.000Z`,published_config:{profile:'landscape',layouts:{landscape:{canvas:{width:1920,height:1080,background:'#101010'},items:[native(`screen-${id}`,1,{x})]},tiktok_vertical:{canvas:{width:1080,height:1920,background:'#000000'},items:[native(`screen-${id}-v`,1)]}}}});
const sceneA=scene('A',1,0),sceneB=scene('B',2,120);
const capture={type:'screen',drawMouse:true,encoder:'software'};
const target={id:'youtube',label:'YouTube',provider:'youtube',enabled:true,profile:'1080p60',encoder:'software',bitrate_kbps:6000,audio_bitrate_kbps:160};
const credential={serverUrl:'rtmps://example.test/live',streamKey:'secret'};

check('Fade composer uses FFmpeg xfade and looping old frame',()=>{
  const engine=new StreamEngine({platform:'win32'});engine.capabilities={gdigrab:true,dshow:true,processLoopback:false,xfade:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
  const frame=Buffer.alloc(frameSizeFor(1920,1080),64);
  const built=engine.buildSceneTransitionComposerArgs({scene:sceneB,capture,profile:'1080p60',mode:'live',transition:{type:'fade',duration_ms:350},fromFrame:frame});
  const filter=built.args[built.args.indexOf('-filter_complex')+1];
  assert.ok(filter.includes('xfade=transition=fade:duration=0.350:offset=0'));
  assert.ok(built.args.includes('-stream_loop'));
  assert.ok(built.args.includes('-r'));
  assert.equal(built.transition.effectiveType,'fade');
  for(const cleanup of built.cleanupFns||[])cleanup();
});

check('Dissolve and slide transition names map to xfade effects',()=>{
  const engine=new StreamEngine({platform:'win32'});engine.capabilities={gdigrab:true,dshow:true,processLoopback:false,xfade:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
  const frame=Buffer.alloc(frameSizeFor(1920,1080),64);
  for(const [type,effect] of [['dissolve','dissolve'],['slide_left','slideleft'],['slide_right','slideright'],['slide_up','slideup'],['zoom','zoomin']]){
    const built=engine.buildSceneTransitionComposerArgs({scene:sceneB,capture,profile:'1080p60',transition:{type,duration_ms:200},fromFrame:frame});
    const filter=built.args[built.args.indexOf('-filter_complex')+1];assert.ok(filter.includes(`xfade=transition=${effect}:`));for(const cleanup of built.cleanupFns||[])cleanup();
  }
});

check('Missing xfade capability falls back to CUT without temp snapshot',()=>{
  const engine=new StreamEngine({platform:'win32'});engine.capabilities={gdigrab:true,dshow:true,processLoopback:false,xfade:false,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
  const built=engine.buildSceneTransitionComposerArgs({scene:sceneB,capture,profile:'1080p60',transition:{type:'fade',duration_ms:350},fromFrame:null});
  assert.equal(built.transition.effectiveType,'cut');assert.equal(built.transition.fallback,'xfade_unavailable');assert.equal(Boolean(built.cleanupFns?.length),false);
});

await checkAsync('Animated scene switch keeps target FFmpeg child alive',async()=>{
  const children=[];
  const widgetManager={async prepare(){},async ensure(){},attach(){return()=>{}},releaseAll(){}};
  const spawnFn=(_file,args,opts)=>{
    const child=new EventEmitter();child.args=args;child.killCount=0;child.stderr=new PassThrough();child.stdout=new PassThrough();child.stdin={write(text){if(String(text).includes('q'))queueMicrotask(()=>child.emit('close',0))}};child.stdio=Array.from({length:opts.stdio.length},()=>null);child.stdio[0]=child.stdin;child.stdio[1]=child.stdout;child.stdio[2]=child.stderr;for(let i=3;i<opts.stdio.length;i++)child.stdio[i]=new PassThrough();child.kill=()=>{child.killCount++;queueMicrotask(()=>child.emit('close',0))};children.push(child);
    if(args.includes('rawvideo')&&args[args.length-1]==='pipe:1')queueMicrotask(()=>child.stdout.write(Buffer.alloc(frameSizeFor(1920,1080),children.length%255)));
    return child;
  };
  const engine=new StreamEngine({platform:'win32',spawnFn,widgetFrameSourceManager:widgetManager});engine.ffmpegPath='ffmpeg-test';engine.capabilities={gdigrab:true,dshow:true,processLoopback:false,xfade:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
  engine.desiredRunning=true;engine.lastStartInput={capture,targets:[target],credentials:{youtube:credential},recording:false,output:{profile:'1080p60'},scene:sceneA,transition:{type:'fade',duration_ms:240,easing:'smooth'},watchdog:{enabled:false}};
  const initial=engine.buildSceneComposerArgs({scene:sceneA,capture,profile:'1080p60',mode:'live'});await engine.spawnSceneComposer(initial,{autoCommit:true,timeoutMs:1000});engine.sceneBusMeta.set(initial.bus.key,{...initial.bus,sceneId:'A',sceneName:'Scene A'});
  const item=engine.startDestination(target),targetChild=item.child,firstComposer=children[0];
  const result=await engine.updateScene(sceneB,{source:'test',transition:{type:'fade',duration_ms:240,easing:'smooth'}});
  assert.equal(result.changed,true);assert.equal(result.transition.effectiveType,'fade');assert.equal(result.transition.durationMs,240);
  assert.equal(engine.processes.get('youtube').child,targetChild);assert.equal(targetChild.killCount,0);assert.equal(firstComposer.killCount,1);
  const transitionChild=children.find(child=>child.args.some(arg=>String(arg).includes('xfade=transition=fade:duration=0.240')));assert.ok(transitionChild);
  const snapshotPath=transitionChild.args.find(arg=>String(arg).includes('cfs-scene-transition-')&&String(arg).endsWith('from.yuv'));assert.ok(snapshotPath&&fs.existsSync(snapshotPath));
  assert.equal(engine.snapshot().metrics.sceneTransitions,1);assert.equal(engine.snapshot().sceneRuntime.lastTransition?.effectiveType,'fade');
  await engine.stop();assert.equal(fs.existsSync(snapshotPath),false);
});

await checkAsync('Requested animated transition falls back to CUT and still switches when xfade is unavailable',async()=>{
  const children=[];const widgetManager={async prepare(){},async ensure(){},attach(){return()=>{}},releaseAll(){}};
  const spawnFn=(_file,args,opts)=>{const child=new EventEmitter();child.args=args;child.killCount=0;child.stderr=new PassThrough();child.stdout=new PassThrough();child.stdin={write(text){if(String(text).includes('q'))queueMicrotask(()=>child.emit('close',0))}};child.stdio=Array.from({length:opts.stdio.length},()=>null);child.stdio[0]=child.stdin;child.stdio[1]=child.stdout;child.stdio[2]=child.stderr;for(let i=3;i<opts.stdio.length;i++)child.stdio[i]=new PassThrough();child.kill=()=>{child.killCount++;queueMicrotask(()=>child.emit('close',0))};children.push(child);if(args[args.length-1]==='pipe:1')queueMicrotask(()=>child.stdout.write(Buffer.alloc(frameSizeFor(1920,1080),33)));return child};
  const engine=new StreamEngine({platform:'win32',spawnFn,widgetFrameSourceManager:widgetManager});engine.ffmpegPath='ffmpeg-test';engine.capabilities={gdigrab:true,dshow:true,processLoopback:false,xfade:false,encoders:{software:true,nvenc:false,amd:false,qsv:false}};engine.desiredRunning=true;engine.lastStartInput={capture,targets:[],credentials:{},recording:false,output:{profile:'1080p60'},scene:sceneA};
  const initial=engine.buildSceneComposerArgs({scene:sceneA,capture,profile:'1080p60'});await engine.spawnSceneComposer(initial,{autoCommit:true,timeoutMs:1000});engine.sceneBusMeta.set(initial.bus.key,{...initial.bus,sceneId:'A',sceneName:'Scene A'});
  // activeSceneBusRequests derives from targets, so add a live target after initial setup.
  engine.lastStartInput.targets=[target];engine.lastStartInput.credentials={youtube:credential};engine.startDestination(target);
  const result=await engine.updateScene(sceneB,{transition:{type:'fade',duration_ms:350}});assert.equal(result.transition.effectiveType,'cut');assert.equal(result.transition.fallback,'xfade_unavailable');assert.equal(engine.snapshot().metrics.sceneTransitionFallbacks,1);await engine.stop();
});

yes('Scene Frame Bus exposes current frame snapshot for transition start',busText.includes('currentFrame(key)'));
yes('Stream Engine probes xfade capability',engineText.includes('xfade:/\\bxfade\\b/i.test(filterText)'));
yes('Transition composer uses xfade filter',engineText.includes('xfade=transition=${effect}'));
yes('Transition snapshot is private temp data and cleaned with producer',engineText.includes('cfs-scene-transition-')&&engineText.includes('fs.rmSync(dir'));
yes('Cloud runtime sync forwards Studio transition config',main.includes('transition:data?.config?.transition||null'));
yes('Streaming start stores Studio transition config',main.includes('transition:cloud.config?.transition'));
yes('Launcher UI exposes transition runtime',html.includes('id="streamEngineSceneTransition"')&&app.includes('lastTransition'));
yes('Launcher UI exposes xfade capability',app.includes('xfade ${engine.capabilities?.xfade?"ja":"nein"}'));
yes('Transition metrics are included in telemetry',engineText.includes('sceneTransitions:Number(snapshot.metrics?.sceneTransitions||0)'));
yes('Root package registers pass 21.10.19 check',pkg.scripts?.['studio-scene-transition21:check']?.includes('stream-studio-scene-transition-pass21-10-19-test.mjs'));
yes('Combined Stream Studio check includes pass 21.10.19',pkg.scripts?.['stream-studio21:check']?.includes('studio-scene-transition21:check'));
yes('Pass 21.10.19 milestone remains in master checklist',checklist.includes('## Pass 21.10.19 Update – Scene Transition Runtime'));
yes('Checklist records xfade transition runtime',checklist.includes('FFmpeg `xfade`'));
yes('Pass detail documentation exists',detail.includes('Pass 21.10.19'));
yes('Pass detail keeps real Windows transition acceptance open',detail.includes('echter Windows')&&detail.includes('offen'));

console.log(`\nStream Studio Scene Transition Pass 21.10.19: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
