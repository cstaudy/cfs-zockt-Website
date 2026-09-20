import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const require=createRequire(import.meta.url);
const graphApi=require(path.join(root,'launcher/src/native-scene-graph.js'));
const {StreamEngine}=require(path.join(root,'launcher/src/stream-engine.js'));
const rendererApi=require(path.join(root,'launcher/src/widget-layer-renderer.js'));

const graphText=read('launcher/src/native-scene-graph.js');
const engineText=read('launcher/src/stream-engine.js');
const rendererText=read('launcher/src/widget-layer-renderer.js');
const main=read('launcher/main.js');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
const detail=read('STREAM_STUDIO_HYBRID_COMPOSITOR_PASS21_10_14.md');

let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
function yes(name,value){check(name,()=>assert.equal(Boolean(value),true))}

const routing={live:true,recording:true,landscape:true,tiktok_vertical:true};
const nativeItem=(id,type,z,extra={})=>({id,source_kind:'native',source_id:`native:${type}`,native_source:{id:`native:${type}`,type,label:type,width:type==='camera'?1280:1920,height:type==='camera'?720:1080},visible:true,x:0,y:0,scale:1,opacity:1,rotation:0,z_index:z,routing:{...routing},filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0},...extra});
const widgetItem=(id,widgetId,z,extra={})=>({id,source_kind:'widget',source_id:widgetId,widget_id:widgetId,visible:true,x:120,y:80,scale:1,opacity:.9,rotation:0,z_index:z,routing:{...routing},filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0},...extra});
const widgetRuntime=(item,id='widget-1')=>({...item,widget:{id,name:'Alert Widget',source_url:'https://cfs-zockt.de/widgets/studio.html#token=publictoken',canvas:{width:600,height:120}}});

const w=widgetItem('widget-item','widget-1',5);
const hybridScene={
  id:'hybrid-scene',name:'Hybrid Scene',
  published_config:{profile:'landscape',layouts:{
    landscape:{canvas:{width:1920,height:1080,background:'#101010'},items:[nativeItem('screen','screen',1),w,nativeItem('camera','camera',9,{x:1400,y:760,scale:.35})]},
    tiktok_vertical:{canvas:{width:1080,height:1920,background:'#000000'},items:[nativeItem('screen-v','screen',1),widgetItem('widget-v','widget-1',5)]}
  }},
  runtime_layouts:{
    landscape:{items:[widgetRuntime(w)]},
    tiktok_vertical:{items:[widgetRuntime(widgetItem('widget-v','widget-1',5))]}
  }
};

const graph=graphApi.buildNativeSceneGraph(hybridScene,{profile:'1080p60',mode:'live'});
check('Mixed scene enters hybrid mode',()=>assert.equal(graph.mode,'hybrid'));
check('Hybrid graph is locally composable when widget runtime exists',()=>assert.equal(graph.canComposeLocally,true));
check('Hybrid graph still distinguishes native-only capability',()=>assert.equal(graph.canComposeNatively,false));
check('Hybrid graph resolves one widget source',()=>assert.equal(graph.widgetSources.length,1));
check('Widget source key contains no public token',()=>assert.equal(graph.widgetSources[0].key.includes('publictoken'),false));
check('Hybrid nodes keep cross-kind Z order',()=>assert.deepEqual(graph.nodes.map(node=>node.id),['screen','widget-item','camera']));

const compiled=graphApi.compileSceneVideoFilters(graph,{screen:1,'widget-item':4,camera:2},{baseMode:'canvas',baseInputIndex:0});
check('Hybrid FFmpeg graph compiles all three layers',()=>assert.deepEqual(compiled.nodes.map(node=>node.id),['screen','widget-item','camera']));
check('Hybrid FFmpeg graph preserves native/widget/native order',()=>assert.deepEqual(compiled.nodes.map(node=>node.kind),['native','widget','native']));
yes('Hybrid graph maps widget raw video input',compiled.filters.some(line=>line.startsWith('[4:v:0]')));
yes('Hybrid graph finishes in yuv420p stream output',compiled.filters.some(line=>line.includes('format=yuv420p[cfs_scene_v]')));

const engine=new StreamEngine({platform:'win32'});
engine.capabilities={gdigrab:true,dshow:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
const capture={type:'screen',videoDevice:'USB Camera',audioDevice:'Mic',windowTitle:'Game Window',drawMouse:true};
const credential={serverUrl:'rtmps://example.test/live',streamKey:'secret123456'};
const target={id:'youtube',profile:'1080p60',encoder:'software',bitrate_kbps:6000,audio_bitrate_kbps:160};
const hybridBuild=engine.buildStreamArgs({capture,target,credential,scene:hybridScene});
check('Hybrid stream reports hybrid mode',()=>assert.equal(hybridBuild.sceneGraph.mode,'hybrid'));
check('Hybrid stream reports local composition capability',()=>assert.equal(hybridBuild.sceneGraph.canComposeLocally,true));
check('Hybrid stream creates one widget pipe binding',()=>assert.equal(hybridBuild.widgetPipes.length,1));
yes('Hybrid stream uses raw BGRA widget input',hybridBuild.args.includes('rawvideo')&&hybridBuild.args.includes('bgra'));
yes('Hybrid stream binds widget source to extra process pipe',hybridBuild.args.includes('pipe:3'));
check('Hybrid stream avoids legacy -vf path',()=>assert.equal(hybridBuild.args.includes('-vf'),false));
yes('Hybrid stream uses a combined filter_complex',hybridBuild.args.includes('-filter_complex'));

const webItem=widgetItem('web-widget','widget-web',3);
const webScene={id:'web',published_config:{profile:'landscape',layouts:{landscape:{canvas:{width:1920,height:1080,background:'transparent'},items:[webItem]},tiktok_vertical:{canvas:{width:1080,height:1920},items:[]}}},runtime_layouts:{landscape:{items:[widgetRuntime(webItem,'widget-web')]}}};
const webGraph=graphApi.buildNativeSceneGraph(webScene,{profile:'1080p60',mode:'live'});
check('Widget-only scene enters web overlay mode',()=>assert.equal(webGraph.mode,'web_overlay'));
check('Widget-only scene becomes locally composable',()=>assert.equal(webGraph.canComposeLocally,true));
const webBuild=engine.buildStreamArgs({capture:{...capture,type:'screen',crop:{x:10,y:20,width:1280,height:720}},target,credential,scene:webScene});
yes('Widget-only scene keeps configured capture as base',webBuild.args.includes('gdigrab'));
yes('Widget-only scene composites widget pipe over capture',webBuild.args.includes('pipe:3')&&webBuild.args.includes('-filter_complex'));
yes('Widget-only capture crop is applied inside combined graph',String(webBuild.args[webBuild.args.indexOf('-filter_complex')+1]).includes('crop=1280:720:10:20'));
check('Widget-only combined graph also avoids simple -vf',()=>assert.equal(webBuild.args.includes('-vf'),false));

const missingRuntime=JSON.parse(JSON.stringify(hybridScene));delete missingRuntime.runtime_layouts;
const missingGraph=graphApi.buildNativeSceneGraph(missingRuntime,{profile:'1080p60',mode:'live'});
check('Hybrid without hydrated runtime is not falsely marked complete',()=>assert.equal(missingGraph.canComposeLocally,false));
check('Hybrid without runtime emits a warning',()=>assert.equal(missingGraph.warnings.length>0,true));
const fallbackBuild=engine.buildStreamArgs({capture,target,credential,scene:missingRuntime});
check('Missing runtime safely falls back to legacy capture',()=>assert.equal(fallbackBuild.widgetPipes.length,0));
yes('Missing runtime legacy path retains simple video filter',fallbackBuild.args.includes('-vf'));

check('HTTPS widget runtime URL is accepted',()=>assert.equal(rendererApi.validWidgetUrl('https://cfs-zockt.de/widgets/studio.html#token=x').startsWith('https://'),true));
check('Plain HTTP remote widget runtime URL is rejected',()=>assert.equal(rendererApi.validWidgetUrl('http://example.test/widgets/studio.html#token=x'),''));
check('Non-widget HTTPS page is rejected',()=>assert.equal(rendererApi.validWidgetUrl('https://cfs-zockt.de/account'),''));
check('Widget spec caps render FPS at 30',()=>assert.equal(rendererApi.normalizeWidgetSpec({key:'w',url:'https://cfs-zockt.de/widgets/studio.html#token=x',width:600,height:120,fps:60}).fps,30));

yes('Offscreen renderer uses Electron offscreen rendering',rendererText.includes('offscreen:true'));
yes('Offscreen renderer is sandboxed',rendererText.includes('sandbox:true')&&rendererText.includes('nodeIntegration:false')&&rendererText.includes('contextIsolation:true'));
yes('Offscreen renderer mutes widget browser audio',rendererText.includes('setAudioMuted?.(true)'));
yes('Offscreen renderer enforces BGRA-sized frame buffers',rendererText.includes('spec.width*spec.height*4'));
yes('Renderer fanout respects writable backpressure',rendererText.includes('attachment.blocked')&&rendererText.includes('"drain"'));

let spawnOptions=null,attached=null,detached=false,childRef=null;
const manager={attach(key,writable,meta){attached={key,writable,meta};return()=>{detached=true}}};
const spawnFn=(_file,_args,opts)=>{
  spawnOptions=opts;
  const child=new EventEmitter();child.stderr=new EventEmitter();child.stdin={write(){}};child.stdio=Array.from({length:opts.stdio.length},()=>null);child.stdio[0]=child.stdin;child.stdio[2]=child.stderr;
  for(let i=3;i<opts.stdio.length;i++)child.stdio[i]=new PassThrough();
  child.kill=()=>{};childRef=child;return child;
};
const pipeEngine=new StreamEngine({platform:'win32',spawnFn,widgetFrameSourceManager:manager});pipeEngine.ffmpegPath='ffmpeg-test';
pipeEngine.launchProcess('pipe-test',['-version'],{reconnect:false,widgetPipes:[{fd:3,key:'widget:1',fps:30,width:600,height:120}]});
check('FFmpeg child receives extra stdio pipe',()=>assert.equal(spawnOptions.stdio.length,4));
check('Widget manager attaches to matching child pipe',()=>assert.equal(attached.key,'widget:1'));
check('Widget pipe metadata is forwarded',()=>assert.equal(attached.meta.width,600));
childRef.emit('close',0);
check('Widget pipe detaches when FFmpeg exits',()=>assert.equal(detached,true));

check('Stream Engine exports combined compiler path',()=>assert.equal(engineText.includes('compileSceneVideoFilters'),true));
yes('Stream Engine prepares widget sources before start',engineText.includes('widgetFrameSourceManager.prepare(widgetSpecs)'));
yes('Launcher creates WidgetLayerRenderer',main.includes('new WidgetLayerRenderer({BrowserWindow,logger})'));
yes('Launcher injects widget renderer into StreamEngine',main.includes('widgetFrameSourceManager:widgetLayerRenderer'));
yes('Bridge hydrates program scene runtime layouts',server.includes('runtime_layouts:runtime?.layouts||{}'));
yes('Bridge advertises hybrid offscreen scene graph',server.includes('scene_graph:"hybrid_offscreen"'));
yes('Bridge protocol advanced to v4',server.includes('protocol:4'));
yes('Runtime summary does not expose widget source URLs',!graphApi.graphSummary(graph).widgetSources.some(row=>'url' in row||'sourceUrl' in row));
yes('Graph source code never references stream keys',!graphText.includes('streamKey')&&!graphText.includes('stream_key'));
yes('Hybrid repository check is registered',pkg.scripts?.['studio-hybrid21:check']?.includes('stream-studio-hybrid-compositor-pass21-10-14-test.mjs'));
yes('Combined Stream Studio check includes pass 21.10.14',pkg.scripts?.['stream-studio21:check']?.includes('studio-hybrid21:check'));
yes('Checklist contains pass 21.10.14 milestone',checklist.includes('Pass 21.10.14 Update – Hybrid Widget + Native Compositor'));
yes('Checklist records hybrid compositor completion',checklist.includes('Pass 21.10.14 Update – Hybrid Widget + Native Compositor'));
yes('Detail documentation exists',detail.includes('Pass 21.10.14'));

console.log(`\nStream Studio Hybrid Compositor Pass 21.10.14: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
