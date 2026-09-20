import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const require=createRequire(import.meta.url);
const scenes=require(path.join(root,'lib/creator-widget-scenes.js'));
const graphApi=require(path.join(root,'launcher/src/native-scene-graph.js'));
const {StreamEngine}=require(path.join(root,'launcher/src/stream-engine.js'));

const html=read('public/pages/stream-studio.html');
const js=read('public/assets/js/stream-studio.js');
const css=read('public/assets/css/stream-studio.css');
const sceneLib=read('lib/creator-widget-scenes.js');
const graphText=read('launcher/src/native-scene-graph.js');
const engineText=read('launcher/src/stream-engine.js');
const main=read('launcher/main.js');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');

let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
function yes(name,value){check(name,()=>assert.equal(Boolean(value),true))}

for(const needle of ['data-source-filter="native"','id="composerNativeCrop"','id="composerCropLeft"','id="composerCropTop"','id="composerCropRight"','id="composerCropBottom"'])yes(`Studio UI ${needle}`,html.includes(needle));
yes('Studio lists four native launcher source types',['native:screen','native:window','native:game','native:camera'].every(x=>js.includes(x)));
yes('Studio can add native sources to both layouts',js.includes('function addNativeComposerSource')&&js.includes('landscape.items.push')&&js.includes('tiktok.items.push'));
yes('Studio normalizes native crop',js.includes('function normalizeComposerCrop'));
yes('Studio updates native crop',js.includes('function updateComposerCrop'));
yes('Studio renders native placeholder rather than pretending browser capture',js.includes('scene-composer-native-placeholder'));
yes('Studio native sources remain local launcher sources',js.includes('Launcher lokal · Gerätebindung bleibt auf deinem PC'));
yes('Native source styling exists',css.includes('.stream-source-card.native')&&css.includes('.scene-composer-native-placeholder'));
yes('Native crop styling exists',css.includes('.scene-source-crop'));

yes('Scene server library defines native source allowlist',sceneLib.includes('SCENE_NATIVE_SOURCE_TYPES'));
yes('Scene server library sanitizes native source metadata',sceneLib.includes('function sanitizeNativeSceneSource'));
yes('Scene server library sanitizes native crop',sceneLib.includes('function sanitizeSceneCrop'));
yes('Scene ownership skips local native sources',sceneLib.includes('if(item?.source_kind==="native")continue'));
const nativeClean=scenes.sanitizeSceneItem({id:'cam',source_kind:'native',source_id:'native:camera',native_source:{id:'native:camera',type:'camera',label:'USB Cam',width:99999,height:1},crop:{left:99999,top:-10,right:12,bottom:13},routing:{live:true,recording:false}},0);
check('Native scene item survives sanitizer',()=>assert.equal(nativeClean.source_kind,'native'));
check('Native scene item has no widget id',()=>assert.equal(nativeClean.widget_id,''));
check('Native width is bounded',()=>assert.equal(nativeClean.native_source.width,7680));
check('Native height is bounded',()=>assert.equal(nativeClean.native_source.height,64));
check('Native crop is bounded',()=>assert.deepEqual(nativeClean.crop,{left:4096,top:0,right:12,bottom:13}));
const ownership=scenes.validateSceneOwnership(scenes.sanitizeSceneConfig({profile:'landscape',layouts:{landscape:{items:[nativeClean]},tiktok_vertical:{items:[nativeClean]}}}),[]);
check('Native-only scene does not require cloud widget ownership',()=>assert.equal(ownership.ok,true));

const nativeItem=(id,type,extra={})=>({id,source_kind:'native',source_id:`native:${type}`,native_source:{id:`native:${type}`,type,label:type,width:type==='camera'?1280:1920,height:type==='camera'?720:1080},visible:true,x:0,y:0,scale:1,opacity:1,rotation:0,z_index:0,routing:{live:true,recording:true,landscape:true,tiktok_vertical:true},filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0},...extra});
const nativeScene={id:'scene-native',name:'Native Scene',published_config:{profile:'landscape',layouts:{landscape:{canvas:{width:1920,height:1080,background:'#101010'},items:[nativeItem('screen','screen',{x:50,y:20,z_index:1,crop:{left:10,top:4,right:6,bottom:2},filters:{brightness:1.2,contrast:1.1,saturation:.9,blur_px:2}}),nativeItem('camera','camera',{x:1300,y:700,scale:.35,opacity:.8,z_index:2,routing:{live:true,recording:false,landscape:true,tiktok_vertical:true}}),nativeItem('hidden','screen',{visible:false,z_index:3})]},tiktok_vertical:{canvas:{width:1080,height:1920,background:'#000000'},items:[nativeItem('screen','screen',{x:0,y:400,scale:.55})]}}}};
const graph=graphApi.buildNativeSceneGraph(nativeScene,{profile:'1080p60',mode:'live'});
check('Native graph selects landscape for 1080p profile',()=>assert.equal(graph.layoutKey,'landscape'));
check('Native-only scene enters native compositor mode',()=>assert.equal(graph.mode,'native'));
check('Native-only scene is composable',()=>assert.equal(graph.canComposeNatively,true));
check('Hidden source is excluded from native graph',()=>assert.equal(graph.nativeNodes.some(x=>x.id==='hidden'),false));
check('Live graph keeps live camera route',()=>assert.equal(graph.nativeNodes.some(x=>x.id==='camera'),true));
const recordingGraph=graphApi.buildNativeSceneGraph(nativeScene,{profile:'1080p60',mode:'recording'});
check('Recording graph removes source routed out of recording',()=>assert.equal(recordingGraph.nativeNodes.some(x=>x.id==='camera'),false));
const routedOffScene={id:'off',published_config:{layouts:{landscape:{canvas:{width:1920,height:1080,background:'#000000'},items:[nativeItem('offscreen','screen',{routing:{live:false,recording:true,landscape:true,tiktok_vertical:true}})]},tiktok_vertical:{canvas:{width:1080,height:1920},items:[]}}}};
const routedOffGraph=graphApi.buildNativeSceneGraph(routedOffScene,{profile:'1080p60',mode:'live'});
check('Native scene stays in compositor mode when every live route is off',()=>assert.equal(routedOffGraph.mode,'native'));
check('All-routed-off native scene composes an empty canvas instead of leaking legacy capture',()=>assert.equal(routedOffGraph.canComposeNatively&&routedOffGraph.nativeNodes.length===0,true));
const verticalGraph=graphApi.buildNativeSceneGraph(nativeScene,{profile:'vertical1080p60',mode:'live'});
check('Vertical output selects 9:16 scene layout',()=>assert.equal(verticalGraph.layoutKey,'tiktok_vertical'));
check('Vertical canvas remains 1080x1920',()=>assert.deepEqual(verticalGraph.canvas,{width:1080,height:1920,background:'#000000'}));

const compiled=graphApi.compileNativeVideoFilters(graph,{screen:1,camera:2});
check('FFmpeg graph emits a final video label',()=>assert.equal(compiled.videoLabel,'cfs_scene_v'));
check('FFmpeg graph compiles both visible native layers',()=>assert.equal(compiled.nodes.length,2));
yes('FFmpeg graph includes crop filter',compiled.filters.some(x=>x.includes('crop=')));
yes('FFmpeg graph includes source color filters',compiled.filters.some(x=>x.includes('eq=brightness=')));
yes('FFmpeg graph includes blur filter',compiled.filters.some(x=>x.includes('boxblur=')));
yes('FFmpeg graph composes by overlay',compiled.filters.filter(x=>x.includes('overlay=')).length===2);
yes('FFmpeg graph applies opacity',compiled.filters.some(x=>x.includes('colorchannelmixer=aa=')));

const mixedScene=JSON.parse(JSON.stringify(nativeScene));
mixedScene.published_config.layouts.landscape.items.push({id:'widget',source_kind:'widget',source_id:'widget-1',widget_id:'widget-1',visible:true,x:0,y:0,scale:1,opacity:1,rotation:0,z_index:5,routing:{live:true,recording:true,landscape:true,tiktok_vertical:true}});
const mixedGraph=graphApi.buildNativeSceneGraph(mixedScene,{profile:'1080p60',mode:'live'});
check('Mixed widget/native scene is detected explicitly',()=>assert.equal(mixedGraph.mode,'hybrid'));
check('Mixed scene does not claim native composition is complete',()=>assert.equal(mixedGraph.canComposeNatively,false));
check('Mixed scene exposes an advisory warning',()=>assert.equal(mixedGraph.warnings.length>0,true));

const engine=new StreamEngine({platform:'win32'});
engine.capabilities={gdigrab:true,dshow:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
const capture={type:'screen',videoDevice:'USB Camera',audioDevice:'Mic',windowTitle:'Game Window',drawMouse:true};
const credential={serverUrl:'rtmps://example.test/live',streamKey:'secret123456'};
const target={id:'youtube',profile:'1080p60',encoder:'software',bitrate_kbps:6000,audio_bitrate_kbps:160};
const nativeCapture=engine.buildNativeSceneCaptureArgs({scene:nativeScene,capture,profile:'1080p60',mode:'live'});
check('Native capture activates for native-only scene',()=>assert.equal(nativeCapture.active,true));
yes('Native capture starts with generated canvas input',nativeCapture.args.some(x=>String(x).includes('color=c=0x101010:s=1920x1080')));
yes('Native capture adds gdigrab source',nativeCapture.args.includes('gdigrab'));
yes('Native capture adds dshow camera/audio sources',nativeCapture.args.includes('dshow'));
check('Native capture maps source item ids to FFmpeg input indexes',()=>assert.equal(Number.isInteger(nativeCapture.inputIndexByNodeId.screen)&&Number.isInteger(nativeCapture.inputIndexByNodeId.camera),true));
yes('Native compositor clock is paced by its generated canvas input',nativeCapture.args[0]==='-re');
const routedOffBuild=engine.buildStreamArgs({capture,target,credential,scene:routedOffScene});
check('All-routed-off native output does not open gdigrab',()=>assert.equal(routedOffBuild.args.includes('gdigrab'),false));
yes('All-routed-off native output still maps compositor canvas',routedOffBuild.args.includes('[cfs_scene_v]'));
const streamBuild=engine.buildStreamArgs({capture,target,credential,scene:nativeScene});
check('Native stream reports native scene mode',()=>assert.equal(streamBuild.sceneGraph.mode,'native'));
yes('Native stream uses one complex graph for video/audio',streamBuild.args.includes('-filter_complex'));
check('Native stream avoids legacy simple -vf filter conflict',()=>assert.equal(streamBuild.args.includes('-vf'),false));
yes('Native stream maps composed video label',streamBuild.args.includes('[cfs_scene_v]'));
const recBuild=engine.buildRecordingArgs({capture,output:{profile:'1080p60',encoder:'software',bitrate_kbps:6000,audio_bitrate_kbps:160,recording_format:'mkv',recording_tracks:{mix:true,audio1:true,audio2:false}},filePath:'C:/tmp/test.mkv',scene:nativeScene});
check('Recording scene graph respects recording route',()=>assert.equal(recBuild.sceneGraph.nativeSources.some(x=>x.id==='camera'),false));
yes('Recording with native graph still uses complex graph',recBuild.args.includes('-filter_complex'));
const mixedBuild=engine.buildStreamArgs({capture:{...capture,type:'screen'},target,credential,scene:mixedScene});
check('Hybrid scene status survives into runtime summary',()=>assert.equal(mixedBuild.sceneGraph.mode,'hybrid'));
yes('Hybrid scene deliberately keeps legacy capture path for compatibility',mixedBuild.args.includes('-vf'));
const gameScene={id:'game',published_config:{layouts:{landscape:{canvas:{width:1920,height:1080},items:[nativeItem('game','game')]},tiktok_vertical:{canvas:{width:1080,height:1920},items:[]}}}};
check('Game source requires a local game/window binding when no native helper binding is active',()=>assert.throws(()=>engine.buildNativeSceneCaptureArgs({scene:gameScene,capture:{},profile:'1080p60',mode:'live'}),/Spiel-Prozessbindung|Fenster-Binding/));

yes('Native scene graph module is connected to StreamEngine',engineText.includes('require("./native-scene-graph")'));
yes('Launcher forwards published program scene into StreamEngine',main.includes('scene:cloud.program_scene||null'));
yes('Bridge advertises evolved local scene graph',server.includes('scene_graph:"hybrid_offscreen"'));
yes('Bridge protocol advanced beyond native foundation',server.includes('protocol:4'));
yes('Pass 21.10.13 still defines Game as a native Scene Graph source type',graphText.includes('game:{key:"game"'));
yes('Native graph does not contain stream keys',!graphText.includes('streamKey')&&!graphText.includes('stream_key'));
yes('New repository check is registered',pkg.scripts?.['studio-native-scene21:check']?.includes('stream-studio-native-scene-graph-pass21-10-13-test.mjs'));
yes('Combined Stream Studio check includes pass 21.10.13',pkg.scripts?.['stream-studio21:check']?.includes('studio-native-scene21:check'));
yes('Checklist advanced to pass 21.10.13',checklist.includes('Pass 21.10.13'));
yes('Checklist records native launcher compositor foundation',checklist.includes('Native Launcher Compositor / Scene Graph Foundation'));

console.log(`\nStream Studio Native Scene Graph Pass 21.10.13: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
