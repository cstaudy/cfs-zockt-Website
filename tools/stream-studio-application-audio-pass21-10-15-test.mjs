import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const require=createRequire(import.meta.url);
const {StreamEngine}=require(path.join(root,'launcher/src/stream-engine.js'));
const audioApi=require(path.join(root,'launcher/src/application-audio-source-manager.js'));
const configApi=require(path.join(root,'launcher/src/config-store.js'));

const engineText=read('launcher/src/stream-engine.js');
const managerText=read('launcher/src/application-audio-source-manager.js');
const helperText=read('launcher/native/audio-loopback/cfs-audio-loopback.cpp');
const helperBuild=read('launcher/native/audio-loopback/build.cmd');
const helperReadme=read('launcher/native/audio-loopback/README.md');
const vendorReadme=read('launcher/vendor/audio/README.txt');
const main=read('launcher/main.js');
const launcherHtml=read('launcher/renderer/index.html');
const launcherJs=read('launcher/renderer/app.js');
const launcherCss=read('launcher/renderer/styles.css');
const studioHtml=read('public/pages/stream-studio.html');
const studioJs=read('public/assets/js/stream-studio.js');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));
const launcherPkg=JSON.parse(read('launcher/package.json'));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
const detail=read('STREAM_STUDIO_APPLICATION_AUDIO_PASS21_10_15.md');

let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS ',name)}catch(error){fail++;console.log('FAIL ',name,`· ${error.message}`)}}
function yes(name,value){check(name,()=>assert.equal(Boolean(value),true))}
function has(text,fragment){return String(text).includes(fragment)}

// Native helper / API foundation.
yes('Native application-audio manager exists',managerText.includes('class ApplicationAudioSourceManager'));
yes('Native helper uses process-loopback activation type',helperText.includes('AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK'));
yes('Native helper activates virtual process-loopback device',helperText.includes('VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK'));
yes('Native helper uses ActivateAudioInterfaceAsync',helperText.includes('ActivateAudioInterfaceAsync'));
yes('Native helper includes target process tree mode',helperText.includes('PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE'));
yes('Native helper supports exclude-tree mode',helperText.includes('PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE'));
yes('Native helper callback aggregates free-threaded marshaler',helperText.includes('FtmBase')&&helperText.includes('IActivateAudioInterfaceCompletionHandler'));
yes('Native helper outputs 48 kHz PCM',helperText.includes('nSamplesPerSec=48000')&&helperText.includes('WAVE_FORMAT_PCM'));
yes('Native helper handles silent packets',helperText.includes('AUDCLNT_BUFFERFLAGS_SILENT'));
yes('Native helper has probe mode',helperText.includes('--probe')&&helperText.includes('CFS_AUDIO_LOOPBACK_V1'));
yes('Native helper build script targets vendor audio directory',helperBuild.includes('vendor\\audio')&&helperBuild.includes('cfs-audio-loopback.exe'));
yes('Native helper source documents Windows build',helperReadme.includes('Process Loopback')&&helperReadme.includes('build.cmd'));
yes('Vendor directory does not promise a checked-in binary',vendorReadme.toLowerCase().includes('binary')||vendorReadme.toLowerCase().includes('build'));

// Source normalization / persistence.
check('normalizeSpec accepts game PID',()=>assert.deepEqual(audioApi.normalizeSpec({key:'game',processId:1234,processName:'game'}),{key:'game',processId:1234,processName:'game',sampleRate:48000,channels:2,sampleFormat:'s16le',includeTree:true}));
check('normalizeSpec rejects unsupported bus',()=>assert.equal(audioApi.normalizeSpec({key:'browser',processId:1234}),null));
check('normalizeSpec rejects invalid PID',()=>assert.equal(audioApi.normalizeSpec({key:'game',processId:0}),null));
check('normalizeSpec can exclude process tree',()=>assert.equal(audioApi.normalizeSpec({key:'music',processId:33,includeTree:false}).includeTree,false));
check('Config sanitizer defines five structured audio sources',()=>assert.deepEqual(configApi.STREAM_AUDIO_SOURCE_KEYS,['mic','game','discord','music','alerts']));
const cleanSources=configApi.normalizeStreamAudioSources({mic:{enabled:true,deviceName:'USB Mic',volume:5,delayMs:9999},game:{enabled:true,processId:42,processName:'game',volume:-1},discord:{enabled:true,processId:-2}});
check('Mic volume is capped at 2x',()=>assert.equal(cleanSources.mic.volume,2));
check('Mic delay is capped at 2000 ms',()=>assert.equal(cleanSources.mic.delayMs,2000));
check('Game PID survives sanitizer',()=>assert.equal(cleanSources.game.processId,42));
check('Game volume is floored at zero',()=>assert.equal(cleanSources.game.volume,0));
check('Invalid application PID is reset',()=>assert.equal(cleanSources.discord.processId,0));
check('Config defaults expose all five sources',()=>assert.deepEqual(Object.keys(configApi.DEFAULTS.streamAudioSources),['mic','game','discord','music','alerts']));

// Manager lifecycle and fan-out behavior.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-audio15-'));
const fakeHelper=path.join(tmp,'cfs-audio-loopback.exe');fs.writeFileSync(fakeHelper,'fake');
let spawned=0,spawnArgs=null,childRef=null;
const spawnFn=(_file,args)=>{spawned++;spawnArgs=args;const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{child.killed=true};childRef=child;return child};
const manager=new audioApi.ApplicationAudioSourceManager({platform:'win32',env:{CFS_AUDIO_LOOPBACK_PATH:fakeHelper},spawnFn});
check('Manager probe finds helper from env override',()=>assert.equal(manager.probe().available,true));
manager.prepare([{key:'game',processId:999,processName:'ExampleGame'}]);
check('Manager prepares one application source',()=>assert.equal(manager.snapshot().prepared,1));
const sink1=new PassThrough(),sink2=new PassThrough();let bytes1=0,bytes2=0;sink1.on('data',b=>bytes1+=b.length);sink2.on('data',b=>bytes2+=b.length);
const detach1=manager.attach('game',sink1);const detach2=manager.attach('game',sink2);
check('Manager starts only one helper for two destination sinks',()=>assert.equal(spawned,1));
yes('Manager passes target PID to helper',spawnArgs.includes('--pid')&&spawnArgs.includes('999'));
yes('Manager requests process-tree capture by default',spawnArgs.includes('--include-tree'));
childRef.stdout.emit('data',Buffer.from([1,2,3,4]));
check('Manager fans PCM to first destination',()=>assert.equal(bytes1,4));
check('Manager fans PCM to second destination',()=>assert.equal(bytes2,4));
check('Manager snapshot records two attachments',()=>assert.equal(manager.snapshot().sources[0].attachments,2));
detach1();check('Helper remains alive while another destination is attached',()=>assert.equal(Boolean(childRef.killed),false));
detach2();check('Helper stops after final destination detaches',()=>assert.equal(Boolean(childRef.killed),true));
manager.releaseAll();check('Manager release clears prepared sources',()=>assert.equal(manager.snapshot().prepared,0));

// FFmpeg input and recording graph.
const engine=new StreamEngine({platform:'win32'});
engine.capabilities={gdigrab:true,dshow:true,processLoopback:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
const structuredCapture={type:'screen',drawMouse:true,audioSources:{
  mic:{enabled:true,deviceName:'USB Mic',volume:.8,delayMs:20},
  game:{enabled:true,processId:101,processName:'Game.exe',volume:1},
  discord:{enabled:true,processId:202,processName:'Discord.exe',volume:.7,muted:true},
  music:{enabled:false,processId:303,processName:'Music.exe'},
  alerts:{enabled:true,processId:404,processName:'Alerts.exe',delayMs:45}
}};
const audioInputs=engine.buildStructuredAudioInputs(structuredCapture,1,3);
check('Structured capture creates four active audio inputs',()=>assert.equal(audioInputs.audioInputs.length,4));
check('Mic remains a DirectShow input',()=>assert.equal(audioInputs.audioInputs.find(x=>x.key==='mic')?.kind,'device'));
check('Game becomes a process input',()=>assert.equal(audioInputs.audioInputs.find(x=>x.key==='game')?.kind,'process'));
check('Three enabled app sources become pipe bindings',()=>assert.equal(audioInputs.audioPipes.length,3));
check('Application audio pipes start at supplied FD',()=>assert.deepEqual(audioInputs.audioPipes.map(x=>x.fd),[3,4,5]));
yes('Structured FFmpeg args contain raw s16le source',audioInputs.args.includes('s16le'));
yes('Structured FFmpeg args contain 48k sample rate',audioInputs.args.includes('48000'));
yes('Structured FFmpeg args contain DirectShow mic selector',audioInputs.args.some(x=>String(x).includes('audio=USB Mic')));
check('Structured capture rejects duplicate application PID',()=>assert.throws(()=>engine.buildStructuredAudioInputs({audioSources:{game:{enabled:true,processId:7},discord:{enabled:true,processId:7}}}),/mehreren Application-Audio-Bussen/));
const captureBuilt=engine.buildCaptureWithAudio(structuredCapture,60,3);
yes('Capture keeps gdigrab video',captureBuilt.args.includes('gdigrab'));
check('Capture returns app-audio pipe metadata',()=>assert.equal(captureBuilt.audioPipes.length,3));
const mix=engine.buildAudioMixPlan(captureBuilt);
check('Stream mix combines all four active buses',()=>assert.equal(mix.buses.length,4));
yes('Muted Discord bus compiles to zero volume',mix.filters.some(x=>x.includes('volume=0.000')));
yes('Per-source delay compiles into adelay',mix.filters.some(x=>x.includes('adelay=45|45')));
const rec=engine.buildRecordingAudioPlan(captureBuilt,{mix:true,mic:true,game:true,discord:true,music:true,alerts:true});
check('Recording writes mix plus four active direct tracks',()=>assert.equal(rec.tracks.length,5));
check('Recording first track is Stream Mix',()=>assert.deepEqual(rec.tracks[0],{key:'mix',title:'Stream Mix'}));
yes('Recording exposes Mic track',rec.tracks.some(x=>x.key==='mic'&&x.title==='Mic'));
yes('Recording exposes Game track',rec.tracks.some(x=>x.key==='game'&&x.title==='Game'));
yes('Recording exposes Discord track',rec.tracks.some(x=>x.key==='discord'&&x.title==='Discord'));
yes('Recording exposes Alerts track',rec.tracks.some(x=>x.key==='alerts'&&x.title==='Alerts'));
check('Disabled Music source creates no recording track',()=>assert.equal(rec.tracks.some(x=>x.key==='music'),false));
check('Recording can disable a direct source track while retaining mix',()=>assert.equal(engine.buildRecordingAudioPlan(captureBuilt,{mix:true,mic:true,game:false,discord:false,alerts:false}).tracks.some(x=>x.key==='game'),false));
const legacy=engine.buildRecordingAudioPlan({audioInputs:[{index:1,device:'Mic',bus:'audio1',volume:1},{index:2,device:'Desktop',bus:'audio2',volume:1}]},{mix:true,audio1:true,audio2:true});
check('Legacy recording still creates three tracks',()=>assert.equal(legacy.tracks.length,3));
yes('Legacy recording keeps historical Audio 1 label',legacy.tracks.some(x=>x.title==='Audio 1 · Mic/Mix'));
yes('Legacy recording keeps historical Audio 2 label',legacy.tracks.some(x=>x.title==='Audio 2 · Desktop/Loopback'));

// Pipe allocation with widget + audio sources must not collide.
const routing={live:true,recording:true,landscape:true,tiktok_vertical:true};
const widgetItem={id:'widget-1',source_kind:'widget',source_id:'wid',widget_id:'wid',visible:true,x:0,y:0,scale:1,opacity:1,rotation:0,z_index:2,routing,filters:{brightness:1,contrast:1,saturation:1,blur_px:0},crop:{left:0,top:0,right:0,bottom:0}};
const webScene={id:'web-audio',published_config:{profile:'landscape',layouts:{landscape:{canvas:{width:1920,height:1080,background:'transparent'},items:[widgetItem]},tiktok_vertical:{canvas:{width:1080,height:1920},items:[]}}},runtime_layouts:{landscape:{items:[{...widgetItem,widget:{id:'wid',name:'Alerts',source_url:'https://cfs-zockt.de/widgets/studio.html#token=x',canvas:{width:600,height:120}}}]}}};
const combined=engine.buildStreamArgs({capture:structuredCapture,target:{id:'yt',profile:'1080p60',encoder:'software',bitrate_kbps:6000,audio_bitrate_kbps:160},credential:{serverUrl:'rtmps://example.test/live',streamKey:'secret'},scene:webScene});
check('Widget+audio scene has one widget pipe',()=>assert.equal(combined.widgetPipes.length,1));
check('Widget+audio scene has three app audio pipes',()=>assert.equal(combined.audioPipes.length,3));
check('Audio FDs begin after widget FD range',()=>assert.equal(Math.min(...combined.audioPipes.map(x=>x.fd))>Math.max(...combined.widgetPipes.map(x=>x.fd)),true));
check('Widget and audio pipe FDs are unique',()=>assert.equal(new Set([...combined.widgetPipes,...combined.audioPipes].map(x=>x.fd)).size,4));

// launchProcess attaches both managers to their dedicated child pipes.
let childOptions=null,widgetAttached=0,audioAttached=0,widgetDetached=0,audioDetached=0,procChild=null;
const spawnProcess=(_file,_args,opts)=>{childOptions=opts;const child=new EventEmitter();child.stderr=new EventEmitter();child.stdin={write(){}};child.stdio=Array.from({length:opts.stdio.length},()=>null);child.stdio[0]=child.stdin;child.stdio[2]=child.stderr;for(let i=3;i<opts.stdio.length;i++)child.stdio[i]=new PassThrough();child.kill=()=>{};procChild=child;return child};
const pipeEngine=new StreamEngine({platform:'win32',spawnFn:spawnProcess,widgetFrameSourceManager:{attach(){widgetAttached++;return()=>{widgetDetached++}}},applicationAudioSourceManager:{attach(){audioAttached++;return()=>{audioDetached++}}}});pipeEngine.ffmpegPath='ffmpeg-test';
pipeEngine.launchProcess('combo',['-version'],{reconnect:false,widgetPipes:[{fd:3,key:'widget'}],audioPipes:[{fd:4,key:'game'},{fd:5,key:'discord'}]});
check('Combined child stdio covers highest audio FD',()=>assert.equal(childOptions.stdio.length,6));
check('Widget pipe attaches once',()=>assert.equal(widgetAttached,1));
check('Audio pipes attach twice',()=>assert.equal(audioAttached,2));
procChild.emit('close',0);
check('Widget pipe detaches on process exit',()=>assert.equal(widgetDetached,1));
check('Audio pipes detach on process exit',()=>assert.equal(audioDetached,2));
check('Internal pipe collision is rejected',()=>assert.throws(()=>pipeEngine.launchProcess('collision',['-version'],{reconnect:false,widgetPipes:[{fd:3,key:'w'}],audioPipes:[{fd:3,key:'game'}]}),/Pipe-Konflikt/));

// Launcher / Studio wiring.
yes('Launcher enumerates Windows processes',main.includes('Get-Process')&&main.includes('ConvertTo-Json -Compress'));
yes('Launcher resolves structured audio sources',main.includes('resolveStreamAudioSources'));
yes('Launcher rebinds PID by process name',main.includes('byName(processName)'));
yes('Launcher combines cloud and local source volume',main.includes('localVolume*cloudVolume'));
yes('Launcher maps Studio microphone bus onto local mic source',main.includes('key==="mic"?"microphone":key'));
yes('Launcher injects application-audio manager into StreamEngine',main.includes('applicationAudioSourceManager'));
yes('Launcher preflight checks process loopback helper',main.includes('WASAPI')||main.includes('Process-Loopback'));
yes('Launcher capture devices response includes process candidates',main.includes('processes,applicationAudio'));
for(const key of ['Game','Discord','Music','Alerts'])yes(`Launcher UI exposes ${key} application-audio bus`,launcherHtml.includes(`streamAudio${key}Enabled`)&&launcherHtml.includes(`streamAudioProcess${key}`));
yes('Launcher UI displays application audio helper state',launcherHtml.includes('streamApplicationAudioStatus')||launcherHtml.includes('streamApplicationAudio'));
yes('Launcher renderer saves structured audioSources',launcherJs.includes('audioSources'));
yes('Launcher renderer populates process selectors',launcherJs.includes('data-process-name'));
yes('Launcher app-audio rows have dedicated styles',launcherCss.includes('.stream-app-audio-bus'));
for(const id of ['streamRecordingTrackMix','streamRecordingTrackMic','streamRecordingTrackGame','streamRecordingTrackDiscord','streamRecordingTrackMusic','streamRecordingTrackAlerts'])yes(`Studio recording UI exposes ${id}`,studioHtml.includes(`id="${id}"`));
yes('Studio still carries legacy recording aliases',studioHtml.includes('streamRecordingTrackAudio1')&&studioHtml.includes('streamRecordingTrackAudio2'));
yes('Studio mixer includes GAME bus',studioHtml.includes('data-audio="game"')||studioHtml.includes('GAME'));
yes('Studio mixer includes DISCORD bus',studioHtml.includes('data-audio="discord"')||studioHtml.includes('DISCORD'));
yes('Studio config defaults advanced to version 4',studioJs.includes('version:4'));
yes('Server stream config defaults advanced to version 4',server.includes('version:4'));
yes('Server accepts five source recording tracks',server.includes('tracks.discord')&&server.includes('tracks.alerts'));
yes('Server migrates legacy desktop audio into game bus',server.includes('audio.desktop')&&server.includes('game'));

// Packaging, docs and security boundaries.
yes('Root package registers pass 21.10.15 check',pkg.scripts?.['studio-audio21:check']?.includes('stream-studio-application-audio-pass21-10-15-test.mjs'));
yes('Combined Stream Studio check includes pass 21.10.15',pkg.scripts?.['stream-studio21:check']?.includes('studio-audio21:check'));
yes('Launcher exposes helper build command',launcherPkg.scripts?.['audio-helper:build']?.includes('audio-loopback'));
yes('Launcher combined engine tests include audio pass',launcherPkg.scripts?.['test:stream-engine21']?.includes('stream-studio-application-audio-pass21-10-15-test.mjs'));
yes('Electron builder stages vendor audio resources',JSON.stringify(launcherPkg.build?.extraResources||[]).includes('vendor/audio'));
yes('Checklist retains pass 21.10.15 milestone',checklist.includes('Pass 21.10.15 Update – Windows Application Audio Capture + Multi-Track Audio Foundation'));
yes('Checklist records multi-track foundation',checklist.includes('Pass 21.10.15 Update – Windows Application Audio Capture + Multi-Track Audio Foundation'));
yes('Detail documentation exists',detail.includes('Pass 21.10.15')&&detail.includes('Game / Discord / Music / Alerts'));
yes('Application audio manager contains no network clients',!managerText.includes('fetch(')&&!managerText.includes('http://')&&!managerText.includes('https://'));
yes('Native helper contains no RTMP or stream key handling',!helperText.toLowerCase().includes('rtmp')&&!helperText.toLowerCase().includes('streamkey')&&!helperText.toLowerCase().includes('stream_key'));
yes('Engine caps exposed audio-track telemetry to eight tracks',engineText.includes('slice(0,8)'));

fs.rmSync(tmp,{recursive:true,force:true});
console.log(`\nStream Studio Application Audio Pass 21.10.15: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
