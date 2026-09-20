import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let passed=0,failed=0;async function ok(name,fn){try{await fn();console.log('PASS',name);passed++}catch(error){console.error('FAIL',name);console.error(error?.stack||error);failed++}}

const audio=require(path.join(root,'launcher/renderer/cut-audition-web-audio.js'));
const cut=require(path.join(root,'lib/creator-cut-studio.js'));
await ok('WebAudio module still exports transport',()=>assert.equal(typeof audio.CutAuditionWebAudioTransport,'function'));
await ok('Loop shape defaults click guard off at transport level',()=>assert.equal(audio.loopShape({loopEnabled:true,loopStartMs:10000,loopEndMs:25000,startMs:0,endMs:30000}).loopCrossfadeMs,0));
await ok('Loop shape preserves requested 12 ms',()=>assert.equal(audio.loopShape({loopEnabled:true,loopStartMs:10000,loopEndMs:25000,loopCrossfadeMs:12,startMs:0,endMs:30000}).loopCrossfadeMs,12));
await ok('Loop shape clamps click guard to 50 ms',()=>assert.equal(audio.loopShape({loopEnabled:true,loopStartMs:10000,loopEndMs:25000,loopCrossfadeMs:999,startMs:0,endMs:30000}).loopCrossfadeMs,50));
await ok('Disabled loop has no click guard',()=>assert.equal(audio.loopShape({loopEnabled:false,loopCrossfadeMs:50,startMs:0,endMs:30000}).loopCrossfadeMs,0));
await ok('Short invalid loop has no click guard',()=>assert.equal(audio.loopShape({loopEnabled:true,loopStartMs:1000,loopEndMs:1200,loopCrossfadeMs:50,startMs:0,endMs:5000}).loopCrossfadeMs,0));

const starts=[],gains=[],connections=[];let decodeCalls=0;
class FakeParam{constructor(id){this.id=id;this.events=[]}setValueAtTime(value,time){this.events.push({type:'set',value,time})}linearRampToValueAtTime(value,time){this.events.push({type:'ramp',value,time})}}
class FakeGain{constructor(id){this.id=id;this.gain=new FakeParam(id)}connect(dest){connections.push({kind:'gain',id:this.id,dest})}}
class FakeSource{constructor(id){this.id=id;this.buffer=null;this.onended=null;this.stopped=false}connect(dest){connections.push({kind:'source',id:this.id,dest})}start(when,offset,duration){starts.push({id:this.id,when,offset,duration})}stop(){this.stopped=true}}
class FakeAudioContext{
  constructor(){this.currentTime=0;this.destination={kind:'destination'};this.state='running';this.sourceId=0;this.gainId=0;FakeAudioContext.last=this}
  resume(){return Promise.resolve()}
  decodeAudioData(){decodeCalls++;return Promise.resolve({duration:30,sampleRate:48000})}
  createBufferSource(){return new FakeSource(++this.sourceId)}
  createGain(){const g=new FakeGain(++this.gainId);gains.push(g);return g}
}
const transport=new audio.CutAuditionWebAudioTransport({AudioContextCtor:FakeAudioContext,loadSegmentBytes:async()=>new Uint8Array(256)});
await transport.startSession({sessionId:'guard-a',projectId:'p1',startMs:10000,endMs:25000,positionMs:10000,loopEnabled:true,loopStartMs:10000,loopEndMs:25000,loopCrossfadeMs:12,segment:{cacheStartMs:0,cacheDurationMs:30000,durationMs:15000}});
await ok('Click guard session remains active',()=>assert.equal(transport.snapshot().active,true));
await ok('Snapshot exposes effective click guard',()=>assert.equal(transport.snapshot().loopCrossfadeMs,12));
await ok('First loop source begins at A',()=>assert.equal(starts[0].offset,10));
await ok('First loop source keeps full 15 second duration',()=>assert.equal(starts[0].duration,15));
await ok('First loop source starts after 80ms lead',()=>assert.equal(starts[0].when,.08));
await ok('Second loop round begins exactly 15 seconds later',()=>assert.ok(Math.abs(starts[1].when-15.08)<1e-9));
await ok('Third loop round begins exactly 30 seconds later',()=>assert.ok(Math.abs(starts[2].when-30.08)<1e-9));
await ok('Loop rounds restart exactly at A rather than A plus fade',()=>assert.equal(starts[1].offset,10));
await ok('Loop period does not shrink by click guard',()=>assert.ok(Math.abs((starts[2].when-starts[1].when)-15)<1e-9));
await ok('First source receives GainNode',()=>assert.ok(gains.length>=2));
await ok('First source fade-out starts 12ms before B',()=>assert.ok(gains[0].gain.events.some(e=>e.type==='set'&&e.value===1&&Math.abs(e.time-15.068)<1e-9)));
await ok('First source reaches zero exactly at B',()=>assert.ok(gains[0].gain.events.some(e=>e.type==='ramp'&&e.value===0&&Math.abs(e.time-15.08)<1e-9)));
await ok('Second source starts at zero exactly at B',()=>assert.ok(gains[1].gain.events.some(e=>e.type==='set'&&e.value===0&&Math.abs(e.time-15.08)<1e-9)));
await ok('Second source reaches full gain after 12ms',()=>assert.ok(gains[1].gain.events.some(e=>e.type==='ramp'&&e.value===1&&Math.abs(e.time-15.092)<1e-9)));
await ok('Click guard telemetry counts boundary fades',()=>assert.ok(transport.snapshot().stats.loopCrossfades>=2));
await ok('Click guard path has no fallback with GainNode',()=>assert.equal(transport.snapshot().stats.loopCrossfadeFallbacks,0));
await ok('Click guard does not cause extra decode for one cached segment',()=>assert.equal(decodeCalls,1));
FakeAudioContext.last.currentTime=15.08;
await ok('Clock still wraps at exact B boundary',()=>assert.equal(transport.snapshot().positionMs,10000));
FakeAudioContext.last.currentTime=16.08;
await ok('Clock is one second into next loop after exact boundary',()=>assert.equal(transport.snapshot().positionMs,11000));
await transport.pause();
await ok('Pause keeps exact wrapped position',()=>assert.equal(transport.snapshot().positionMs,11000));
const beforeResume=starts.length;await transport.resume();
await ok('Resume reschedules click-guard loop',()=>assert.ok(starts.length>beforeResume));
await ok('Resume starts from preserved timeline offset',()=>assert.ok(Math.abs(starts[beforeResume].offset-11)<1e-9));
transport.stop();
await ok('Stop clears click-guard session',()=>assert.equal(transport.snapshot().active,false));

let noGainStarts=[];
class NoGainSource extends FakeSource{start(when,offset,duration){noGainStarts.push({when,offset,duration})}}
class NoGainContext{constructor(){this.currentTime=0;this.destination={};this.state='running'}resume(){return Promise.resolve()}decodeAudioData(){return Promise.resolve({duration:30,sampleRate:48000})}createBufferSource(){return new NoGainSource(1)}}
const noGain=new audio.CutAuditionWebAudioTransport({AudioContextCtor:NoGainContext,loadSegmentBytes:async()=>new Uint8Array(256)});
await noGain.startSession({sessionId:'guard-fallback',startMs:10000,endMs:25000,positionMs:10000,loopEnabled:true,loopStartMs:10000,loopEndMs:25000,loopCrossfadeMs:12,segment:{cacheStartMs:0,cacheDurationMs:30000}});
await ok('Missing GainNode keeps loop playback functional',()=>assert.ok(noGainStarts.length>=2));
await ok('Missing GainNode keeps exact hard-boundary loop period',()=>assert.ok(Math.abs(noGainStarts[1].when-15.08)<1e-9));
await ok('Missing GainNode records controlled fallback',()=>assert.ok(noGain.snapshot().stats.loopCrossfadeFallbacks>=1));
noGain.stop();

const sanitizedDefault=cut.sanitizeCutProject({export_preset:{}}).export_preset;
const sanitizedHigh=cut.sanitizeCutProject({export_preset:{audition_loop_crossfade_ms:999}}).export_preset;
const sanitizedLow=cut.sanitizeCutProject({export_preset:{audition_loop_crossfade_ms:-10}}).export_preset;
await ok('Cut project defaults click guard to 12ms',()=>assert.equal(sanitizedDefault.audition_loop_crossfade_ms,12));
await ok('Cut project clamps click guard to 50ms',()=>assert.equal(sanitizedHigh.audition_loop_crossfade_ms,50));
await ok('Cut project clamps negative click guard to zero',()=>assert.equal(sanitizedLow.audition_loop_crossfade_ms,0));

const server=read('server.js'),main=read('launcher/main.js'),renderer=read('launcher/renderer/app.js'),webAudio=read('launcher/renderer/cut-audition-web-audio.js'),cutJs=read('public/assets/js/cut-studio.js'),cutHtml=read('public/pages/cut-studio.html'),cutCss=read('public/assets/css/cut-studio.css'),cutLib=read('lib/creator-cut-studio.js'),pkg=JSON.parse(read('package.json')),check=read('CFS_MASTER_CHECKLIST_PASS21.md'),doc=read('STREAM_STUDIO_LOOP_CLICK_GUARD_PASS21_10_33.md');
await ok('Server audition protocol keeps schema 12 milestone or newer',()=>{const matches=[...server.matchAll(/schema:(\d+),\s*kind:"cut_audition"/g)];assert.ok(matches.some(m=>Number(m[1])>=12))});
await ok('Server accepts loop_crossfade_ms only as numeric metadata',()=>assert.ok(server.includes('loop_crossfade_ms')));
await ok('Server clamps requested click guard to 50ms',()=>assert.ok(server.includes('Math.min(50,Math.round(Number(input?.loop_crossfade_ms??12)')));
await ok('Server stores click guard only for loop actions',()=>assert.ok(server.includes('loop_crossfade_ms:["loop_start","loop_seek"].includes(action)')));
await ok('Server also clamps stored click guard to loop fraction',()=>assert.ok(server.includes('Math.floor((loopEndMs-loopStartMs)/4)')));
await ok('Audition request schema still carries no local path input',()=>{const a=server.indexOf('async function createCutAuditionJob');const b=server.indexOf('async function transitionCutExportJob',a);assert.ok(!/file_path|filePath|preview_path|recording_path|cache_path/.test(server.slice(a,b)))});
await ok('Launcher parses loop click guard from manifest',()=>assert.ok(main.includes('audition.loop_crossfade_ms')));
await ok('Launcher hard-clamps loop click guard to 50ms',()=>assert.ok(main.includes('Math.min(50,Math.round(Number(loopCrossfadeMs)||0)')));
await ok('Launcher clamps click guard against active loop length',()=>assert.ok(main.includes('Math.floor((loopEnd-loopStart)/4)')));
await ok('Launcher public session exposes click guard milliseconds',()=>assert.ok(main.includes('loopCrossfadeMs:Number(row.loopCrossfadeMs||0)')));
await ok('Launcher local session payload exposes click guard but no path',()=>{const a=main.indexOf('function cutAuditionSessionPayload');const b=main.indexOf('function cutAuditionSegmentBytes',a);const block=main.slice(a,b);assert.ok(block.includes('loopCrossfadeMs:Number(session.loopCrossfadeMs||0)'));assert.ok(!block.includes('filePath'))});
await ok('Launcher passes click guard into session start',()=>assert.ok(main.includes('loopEnabled:looping,loopStartMs,loopEndMs,loopCrossfadeMs')));
await ok('Renderer stores click guard in local session state',()=>assert.ok(renderer.includes('loopCrossfadeMs:Number(payload?.loopCrossfadeMs||0)')));
await ok('Renderer passes click guard into WebAudio transport',()=>assert.ok(renderer.includes('loopCrossfadeMs:cutAuditionSession.loopCrossfadeMs')));
await ok('Renderer toast surfaces local click guard value',()=>assert.ok(renderer.includes('CLICK ${cutAuditionSession.loopCrossfadeMs')));
await ok('WebAudio snapshot exposes click guard',()=>assert.ok(webAudio.includes('loopCrossfadeMs:Number(this.session?.loopCrossfadeMs||0)')));
await ok('WebAudio click guard uses GainNode',()=>assert.ok(webAudio.includes('this.context.createGain()')));
await ok('WebAudio click guard fades outgoing loop tail to zero',()=>assert.ok(webAudio.includes('linearRampToValueAtTime(0,scheduleWhen+availableMs/1000)')));
await ok('WebAudio click guard fades incoming loop head from zero',()=>assert.ok(webAudio.includes('param.setValueAtTime(incomingFadeMs>0?0:1,scheduleWhen)')));
await ok('WebAudio click guard keeps scheduleWhen advancing by full available duration',()=>assert.ok(webAudio.includes('scheduleWhen+=availableMs/1000;cursor+=availableMs')));
await ok('WebAudio next loop cursor returns exactly to A',()=>assert.ok(webAudio.includes('cursor=this.session.loopStartMs;this.scheduleFadeInMs=crossfadeMs')));
await ok('WebAudio click guard has local fallback telemetry',()=>assert.ok(webAudio.includes('loopCrossfadeFallbacks')));
await ok('WebAudio module remains network free',()=>assert.ok(!/https?:\/\//i.test(webAudio)));
await ok('WebAudio module remains filesystem free',()=>assert.ok(!/node:fs|readFileSync|writeFileSync/.test(webAudio)));
await ok('Cut project sanitizer persists click guard',()=>assert.ok(cutLib.includes('audition_loop_crossfade_ms')));
await ok('Cut Studio exposes CLICK GUARD control',()=>assert.ok(cutHtml.includes('id="cutAuditionCrossfade"')));
await ok('Cut Studio includes off click guard option',()=>assert.ok(cutHtml.includes('<option value="0">AUS</option>')));
await ok('Cut Studio includes 12ms default option',()=>assert.ok(cutHtml.includes('<option value="12">12 ms</option>')));
await ok('Cut Studio includes 50ms maximum option',()=>assert.ok(cutHtml.includes('<option value="50">50 ms</option>')));
await ok('Cut Studio request sends loop_crossfade_ms',()=>assert.ok(cutJs.includes('loop_crossfade_ms:["loop_start","loop_seek"].includes(action)?loopCrossfade:0')));
await ok('Cut Studio request clamps click guard to 50ms',()=>assert.ok(cutJs.includes('Math.min(50,Math.round(Number(loopCrossfadeMs===null?auditionCrossfadeMs():loopCrossfadeMs)')));
await ok('Cut Studio persists click guard in project payload',()=>assert.ok(cutJs.includes('audition_loop_crossfade_ms:auditionCrossfadeMs()')));
await ok('Cut Studio restores click guard from project',()=>assert.ok(cutJs.includes('p.export_preset?.audition_loop_crossfade_ms??12')));
await ok('Cut Studio range badge shows click guard',()=>assert.ok(cutJs.includes('CLICK ${effective?`${effective} ms`:"AUS"}')));
await ok('Cut Studio selection exposes click guard state',()=>assert.ok(cutJs.includes('selection.dataset.crossfade')));
await ok('Cut Studio click guard request has no local path argument',()=>{const a=cutJs.indexOf('async function requestCutAudition');const b=cutJs.indexOf('function fallbackPoints',a);assert.ok(!/filePath|previewPath|preview_path|recordingPath|cachePath/.test(cutJs.slice(a,b)))});
await ok('Cut Studio CSS contains Pass 21.10.33 marker',()=>assert.ok(cutCss.includes('Pass 21.10.33')));
await ok('Cut Studio CSS styles click guard selector',()=>assert.ok(cutCss.includes('.cut-audition-crossfade')));
await ok('Cut Studio notice states loop period is not shortened',()=>assert.ok(/ohne die Loop-Periode zu verkürzen/.test(cutHtml)));
await ok('Root package registers Pass 21.10.33 test',()=>assert.equal(pkg.scripts['studio-loop-click-guard21:check'],'node tools/stream-studio-loop-click-guard-pass21-10-33-test.mjs .'));
await ok('Combined Stream Studio check includes Pass 21.10.33',()=>assert.ok(pkg.scripts['stream-studio21:check'].includes('studio-loop-click-guard21:check')));
await ok('Master checklist keeps Pass 21.10.33 milestone documented',()=>assert.ok(check.includes('## Pass 21.10.33 Update')));
await ok('Master checklist contains Pass 21.10.33 section',()=>assert.ok(check.includes('## Pass 21.10.33 Update')));
await ok('Pass detail documentation exists',()=>assert.ok(doc.length>1800));
await ok('Docs explain exact loop period preservation',()=>assert.ok(/Loop-Periode bleibt exakt|A→B-Länge nicht/i.test(doc)));
await ok('Docs explain outgoing and incoming gain ramps',()=>assert.ok(/linear von 1 auf 0|von 0 auf 1/i.test(doc)));
await ok('Docs state no local media paths cross web boundary',()=>assert.ok(/keine Recording-Dateien, Cache-WAV-Pfade/i.test(doc)));
await ok('Docs keep real Windows acceptance open',()=>assert.ok(/reale Windows-Abnahme bleibt offen/i.test(doc)));
await ok('Docs do not claim Windows hardware click-free acceptance',()=>assert.ok(/nicht behauptet werden.*hörbar klickfrei/i.test(doc)));

console.log(`\nStream Studio Loop Click Guard Pass 21.10.33: ${passed}/${passed+failed} PASS`);if(failed)process.exit(1);
