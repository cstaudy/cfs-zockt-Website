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
const clock=require(path.join(root,'public/assets/js/cut-audition-clock.js'));
await ok('WebAudio module exports loop wrap helper',()=>assert.equal(typeof audio.wrapLoopPosition,'function'));
await ok('Loop wrap keeps in-range value',()=>assert.equal(audio.wrapLoopPosition(12000,10000,25000),12000));
await ok('Loop wrap maps B to A',()=>assert.equal(audio.wrapLoopPosition(25000,10000,25000),10000));
await ok('Loop wrap preserves overflow remainder',()=>assert.equal(audio.wrapLoopPosition(27000,10000,25000),12000));
await ok('Loop wrap handles negative relative input',()=>assert.equal(audio.wrapLoopPosition(9000,10000,25000),24000));

const starts=[];const stops=[];let loaderCalls=[];
class FakeSource{constructor(){this.onended=null;this.buffer=null;this.stopped=false}connect(){}start(when,offset,duration){starts.push({when,offset,duration,source:this})}stop(){this.stopped=true;stops.push(this)}}
class FakeAudioContext{constructor(){this.currentTime=0;this.destination={};this.state='running';this.decodeCalls=0;FakeAudioContext.last=this}resume(){return Promise.resolve()}decodeAudioData(){this.decodeCalls++;return Promise.resolve({duration:30,sampleRate:48000})}createBufferSource(){return new FakeSource()}}
const transport=new audio.CutAuditionWebAudioTransport({AudioContextCtor:FakeAudioContext,loadSegmentBytes:async input=>{loaderCalls.push(input);return new Uint8Array(256)}});
await transport.startSession({sessionId:'loop-a',projectId:'p1',startMs:10000,endMs:25000,positionMs:10000,loopEnabled:true,loopStartMs:10000,loopEndMs:25000,segment:{cacheStartMs:0,cacheDurationMs:30000,durationMs:15000}});
await ok('Loop session is active',()=>assert.equal(transport.snapshot().active,true));
await ok('Loop session exposes loopEnabled',()=>assert.equal(transport.snapshot().loopEnabled,true));
await ok('Loop session keeps A boundary',()=>assert.equal(transport.snapshot().loopStartMs,10000));
await ok('Loop session keeps B boundary',()=>assert.equal(transport.snapshot().loopEndMs,25000));
await ok('Loop first source starts after WebAudio lead',()=>assert.equal(starts[0].when,.08));
await ok('Loop first source starts at A offset inside cache buffer',()=>assert.equal(starts[0].offset,10));
await ok('Loop first source is cut exactly at B',()=>assert.equal(starts[0].duration,15));
await ok('Loop second source starts exactly at first source end',()=>assert.equal(starts[1].when,15.08));
await ok('Loop second source restarts from A offset',()=>assert.equal(starts[1].offset,10));
await ok('Loop scheduler plans repeated cycles ahead',()=>assert.ok(starts.length>=3));
await ok('Loop telemetry records wrap',()=>assert.ok(transport.snapshot().stats.loopTransitions>=1));
await ok('Segment byte loader gets only session and segment selector',()=>assert.deepEqual(Object.keys(loaderCalls[0]).sort(),['cacheStartMs','sessionId']));
FakeAudioContext.last.currentTime=16.08;
await ok('Loop transport position wraps after B back into range',()=>assert.equal(transport.snapshot().positionMs,11000));
await transport.pause();
await ok('Loop pause preserves wrapped position',()=>assert.equal(transport.snapshot().positionMs,11000));
await ok('Loop pause stops scheduled nodes',()=>assert.ok(stops.length>=1));
const beforeResume=starts.length;
await transport.resume();
await ok('Loop resume schedules fresh sources',()=>assert.ok(starts.length>beforeResume));
await ok('Loop resume starts at preserved buffer offset',()=>assert.ok(Math.abs(starts[beforeResume].offset-11)<1e-9));
transport.stop();
await ok('Loop stop clears active session',()=>assert.equal(transport.snapshot().active,false));

let prefetch=[];const sparseStarts=[];
class SparseSource extends FakeSource{start(when,offset,duration){super.start(when,offset,duration);sparseStarts.push({when,offset,duration})}}
class SparseContext extends FakeAudioContext{createBufferSource(){return new SparseSource()}}
const sparse=new audio.CutAuditionWebAudioTransport({AudioContextCtor:SparseContext,loadSegmentBytes:async()=>new Uint8Array(256),onNeedPrefetch:ms=>prefetch.push(ms)});
await sparse.startSession({sessionId:'loop-long',startMs:10000,endMs:50000,positionMs:20000,loopEnabled:true,loopStartMs:10000,loopEndMs:50000,segment:{cacheStartMs:15000,cacheDurationMs:30000,durationMs:30000}});
await ok('Long loop schedules from current position',()=>assert.equal(sparseStarts[0].offset,5));
await ok('Long loop cuts segment at cache boundary before B',()=>assert.equal(sparseStarts[0].duration,25));
await ok('Long loop requests missing later segment locally',()=>assert.ok(prefetch.some(v=>v===45000)));

const runtime=clock.sanitizeRuntime({active:true,state:'playing',session_id:'loop-clock',position_ms:24000,start_ms:10000,end_ms:25000,loop_enabled:true,loop_start_ms:10000,loop_end_ms:25000,sampled_at_ms:1000,fresh:true});
await ok('Clock sanitizer preserves valid loop flag',()=>assert.equal(runtime.loop_enabled,true));
await ok('Clock sanitizer preserves loop start',()=>assert.equal(runtime.loop_start_ms,10000));
await ok('Clock sanitizer preserves loop end',()=>assert.equal(runtime.loop_end_ms,25000));
await ok('Clock estimator wraps B to A with remainder',()=>assert.equal(clock.estimatePosition(runtime,3000),11000));
await ok('Loop clock status is explicit',()=>assert.equal(clock.statusLabel(runtime),'LOCAL LOOPING'));
await ok('Paused loop clock status is explicit',()=>assert.equal(clock.statusLabel({...runtime,state:'paused'}),'LOOP PAUSED'));
await ok('Invalid short loop is sanitized away',()=>assert.equal(clock.sanitizeRuntime({loop_enabled:true,loop_start_ms:1000,loop_end_ms:1200,start_ms:0,end_ms:5000}).loop_enabled,false));

const server=read('server.js'),main=read('launcher/main.js'),renderer=read('launcher/renderer/app.js'),cutJs=read('public/assets/js/cut-studio.js'),cutHtml=read('public/pages/cut-studio.html'),cutCss=read('public/assets/css/cut-studio.css'),pkg=JSON.parse(read('package.json')),check=read('CFS_MASTER_CHECKLIST_PASS21.md'),doc=read('STREAM_STUDIO_AUDITION_LOOP_PASS21_10_32.md');
for(const field of ['loop_enabled BOOLEAN','loop_start_ms INTEGER','loop_end_ms INTEGER'])await ok(`Runtime table includes ${field}`,()=>assert.ok(server.includes(field)));
await ok('Runtime migration adds loop_enabled safely',()=>assert.ok(server.includes('ADD COLUMN IF NOT EXISTS loop_enabled')));
await ok('Runtime migration adds loop_start_ms safely',()=>assert.ok(server.includes('ADD COLUMN IF NOT EXISTS loop_start_ms')));
await ok('Runtime migration adds loop_end_ms safely',()=>assert.ok(server.includes('ADD COLUMN IF NOT EXISTS loop_end_ms')));
await ok('Server runtime sanitizer enforces 500ms loop minimum',()=>assert.ok(server.includes('loopEndMs-loopStartMs>=500')));
await ok('Server public runtime exposes loop flag',()=>assert.ok(server.includes('loop_enabled:row.loop_enabled===true')));
await ok('Runtime upsert persists loop metadata',()=>assert.ok(server.includes('loop_enabled,loop_start_ms,loop_end_ms,revision')));
await ok('Audition jobs accept loop_start',()=>assert.ok(server.includes('"loop_start"')));
await ok('Audition jobs accept loop_seek',()=>assert.ok(server.includes('"loop_seek"')));
await ok('Audition protocol remains schema 11+',()=>{const m=server.match(/schema:(\d+)/);assert.ok(m&&Number(m[1])>=11)});
await ok('Server rejects A/B loop shorter than 500ms',()=>assert.ok(server.includes('A/B Loop benötigt mindestens 0,5 Sekunden Auswahl.')));
await ok('Server loop job stores start boundary only as milliseconds',()=>assert.ok(server.includes('loop_start_ms:["loop_start","loop_seek"].includes(action)?loopStartMs:0')));
await ok('Server loop job stores end boundary only as milliseconds',()=>assert.ok(server.includes('loop_end_ms:["loop_start","loop_seek"].includes(action)?loopEndMs:0')));
await ok('Launcher public session exposes loopEnabled',()=>assert.ok(main.includes('loopEnabled:row.loopEnabled===true')));
await ok('Launcher clock packet includes loop metadata',()=>assert.ok(main.includes('loop_enabled:session.loopEnabled===true')));
await ok('Launcher session payload carries position separately from range start',()=>assert.ok(main.includes('positionMs:Number(session.positionMs??session.startMs??0)')));
await ok('Launcher loop session clamps current position inside A/B',()=>assert.ok(main.includes('Math.max(loopStart,Math.min(loopEnd-1')));
await ok('Launcher loop session range end is B',()=>assert.ok(main.includes('endMs=looping?loopEnd:timelineEnd')));
await ok('Launcher validates 500ms loop again locally',()=>assert.ok(main.includes('loopEndMs-loopStartMs<500')));
await ok('Renderer stores loop session metadata',()=>assert.ok(renderer.includes('loopEnabled:payload?.loopEnabled===true')));
await ok('Renderer passes loop bounds into WebAudio transport',()=>assert.ok(renderer.includes('loopStartMs:cutAuditionSession.loopStartMs,loopEndMs:cutAuditionSession.loopEndMs')));
await ok('Renderer reports loop start toast without a path',()=>assert.ok(renderer.includes('A/B Loop ·')));
await ok('WebAudio scheduler branches on active loop boundary',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('this.session.loopEnabled?this.session.loopEndMs:this.session.endMs')));
await ok('WebAudio loop scheduler limits chunks at active boundary',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('Math.min(boundary,row.cacheStartMs+row.cacheDurationMs)')));
await ok('WebAudio loop scheduler wraps cursor to A',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('cursor=this.session.loopStartMs;this.stats.loopTransitions++')));
await ok('WebAudio module contains no network access',()=>assert.ok(!/https?:\/\//i.test(read('launcher/renderer/cut-audition-web-audio.js'))));
await ok('WebAudio module contains no filesystem access',()=>assert.ok(!/require\(["']node:fs|fs\./.test(read('launcher/renderer/cut-audition-web-audio.js'))));
await ok('Cut Studio exposes visible A/B selection wrapper',()=>assert.ok(cutHtml.includes('id="cutAuditionSelection"')));
await ok('Cut Studio exposes A/B loop button',()=>assert.ok(cutHtml.includes('id="cutAuditionLoop"')));
await ok('Cut Studio exposes loop-range label',()=>assert.ok(cutHtml.includes('id="cutAuditionLoopRange"')));
await ok('Cut Studio loop request transmits only millisecond boundaries',()=>assert.ok(cutJs.includes('usesLoopBounds=["loop_start","loop_seek"')&&cutJs.includes('loop_start_ms:usesLoopBounds?loopStart:0')));
await ok('Cut Studio loop request has no local path argument',()=>{const a=cutJs.indexOf('async function requestCutAudition');const b=cutJs.indexOf('function fallbackPoints',a);assert.ok(!/filePath|previewPath|preview_path|recordingPath|cachePath/.test(cutJs.slice(a,b)))});
await ok('Cut Studio validates loop range client-side',()=>assert.ok(cutJs.includes('valid:b-a>=500')));
await ok('Cut Studio active loop scrub uses loop_seek',()=>assert.ok(cutJs.includes('looping?"loop_seek":"session_seek"')));
await ok('Cut Studio loop start begins at A marker',()=>assert.ok(cutJs.includes('action:"loop_start"')&&cutJs.includes('startMs:range.a')));
await ok('Cut Studio draws loop range with CSS variables',()=>assert.ok(cutJs.includes('--loop-left')&&cutJs.includes('--loop-width')));
await ok('Cut Studio CSS contains loop selection marker',()=>assert.ok(cutCss.includes('Pass 21.10.32')&&cutCss.includes('.cut-audition-selection')));
await ok('Clock helper remains network free',()=>assert.ok(!/fetch\(|XMLHttpRequest|https?:\/\//i.test(read('public/assets/js/cut-audition-clock.js'))));
await ok('Clock helper remains filesystem free',()=>assert.ok(!/readFile|writeFile|node:fs/i.test(read('public/assets/js/cut-audition-clock.js'))));
await ok('Root package registers Pass 21.10.32 check',()=>assert.equal(pkg.scripts['studio-ab-loop21:check'],'node tools/stream-studio-audition-loop-pass21-10-32-test.mjs .'));
await ok('Combined Stream Studio check includes Pass 21.10.32',()=>assert.ok(pkg.scripts['stream-studio21:check'].includes('studio-ab-loop21:check')));
await ok('Master checklist retains Pass 21.10.32 milestone after later passes',()=>assert.ok(check.includes('## Pass 21.10.32 Update')));
await ok('Master checklist contains Pass 21.10.32 section',()=>assert.ok(check.includes('## Pass 21.10.32 Update')));
await ok('Detail documentation exists',()=>assert.ok(doc.length>1000));
await ok('Docs explain exact B to A scheduling',()=>assert.ok(/B-Grenze|B→A|wieder ab A/i.test(doc)));
await ok('Docs state no audio and no local paths sync',()=>assert.ok(/kein Audio und keine lokalen Dateipfade/i.test(doc)));
await ok('Docs keep real Windows loop acceptance open',()=>assert.ok(/reale Windows-Abnahme bleibt offen/i.test(doc)));
await ok('Docs do not claim hardware acceptance',()=>assert.ok(/keine reale Hardware-Abnahme/i.test(doc)));

console.log(`\nStream Studio A/B Loop Audition Pass 21.10.32: ${passed}/${passed+failed} PASS`);if(failed)process.exit(1);
