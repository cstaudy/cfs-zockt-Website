import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let passed=0,failed=0;
async function ok(name,fn){try{await fn();console.log('PASS',name);passed++}catch(error){console.error('FAIL',name);console.error(error?.stack||error);failed++}}

const transportModule=require(path.join(root,'launcher/renderer/cut-audition-web-audio.js'));
const {CutAuditionWebAudioTransport,segmentShape}=transportModule;

await ok('WebAudio transport module exports constructor',()=>assert.equal(typeof CutAuditionWebAudioTransport,'function'));
await ok('Segment shape strips local preview path',()=>assert.equal('previewPath' in segmentShape({previewPath:'C:/secret.wav',cacheStartMs:1,cacheDurationMs:2}),false));
await ok('Segment shape clamps negative start',()=>assert.equal(segmentShape({cacheStartMs:-50}).cacheStartMs,0));
await ok('Segment shape preserves cache duration',()=>assert.equal(segmentShape({cacheDurationMs:30000}).cacheDurationMs,30000));
await ok('Segment shape preserves play offset',()=>assert.equal(segmentShape({playOffsetMs:4500}).playOffsetMs,4500));

const starts=[];const stops=[];const connects=[];let loaderCalls=[];
class FakeSource{
  constructor(ctx){this.ctx=ctx;this.onended=null;this.buffer=null;this.stopped=false}
  connect(dest){connects.push(dest)}
  start(when,offset,duration){starts.push({when,offset,duration,source:this});this.when=when;this.offset=offset;this.duration=duration}
  stop(){this.stopped=true;stops.push(this)}
}
class FakeAudioContext{
  constructor(){this.currentTime=0;this.destination={kind:'destination'};this.state='running';this.decodeCalls=0;FakeAudioContext.last=this}
  resume(){this.state='running';return Promise.resolve()}
  decodeAudioData(){this.decodeCalls++;return Promise.resolve({duration:30,sampleRate:48000})}
  createBufferSource(){return new FakeSource(this)}
}
const transport=new CutAuditionWebAudioTransport({AudioContextCtor:FakeAudioContext,loadSegmentBytes:async input=>{loaderCalls.push(input);return new Uint8Array(128)}});
await transport.startSession({sessionId:'session-a',projectId:'project-a',startMs:0,endMs:65000,segment:{cacheStartMs:0,cacheDurationMs:30000,durationMs:30000}});
await ok('Session starts active',()=>assert.equal(transport.snapshot().active,true));
await ok('Initial segment is decoded once',()=>assert.equal(FakeAudioContext.last.decodeCalls,1));
await ok('Initial segment loader receives session id',()=>assert.equal(loaderCalls[0].sessionId,'session-a'));
await ok('Initial segment loader receives only segment start selector',()=>assert.deepEqual(Object.keys(loaderCalls[0]).sort(),['cacheStartMs','sessionId']));
await ok('Initial buffer schedules after short WebAudio lead',()=>assert.equal(starts[0].when,0.08));
await ok('Initial buffer begins at zero offset',()=>assert.equal(starts[0].offset,0));
await ok('Initial buffer schedules 30 seconds',()=>assert.equal(starts[0].duration,30));
await ok('Initial source connects to common destination',()=>assert.equal(connects[0],FakeAudioContext.last.destination));

transport.addSegment({cacheStartMs:30000,cacheDurationMs:30000,durationMs:30000});
await new Promise(resolve=>setTimeout(resolve,0));
transport.addSegment({cacheStartMs:60000,cacheDurationMs:5000,durationMs:5000});
await new Promise(resolve=>setTimeout(resolve,0));
await ok('Three continuous segments are scheduled',()=>assert.equal(starts.length,3));
await ok('Second segment starts exactly at first WebAudio end',()=>assert.equal(starts[1].when,starts[0].when+starts[0].duration));
await ok('Third segment starts exactly at second WebAudio end',()=>assert.equal(starts[2].when,starts[1].when+starts[1].duration));
await ok('Timeline tail schedules only remaining five seconds',()=>assert.equal(starts[2].duration,5));
await ok('Scheduler reaches timeline end',()=>assert.equal(transport.snapshot().scheduledThroughMs,65000));
await ok('Gapless transition telemetry counts later segments',()=>assert.equal(transport.snapshot().stats.gaplessTransitions,2));
await ok('Scheduler reports no late transition in prepared queue',()=>assert.equal(transport.snapshot().stats.lateTransitions,0));
await ok('Decoded queue contains three segments',()=>assert.equal(transport.snapshot().decodedSegments,3));

FakeAudioContext.last.currentTime=5.08;
await transport.pause();
await ok('Pause captures five-second timeline position',()=>assert.equal(transport.snapshot().positionMs,5000));
await ok('Pause stops scheduled WebAudio nodes',()=>assert.ok(stops.length>=3));
const startsBeforeResume=starts.length;
await transport.resume();
await ok('Resume schedules fresh source nodes',()=>assert.ok(starts.length>startsBeforeResume));
await ok('Resume starts inside first decoded buffer at five-second offset',()=>assert.equal(starts[startsBeforeResume].offset,5));
await ok('Resume keeps session active',()=>assert.equal(transport.snapshot().active,true));

transport.stop();
await ok('Stop clears active session',()=>assert.equal(transport.snapshot().active,false));
await ok('Stop clears decoded segment queue',()=>assert.equal(transport.snapshot().decodedSegments,0));

let needPrefetch=[];
const sparseStarts=[];
class SparseSource extends FakeSource{start(when,offset,duration){super.start(when,offset,duration);sparseStarts.push({when,offset,duration})}}
class SparseContext extends FakeAudioContext{createBufferSource(){return new SparseSource(this)}}
const sparse=new CutAuditionWebAudioTransport({AudioContextCtor:SparseContext,loadSegmentBytes:async()=>new Uint8Array(128),onNeedPrefetch:start=>needPrefetch.push(start)});
await sparse.startSession({sessionId:'sparse',startMs:0,endMs:90000,segment:{cacheStartMs:0,cacheDurationMs:30000,durationMs:30000}});
await ok('Missing next segment triggers local prefetch callback',()=>assert.ok(needPrefetch.includes(30000)));
await ok('Sparse queue schedules only available first segment',()=>assert.equal(sparseStarts.length,1));

const offsetStarts=[];
class OffsetSource extends FakeSource{start(when,offset,duration){super.start(when,offset,duration);offsetStarts.push({when,offset,duration})}}
class OffsetContext extends FakeAudioContext{createBufferSource(){return new OffsetSource(this)}}
const offsetTransport=new CutAuditionWebAudioTransport({AudioContextCtor:OffsetContext,loadSegmentBytes:async()=>new Uint8Array(128)});
await offsetTransport.startSession({sessionId:'offset',startMs:7000,endMs:30000,segment:{cacheStartMs:0,cacheDurationMs:30000,playOffsetMs:7000,durationMs:23000}});
await ok('Session can start within cached segment',()=>assert.equal(offsetStarts[0].offset,7));
await ok('Offset session schedules only remaining cached duration',()=>assert.equal(offsetStarts[0].duration,23));

const main=read('launcher/main.js'),preload=read('launcher/preload.js'),renderer=read('launcher/renderer/app.js'),rendererHtml=read('launcher/renderer/index.html'),cutHtml=read('public/pages/cut-studio.html'),cutCss=read('public/assets/css/cut-studio.css'),server=read('server.js'),pkg=JSON.parse(read('package.json'));
await ok('Launcher keeps generated session segment files in main-process map',()=>assert.ok(main.includes('session.segments=session.segments||new Map()')));
await ok('Session segment event no longer emits local previewPath',()=>{const a=main.indexOf('function cutAuditionSessionPayload');const b=main.indexOf('function cutAuditionSegmentBytes',a);assert.ok(a>=0&&b>a);assert.ok(!main.slice(a,b).includes('previewPath'))});
await ok('Launcher exposes dedicated segment-byte loader',()=>assert.ok(main.includes('function cutAuditionSegmentBytes(sessionId,cacheStartMs)')));
await ok('Segment-byte loader validates active session id',()=>assert.ok(main.includes('String(session.id)!==String(sessionId||"")')));
await ok('Segment-byte loader resolves only recorded session segment',()=>assert.ok(main.includes('session.segments?.get?.(start)')));
await ok('Segment-byte loader restricts file to audition cache root',()=>assert.ok(main.includes('path.dirname(filePath)!==cacheRoot')));
await ok('Segment-byte loader requires SHA-256 WAV filename',()=>assert.ok(main.includes('/^([a-f0-9]{64})\\.wav$/i')));
await ok('Segment-byte loader caps WAV payload at eight MiB',()=>assert.ok(main.includes('stat.size>8*1024*1024')));
await ok('Segment-byte loader returns Uint8Array instead of filesystem path',()=>assert.ok(main.includes('bytes:new Uint8Array(fs.readFileSync(filePath))')));
await ok('Initial session remembers first local cache segment',()=>assert.ok(main.includes('rememberCutAuditionSessionPreview(cutAuditionSession,preview)')));
await ok('Prefetch remembers later local cache segments',()=>assert.ok(main.includes('rememberCutAuditionSessionPreview(session,preview)')));
await ok('Launcher registers segment-byte IPC',()=>assert.ok(main.includes('ipcMain.handle("launcher:cut-audition-segment-bytes"')));
await ok('Preload exposes segment-byte loader',()=>assert.ok(preload.includes('loadCutAuditionSegment: input => ipcRenderer.invoke("launcher:cut-audition-segment-bytes"')));
await ok('Preload does not expose arbitrary filesystem read API',()=>assert.ok(!/readFile\s*:|fs\.readFile/.test(preload)));
await ok('Launcher renderer loads WebAudio module before app',()=>assert.ok(rendererHtml.indexOf('cut-audition-web-audio.js')<rendererHtml.indexOf('./app.js')));
await ok('Renderer constructs dedicated WebAudio transport',()=>assert.ok(renderer.includes('new Transport({')));
await ok('Renderer segment loader uses preload IPC',()=>assert.ok(renderer.includes('window.CFSLauncher.loadCutAuditionSegment({sessionId,cacheStartMs})')));
await ok('Renderer WebAudio prefetch callback stays local',()=>assert.ok(renderer.includes('onNeedPrefetch:startMs=>queueCutAuditionSessionPrefetch(startMs,2)')));
await ok('Renderer continuous session declares WebAudio transport',()=>assert.ok(renderer.includes('transport:"webaudio"')));
await ok('Renderer starts continuous WebAudio transport',()=>assert.ok(renderer.includes('await transport.startSession({sessionId')));
await ok('Renderer adds arriving prefetched segments to WebAudio queue',()=>assert.ok(renderer.includes('transport.addSegment(segment)')));
await ok('Renderer continuous pause calls WebAudio pause',()=>assert.ok(renderer.includes('await transport.pause()')));
await ok('Renderer continuous resume calls WebAudio resume',()=>assert.ok(renderer.includes('await transport.resume()')));
await ok('Renderer continuous stop clears WebAudio transport',()=>assert.ok(renderer.includes('transport.stop({clearSession:true,silent:true})')));
await ok('Finite audition still uses simple Audio path',()=>assert.ok(renderer.includes('cutAuditionAudio=new Audio(localFileUrl(previewPath))')));
await ok('Continuous session receiver does not require previewPath',()=>{const a=renderer.indexOf('async function receiveCutAuditionSession');const b=renderer.indexOf('function audioAnalysisHtml',a);assert.ok(a>=0&&b>a);assert.ok(!renderer.slice(a,b).includes('previewPath'))});
await ok('Launcher UI surfaces gapless WebAudio state',()=>assert.ok(renderer.includes('GAPLESS WEBAUDIO')));
await ok('WebAudio module uses AudioBufferSourceNode scheduling API',()=>{const src=read('launcher/renderer/cut-audition-web-audio.js');assert.ok(src.includes('createBufferSource()')&&src.includes('source.start(scheduleWhen'))});
await ok('WebAudio module uses one shared AudioContext destination',()=>{const src=read('launcher/renderer/cut-audition-web-audio.js');assert.ok(src.includes('this.destination=this.context.destination')&&src.includes('source.connect(this.destination)'))});
await ok('WebAudio module schedules using context currentTime',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('this.context.currentTime')));
await ok('WebAudio module records exact timeline anchor',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('this.anchorTimelineMs=pos')));
await ok('WebAudio module pauses by preserving timeline position',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('this.pausedTimelineMs=this.positionMs()')));
await ok('WebAudio module resumes from paused timeline position',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('const pos=this.session.paused?this.pausedTimelineMs:this.positionMs()')));
await ok('WebAudio module limits decoded buffers in RAM',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('maxDecodedSegments')));
await ok('WebAudio module prunes old decoded AudioBuffers',()=>assert.ok(read('launcher/renderer/cut-audition-web-audio.js').includes('row.buffer=null')));
await ok('WebAudio module has no network URL',()=>assert.ok(!/https?:\/\//i.test(read('launcher/renderer/cut-audition-web-audio.js'))));
await ok('WebAudio module has no Node filesystem access',()=>assert.ok(!/require\(["']node:fs|fs\./.test(read('launcher/renderer/cut-audition-web-audio.js'))));
await ok('Server audition protocol remains compatible with schema 10+',()=>assert.ok(/schema:(?:1[0-9]|[2-9][0-9])/.test(server)&&server.includes('session_start')&&server.includes('session_seek')));
await ok('Cut Studio explains WebAudio buffer queue',()=>assert.ok(/WebAudio-Buffer-Queue/i.test(cutHtml)));
await ok('Cut Studio explains sample-accurate scheduling scope',()=>assert.ok(/samplegenau geplant/i.test(cutHtml)));
await ok('Cut Studio states segment switch needs no new HTML Audio start',()=>assert.ok(/keinen neuen HTML-Audio-Start/i.test(cutHtml)));
await ok('Pass 21.10.30 CSS marker exists',()=>assert.ok(cutCss.includes('Pass 21.10.30')));
await ok('Finite website audition request still carries no path',()=>{const js=read('public/assets/js/cut-studio.js'),a=js.indexOf('async function requestCutAudition'),b=js.indexOf('function fallbackPoints',a);assert.ok(!/filePath|previewPath|preview_path|recordingPath/.test(js.slice(a,b)))});

await ok('Root package registers Pass 21.10.30 test',()=>assert.ok(pkg.scripts?.['studio-gapless-audition21:check']?.includes('pass21-10-30-test.mjs')));
await ok('Combined Stream Studio check includes Pass 21.10.30',()=>assert.ok(pkg.scripts?.['stream-studio21:check']?.includes('studio-gapless-audition21:check')));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
await ok('Pass 21.10.30 milestone remains documented',()=>assert.ok(checklist.includes('## Pass 21.10.30 Update')));
await ok('Master checklist contains Pass 21.10.30 section',()=>assert.ok(checklist.includes('## Pass 21.10.30 Update – Gapless Audition Transport / WebAudio Buffer Queue')));
await ok('Pass 21.10.29 marks WebAudio gapless transport completed in 21.10.30',()=>assert.ok(checklist.includes('sample-genauer WebAudio-Transport umgesetzt in Pass 21.10.30')));
await ok('Detail documentation exists',()=>assert.ok(fs.existsSync(path.join(root,'STREAM_STUDIO_GAPLESS_AUDITION_PASS21_10_30.md'))));
const docs=read('STREAM_STUDIO_GAPLESS_AUDITION_PASS21_10_30.md');
await ok('Detail docs explain AudioContext scheduling',()=>assert.ok(/AudioContext/i.test(docs)&&/AudioBufferSourceNode/i.test(docs)));
await ok('Detail docs explain session-id byte gate',()=>assert.ok(/Session-ID/i.test(docs)&&/Segmentstart/i.test(docs)&&/WAV-Bytes/i.test(docs)));
await ok('Detail docs preserve local path boundary',()=>assert.ok(/lokale.*Pfad|lokalen.*Pfad/i.test(docs)));
await ok('Detail docs keep real Windows audible gap acceptance open',()=>assert.ok(/Windows/i.test(docs)&&/hörbar|Audition|Lücke/i.test(docs)&&/offen/i.test(docs)));
await ok('Detail docs do not claim hardware acceptance',()=>assert.ok(!/Windows-Hardware-Abnahme.*(?:bestanden|abgeschlossen)/i.test(docs)));

console.log(`\nStream Studio Gapless Audition Transport Pass 21.10.30: ${passed}/${passed+failed} PASS`);
if(failed)process.exit(1);
