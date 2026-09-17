import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const require=createRequire(import.meta.url);
const {StreamEngine}=require(path.join(root,'launcher/src/stream-engine.js'));

let pass=0;
const checks=[];
function check(name,fn){try{fn();pass++;checks.push(['PASS',name]);}catch(error){checks.push(['FAIL',name,error.message]);}}
function text(rel){return fs.readFileSync(path.join(root,rel),'utf8');}

const main=text('launcher/main.js');
const config=text('launcher/src/config-store.js');
const html=text('launcher/renderer/index.html');
const app=text('launcher/renderer/app.js');
const css=text('launcher/renderer/styles.css');
const pkg=JSON.parse(text('package.json'));
const lpkg=JSON.parse(text('launcher/package.json'));
const engineText=text('launcher/src/stream-engine.js');

for(const [name,condition] of [
  ['Second audio device is persisted',config.includes('streamAudioDevice2')],
  ['Audio bus 1 volume is persisted',config.includes('streamAudioVolume:')],
  ['Audio bus 2 volume is persisted',config.includes('streamAudioVolume2:')],
  ['Audio bus 1 mute is persisted',config.includes('streamAudioMute:')],
  ['Audio bus 2 mute is persisted',config.includes('streamAudioMute2:')],
  ['Audio bus 1 delay is persisted',config.includes('streamAudioDelayMs:')],
  ['Audio bus 2 delay is persisted',config.includes('streamAudioDelayMs2:')],
  ['Watchdog enabled setting is persisted',config.includes('streamWatchdogEnabled')],
  ['Watchdog timeout is clamped',config.includes('streamWatchdogTimeoutSec: Math.max(10, Math.min(60')],
  ['Display id is persisted',config.includes('streamDisplayId')],
  ['Crop enabled setting is persisted',config.includes('streamCropEnabled')],
  ['Crop width is bounded',config.includes('streamCropWidth: Math.max(64, Math.min(7680')],
  ['Crop height is bounded',config.includes('streamCropHeight: Math.max(64, Math.min(4320')],
  ['Main resolves selected display',main.includes('function streamDisplayRegion')],
  ['Display selection uses Electron screen inventory',main.includes('screen?.getAllDisplays?.()')],
  ['DPI conversion is attempted when available',main.includes('dipToScreenPoint')],
  ['Selected display region is passed into capture',main.includes('region:(settings.streamCaptureType||"screen")==="screen"?streamDisplayRegion')],
  ['Crop config is passed into capture',main.includes('crop:settings.streamCropEnabled===true?')],
  ['Second audio device is passed into capture',main.includes('audioDevice2:settings.streamAudioDevice2')],
  ['Audio delays are passed into capture',main.includes('audioDelayMs:settings.streamAudioDelayMs') && main.includes('audioDelayMs2:settings.streamAudioDelayMs2')],
  ['Watchdog config is passed into engine start',main.includes('watchdog:{enabled:settings.streamWatchdogEnabled!==false')],
  ['Monitor selector exists in launcher UI',html.includes('id="streamDisplayId"')],
  ['Second audio selector exists in launcher UI',html.includes('id="streamAudioDevice2"')],
  ['Audio bus 1 volume slider exists',html.includes('id="streamAudioVolume"')],
  ['Audio bus 2 volume slider exists',html.includes('id="streamAudioVolume2"')],
  ['Audio bus 1 delay control exists',html.includes('id="streamAudioDelay"')],
  ['Audio bus 2 delay control exists',html.includes('id="streamAudioDelay2"')],
  ['Audio bus 1 mute exists',html.includes('id="streamAudioMute"')],
  ['Audio bus 2 mute exists',html.includes('id="streamAudioMute2"')],
  ['Crop enable control exists',html.includes('id="streamCropEnabled"')],
  ['Crop rectangle controls exist',html.includes('id="streamCropX"') && html.includes('id="streamCropY"') && html.includes('id="streamCropWidth"') && html.includes('id="streamCropHeight"')],
  ['Watchdog control exists',html.includes('id="streamWatchdogEnabled"')],
  ['Watchdog timeout control exists',html.includes('id="streamWatchdogTimeout"')],
  ['Dropped-frame status is visible',html.includes('id="streamEngineDropped"')],
  ['Watchdog restart status is visible',html.includes('id="streamEngineWatchdog"')],
  ['Renderer loads monitor choices',app.includes('displaySelect.innerHTML')],
  ['Renderer saves audio bus settings',app.includes('audioVolume2:Number($("#streamAudioVolume2")')],
  ['Renderer saves audio delays',app.includes('audioDelayMs:Number($("#streamAudioDelay")')],
  ['Renderer saves crop settings',app.includes('cropEnabled:$("#streamCropEnabled")')],
  ['Renderer shows dropped frames',app.includes('streamEngineDropped')],
  ['Renderer shows watchdog restarts',app.includes('streamEngineWatchdog')],
  ['Audio/crop CSS exists',css.includes('Pass 21.10.2 · dual-bus audio + watchdog') && css.includes('Pass 21.10.2 · display/crop controls')],
  ['Engine has watchdog timers',engineText.includes('this.watchdogTimers=new Map()')],
  ['Engine tracks dropped frames',engineText.includes('droppedFrames')],
  ['Engine throttles progress state updates',engineText.includes('this.lastProgressEmitAt>=750') || engineText.includes('Date.now()-this.lastProgressEmitAt>=750')],
  ['Engine checks dshow for second audio bus',engineText.includes('input.capture?.audioDevice2')],
  ['Root combined stream engine check includes pass 21.10.2',pkg.scripts?.['stream-engine21:check']?.includes('stream-engine-audio-stability-pass21-10-2-test.mjs')],
  ['Root dedicated audio stability check exists',typeof pkg.scripts?.['stream-engine21:audio-check']==='string'],
  ['Launcher combined stream engine check includes pass 21.10.2',lpkg.scripts?.['test:stream-engine21']?.includes('stream-engine-audio-stability-pass21-10-2-test.mjs')],
  ['Launcher dedicated audio stability check exists',typeof lpkg.scripts?.['test:stream-engine-audio21']==='string']
])check(name,()=>assert.equal(Boolean(condition),true));

const engine=new StreamEngine({platform:'win32',env:{}});
engine.ffmpegPath='ffmpeg.exe';
engine.capabilities={gdigrab:true,dshow:true,encoders:{software:true,nvenc:false,amd:false,qsv:false}};

const dual=engine.buildCaptureArgs({
  type:'screen',fps:60,audioDevice:'Mic 1',audioDevice2:'Stereo Mix',audioVolume:1.25,audioVolume2:.7,audioMuted:false,audioMuted2:false,audioDelayMs:120,audioDelayMs2:250,
  region:{x:-1920,y:0,width:1920,height:1080}
});
check('Dual audio capture exposes two buses',()=>assert.equal(dual.audioInputs.length,2));
check('Primary audio input index follows video input',()=>assert.equal(dual.audioInputs[0].index,1));
check('Secondary audio input index is separate',()=>assert.equal(dual.audioInputs[1].index,2));
check('Screen region adds GDI offset X',()=>{const i=dual.args.indexOf('-offset_x');assert.equal(dual.args[i+1],'-1920')});
check('Screen region adds explicit video size',()=>{const i=dual.args.indexOf('-video_size');assert.equal(dual.args[i+1],'1920x1080')});
check('Duplicate audio devices are rejected',()=>assert.throws(()=>engine.buildCaptureArgs({type:'screen',audioDevice:'Same',audioDevice2:'Same'})));

const mix=engine.buildAudioMixArgs(dual);
const filter=mix.args[mix.args.indexOf('-filter_complex')+1];
check('Dual audio mixer uses amix',()=>assert.equal(filter.includes('amix=inputs=2'),true));
check('Primary audio volume is applied',()=>assert.equal(filter.includes('volume=1.250'),true));
check('Secondary audio volume is applied',()=>assert.equal(filter.includes('volume=0.700'),true));
check('Primary audio delay is applied',()=>assert.equal(filter.includes('adelay=120|120'),true));
check('Secondary audio delay is applied',()=>assert.equal(filter.includes('adelay=250|250'),true));
check('Mixed audio maps explicit video',()=>{const i=mix.args.indexOf('-map');assert.equal(mix.args[i+1],'0:v:0')});
check('Mixed audio maps mixed bus',()=>assert.equal(mix.args.includes('[cfs_audio]'),true));
check('Audio bus metadata carries delay',()=>assert.equal(mix.buses[1].delayMs,250));

const muted=engine.buildAudioMixArgs(engine.buildCaptureArgs({type:'screen',audioDevice:'Mic',audioMuted:true}));
check('Mute produces zero gain',()=>assert.equal(muted.args.join(' ').includes('volume=0.000'),true));

const enc=engine.buildEncodingArgs({profile:'1080p60',encoder:'software',bitrateKbps:6000,audioBitrateKbps:160,hasAudio:true,crop:{x:100,y:50,width:1280,height:720}});
const vf=enc.args[enc.args.indexOf('-vf')+1];
check('Crop is applied before scale',()=>assert.equal(vf.startsWith('crop=1280:720:100:50,scale='),true));
check('Encoding remains 1080p after crop',()=>assert.equal(vf.includes('scale=1920:1080'),true));

const p=engine.parseProgress('frame= 100 fps=59.9 size=1234kB bitrate=5998.1kbits/s dup=3 drop=7 speed=0.99x');
check('Progress parser reads dropped frames',()=>assert.equal(p.droppedFrames,7));
check('Progress parser reads duplicated frames',()=>assert.equal(p.duplicatedFrames,3));
check('Progress parser keeps FPS with drop metrics',()=>assert.equal(p.fps,59.9));

for(const row of checks)console.log(`${row[0]} ${row[1]}${row[2]?`: ${row[2]}`:''}`);
const failed=checks.filter(row=>row[0]==='FAIL');
console.log(`\nStream Engine Audio & Stability Pass 21.10.2: ${pass}/${checks.length} PASS`);
if(failed.length)process.exit(1);
