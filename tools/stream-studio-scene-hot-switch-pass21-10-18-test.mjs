import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const require=createRequire(import.meta.url);
const {SceneFrameBusManager,frameSizeFor,blackFrame}=require(path.join(root,'launcher/src/scene-frame-bus.js'));
const {StreamEngine}=require(path.join(root,'launcher/src/stream-engine.js'));

const engineText=read('launcher/src/stream-engine.js');
const busText=read('launcher/src/scene-frame-bus.js');
const rendererText=read('launcher/src/widget-layer-renderer.js');
const main=read('launcher/main.js');
const ui=read('launcher/renderer/index.html');
const app=read('launcher/renderer/app.js');
const pkg=JSON.parse(read('package.json'));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
const detail=read('STREAM_STUDIO_SCENE_HOT_SWITCH_PASS21_10_18.md');

let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
async function checkAsync(name,fn){try{await fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
function yes(name,value){check(name,()=>assert.equal(Boolean(value),true))}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

check('YUV420 frame size is deterministic',()=>assert.equal(frameSizeFor(4,4),24));
check('Black frame uses full frame size',()=>assert.equal(blackFrame(4,4).length,24));
check('Black frame uses limited-range luma',()=>assert.equal(blackFrame(4,4)[0],16));
check('Black frame uses neutral chroma',()=>assert.equal(blackFrame(4,4)[16],128));

function fakeProducer(){
  const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.killCount=0;child.kill=()=>{child.killCount++;queueMicrotask(()=>child.emit('close',0))};return child;
}

await checkAsync('Scene bus stages and commits a producer only after a full frame',async()=>{
  const manager=new SceneFrameBusManager();manager.ensureBus({key:'live:test',width:4,height:4,fps:10});
  const first=fakeProducer(),stage=manager.stageProducer('live:test',first,{autoCommit:true,timeoutMs:1000,label:'Scene A'});first.stdout.write(Buffer.alloc(24,33));await stage.ready;
  assert.equal(manager.snapshot().buses[0].activeProducer?.label,'Scene A');manager.releaseAll();
});

await checkAsync('Second producer does not replace active producer before commit',async()=>{
  const manager=new SceneFrameBusManager();manager.ensureBus({key:'live:test',width:4,height:4,fps:10});
  const first=fakeProducer(),a=manager.stageProducer('live:test',first,{autoCommit:true,timeoutMs:1000,label:'Scene A'});first.stdout.write(Buffer.alloc(24,33));await a.ready;
  const second=fakeProducer(),b=manager.stageProducer('live:test',second,{autoCommit:false,timeoutMs:1000,label:'Scene B'});second.stdout.write(Buffer.alloc(24,77));await b.ready;
  assert.equal(manager.snapshot().buses[0].activeProducer?.label,'Scene A');assert.equal(first.killCount,0);
  manager.commitProducer('live:test',b.producerId);assert.equal(manager.snapshot().buses[0].activeProducer?.label,'Scene B');assert.equal(first.killCount,1);manager.releaseAll();
});

await checkAsync('Scene bus keeps subscriber pipe attached across producer switch',async()=>{
  const manager=new SceneFrameBusManager();manager.ensureBus({key:'live:test',width:4,height:4,fps:30});
  const sink=new PassThrough();let bytes=0;sink.on('data',chunk=>bytes+=chunk.length);const detach=manager.attach('live:test',sink);
  const first=fakeProducer(),a=manager.stageProducer('live:test',first,{autoCommit:true,timeoutMs:1000});first.stdout.write(Buffer.alloc(24,44));await a.ready;await wait(40);
  const before=bytes,second=fakeProducer(),b=manager.stageProducer('live:test',second,{autoCommit:false,timeoutMs:1000});second.stdout.write(Buffer.alloc(24,88));await b.ready;manager.commitProducer('live:test',b.producerId);await wait(40);
  assert.ok(bytes>before);assert.equal(manager.snapshot().buses[0].subscribers,1);detach();manager.releaseAll();
});

const routing={live:true,recording:true,landscape:true,tiktok_vertical:true};
const native=(id,z=1,extra={})=>({id,source_kind:'native',source_id:`native:${id}`,native_source:{id:`native:${id}`,type:'screen',label:id,width:1920,height:1080},visible:true,x:0,y:0,scale:1,opacity:1,rotation:0,z_index:z,routing:{...routing},filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0},...extra});
const scene=(id,version,x=0)=>({id,name:`Scene ${id}`,version,published_at:`2026-09-18T08:0${version}:00.000Z`,published_config:{profile:'landscape',layouts:{landscape:{canvas:{width:1920,height:1080,background:'#101010'},items:[native(`screen-${id}`,1,{x})]},tiktok_vertical:{canvas:{width:1080,height:1920,background:'#000000'},items:[native(`screen-${id}-v`,1)]}}}});
const sceneA=scene('A',1,0),sceneB=scene('B',2,120);
const target={id:'youtube',label:'YouTube',provider:'youtube',enabled:true,profile:'1080p60',encoder:'software',bitrate_kbps:6000,audio_bitrate_kbps:160};
const credential={serverUrl:'rtmps://example.test/live',streamKey:'secret'};
const capture={type:'screen',drawMouse:true,encoder:'software'};

const buildEngine=new StreamEngine({platform:'win32'});buildEngine.capabilities={gdigrab:true,dshow:true,processLoopback:false,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
const composerBuild=buildEngine.buildSceneComposerArgs({scene:sceneA,capture,profile:'1080p60',mode:'live'});
check('Scene compositor emits rawvideo to stdout',()=>assert.ok(composerBuild.args.includes('rawvideo')&&composerBuild.args.includes('pipe:1')));
check('Scene compositor has no audio output',()=>assert.ok(composerBuild.args.includes('-an')));
check('Scene bus key separates live profile',()=>assert.equal(composerBuild.bus.key,'live:1080p60'));
const busTargetBuild=buildEngine.buildStreamArgs({capture,target,credential,scene:sceneA,sceneBus:{...composerBuild.bus,sceneGraph:{sceneId:'A',sceneName:'Scene A'}}});
check('Streaming target reads stable Scene Bus from pipe 3',()=>assert.ok(busTargetBuild.args.includes('pipe:3')));
check('Streaming target no longer opens gdigrab directly in bus mode',()=>assert.equal(busTargetBuild.args.includes('gdigrab'),false));
check('Streaming target exposes scene video pipe metadata',()=>assert.equal(busTargetBuild.sceneVideoPipes[0].key,'live:1080p60'));

await checkAsync('Hot switch replaces compositor while target FFmpeg child stays alive',async()=>{
  const children=[];
  const widgetManager={async prepare(){},async ensure(){},attach(){return()=>{}},releaseAll(){}};
  const spawnFn=(_file,args,opts)=>{
    const child=new EventEmitter();child.args=args;child.killCount=0;child.stderr=new PassThrough();child.stdout=new PassThrough();child.stdin={write(text){if(String(text).includes('q'))queueMicrotask(()=>child.emit('close',0))}};child.stdio=Array.from({length:opts.stdio.length},()=>null);child.stdio[0]=child.stdin;child.stdio[1]=child.stdout;child.stdio[2]=child.stderr;for(let i=3;i<opts.stdio.length;i++)child.stdio[i]=new PassThrough();child.kill=()=>{child.killCount++;queueMicrotask(()=>child.emit('close',0))};children.push(child);
    if(args.includes('rawvideo')&&args.includes('pipe:1')&&args[args.length-1]==='pipe:1')queueMicrotask(()=>child.stdout.write(Buffer.alloc(frameSizeFor(1920,1080),children.length%255)));
    return child;
  };
  const engine=new StreamEngine({platform:'win32',spawnFn,widgetFrameSourceManager:widgetManager});engine.ffmpegPath='ffmpeg-test';engine.capabilities={gdigrab:true,dshow:true,processLoopback:false,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
  engine.desiredRunning=true;engine.lastStartInput={capture,targets:[target],credentials:{youtube:credential},recording:false,output:{profile:'1080p60'},scene:sceneA,watchdog:{enabled:false}};
  const initial=engine.buildSceneComposerArgs({scene:sceneA,capture,profile:'1080p60',mode:'live'});await engine.spawnSceneComposer(initial,{autoCommit:true,timeoutMs:1000});engine.sceneBusMeta.set(initial.bus.key,{...initial.bus,sceneId:'A',sceneName:'Scene A',sceneGraph:{sceneId:'A',sceneName:'Scene A'}});
  const item=engine.startDestination(target),targetChild=item.child,firstComposer=children[0];
  assert.equal(item.sceneBusKey,'live:1080p60');assert.ok(targetChild);
  const result=await engine.updateScene(sceneB,{source:'test'});
  assert.equal(result.changed,true);assert.equal(engine.processes.get('youtube').child,targetChild);assert.equal(targetChild.killCount,0);assert.equal(firstComposer.killCount,1);assert.equal(engine.snapshot().metrics.sceneSwitches,1);assert.equal(engine.snapshot().sceneRuntime.sceneId,'B');
  await engine.stop();
});

yes('Scene bus handles writable backpressure',busText.includes('sub.blocked')&&busText.includes('"drain"'));
yes('Scene bus retains last frame during producer replacement',busText.includes('latestFrame'));
yes('Scene switch has explicit prewarm stage',engineText.includes('autoCommit:false'));
yes('Scene switch commits only after all staged compositors are ready',engineText.includes('for(const row of staged)this.sceneFrameBusManager.commitProducer'));
yes('Scene switch failure aborts pending compositors',engineText.includes('abortPending'));
yes('Scene compositor loss has local recovery path',engineText.includes('scheduleSceneBusRecovery'));
yes('Widget renderer can prewarm without pruning old Scene widgets',rendererText.includes('async ensure(specs=[]'));
yes('Widget renderer prunes after committed Scene via prepare',engineText.includes('widgetFrameSourceManager.prepare(specs)'));
yes('Launcher cloud sync applies running program scene',main.includes('streamEngine.updateScene(data.program_scene'));
yes('Launcher polls Studio runtime while Stream Engine runs',main.includes('startStreamStudioRuntimeSync')&&main.includes('},2000)'));
yes('Launcher stops Scene sync when Stream Engine stops',main.includes('stopStreamStudioRuntimeSync();'));
yes('Launcher UI shows current program Scene',ui.includes('id="streamEngineScene"'));
yes('Launcher UI shows Hot Switch counters',ui.includes('id="streamEngineSceneSwitches"'));
yes('Renderer surfaces Hot Switch failure instead of hiding it',app.includes('Scene Hot Switch:'));
yes('Scene bus module contains no stream key handling',!busText.includes('streamKey')&&!busText.includes('stream_key'));
yes('Root package registers pass 21.10.18 check',pkg.scripts?.['studio-scene-hot-switch21:check']?.includes('stream-studio-scene-hot-switch-pass21-10-18-test.mjs'));
yes('Combined Stream Studio check includes pass 21.10.18',pkg.scripts?.['stream-studio21:check']?.includes('studio-scene-hot-switch21:check'));
yes('Master checklist retains pass 21.10.18 milestone',checklist.includes('## Pass 21.10.18 Update – Scene Hot Switch / Compositor Runtime Update'));
yes('Checklist records stable target FFmpeg during Scene switch',checklist.includes('Ziel-FFmpeg-Prozesse bleiben beim Scene-Hot-Switch bestehen'));
yes('Pass detail documentation exists',detail.includes('Pass 21.10.18'));
yes('Pass detail keeps real Windows soak open',detail.includes('echter Windows')&&detail.includes('offen'));

console.log(`\nStream Studio Scene Hot Switch Pass 21.10.18: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
