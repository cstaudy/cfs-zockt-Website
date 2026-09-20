import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {sanitizeCutProject}=require('../lib/creator-cut-studio.js');
const {buildCutJobManifest}=require('../lib/creator-cut-jobs.js');
const {CutMediaEngine}=require('../launcher/src/cut-media-engine.js');

let pass=0,fail=0;
async function ok(name,fn){try{await fn();pass++;console.log(`PASS ${name}`)}catch(error){fail++;console.error(`FAIL ${name}`);console.error(error?.stack||error)}}
const read=rel=>fs.readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
const main=read('launcher/main.js'),preload=read('launcher/preload.js'),renderer=read('launcher/renderer/app.js'),engineSrc=read('launcher/src/cut-media-engine.js'),server=read('server.js'),cutJs=read('public/assets/js/cut-studio.js'),cutHtml=read('public/pages/cut-studio.html'),cutCss=read('public/assets/css/cut-studio.css'),checklist=read('CFS_MASTER_CHECKLIST_PASS21.md'),detail=read('STREAM_STUDIO_TIMELINE_AUDITION_PASS21_10_27.md'),pkg=JSON.parse(read('package.json'));

await ok('Cut project sanitizer preserves playhead marker',()=>{const p=sanitizeCutProject({export_preset:{audition_playhead_ms:12345}});assert.equal(p.export_preset.audition_playhead_ms,12345)});
await ok('Cut project sanitizer preserves A marker',()=>{const p=sanitizeCutProject({export_preset:{audition_a_ms:4567}});assert.equal(p.export_preset.audition_a_ms,4567)});
await ok('Cut project sanitizer preserves B marker',()=>{const p=sanitizeCutProject({export_preset:{audition_b_ms:9876}});assert.equal(p.export_preset.audition_b_ms,9876)});
await ok('Cut project sanitizer clamps negative playhead',()=>{const p=sanitizeCutProject({export_preset:{audition_playhead_ms:-1}});assert.equal(p.export_preset.audition_playhead_ms,0)});
await ok('Cut project sanitizer clamps marker to 24 hours',()=>{const p=sanitizeCutProject({export_preset:{audition_a_ms:99*60*60*1000}});assert.equal(p.export_preset.audition_a_ms,24*60*60*1000)});
await ok('Cut job manifest carries playhead/A/B metadata',()=>{const m=buildCutJobManifest({id:'p1',title:'Demo',format:'landscape',export_preset:{audition_playhead_ms:1000,audition_a_ms:2000,audition_b_ms:3000,source_handoff_id:'h1',source_tracks:[{key:'mic',stream_index:1}]}},[{id:'c1',label:'Full',in_ms:0,out_ms:10000,selected:true}]);assert.equal(m.export_preset.audition_playhead_ms,1000);assert.equal(m.export_preset.audition_a_ms,2000);assert.equal(m.export_preset.audition_b_ms,3000)});
await ok('Cut job manifest contains no local file path property',()=>{const m=buildCutJobManifest({id:'p1',title:'Demo',format:'landscape',source_name:'rec.mkv',export_preset:{source_handoff_id:'h1'}},[{id:'c1',label:'Full',in_ms:0,out_ms:10000,selected:true}]);assert.ok(!/filePath|previewPath|preview_path/.test(JSON.stringify(m)))});

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-audition27-')),media=path.join(tmp,'recording.mkv');fs.writeFileSync(media,Buffer.alloc(32,1));
const engine=new CutMediaEngine({outputRoot:tmp});engine.ffmpegPath='/fake/ffmpeg';
let calls=[];engine.runProcess=async(_bin,args)=>{calls.push(args);const out=args.at(-1);if(typeof out==='string'&&out.endsWith('.wav'))fs.writeFileSync(out,Buffer.alloc(128,2));return{code:0,stdout:'',stderr:''}};
await ok('Track preview accepts timeline start',async()=>{calls=[];const r=await engine.createEmbeddedTrackPreview(media,2,'mic',{seconds:4,startMs:12345,gainDb:-3,pan:.25});assert.equal(r.start_ms,12345);assert.equal(r.duration_ms,4000)});
await ok('Track preview uses FFmpeg seek before input',()=>{const a=calls[0];const ss=a.indexOf('-ss'),input=a.indexOf('-i');assert.ok(ss>=0&&ss<input);assert.equal(a[ss+1],'12.345')});
await ok('Track preview maps requested embedded audio stream',()=>{const a=calls[0],map=a.indexOf('-map');assert.equal(a[map+1],'0:a:2')});
await ok('Track preview applies gain and pan filters',()=>{const a=calls[0],af=a.indexOf('-af'),filter=a[af+1];assert.ok(filter.includes('volume=-3.0dB'));assert.ok(filter.includes('pan='))});
await ok('Track preview stays local PCM WAV',()=>{const a=calls[0];assert.ok(a.includes('pcm_s16le'));assert.ok(a.at(-1).endsWith('.wav'))});
await ok('Preview minimum duration is one second',async()=>{calls=[];const r=await engine.createEmbeddedTrackPreview(media,0,'min',{seconds:.1,startMs:0});assert.equal(r.duration_ms,1000)});
await ok('Preview maximum duration remains 30 seconds',async()=>{calls=[];const r=await engine.createEmbeddedTrackPreview(media,0,'max',{seconds:99,startMs:0});assert.equal(r.duration_ms,30000)});
await ok('Preview timeline start clamps to 24 hours',async()=>{calls=[];const r=await engine.createEmbeddedTrackPreview(media,0,'clamp',{seconds:1,startMs:99*60*60*1000});assert.equal(r.start_ms,24*60*60*1000)});
await ok('Mix preview accepts timeline start',async()=>{calls=[];const tracks=[{key:'mic',stream_index:1,enabled:true,gain_db:0,mute:false,solo:false,pan:0},{key:'game',stream_index:2,enabled:true,gain_db:-2,mute:false,solo:false,pan:.2}];const r=await engine.createEmbeddedMixPreview(media,tracks,'mix',{seconds:4,startMs:4200});assert.equal(r.start_ms,4200);assert.equal(r.duration_ms,4000)});
await ok('Mix preview uses FFmpeg seek before input',()=>{const a=calls[0],ss=a.indexOf('-ss'),input=a.indexOf('-i');assert.ok(ss>=0&&ss<input);assert.equal(a[ss+1],'4.200')});
await ok('Mix preview uses shared source-track audio graph',()=>assert.ok(engineSrc.includes('createEmbeddedMixPreview')&&engineSrc.includes('this.sourceTrackAudioGraph')));
await ok('Preview engine does not upload media',()=>{const block=engineSrc.slice(engineSrc.indexOf('async createEmbeddedTrackPreview'),engineSrc.indexOf('async analyzeAudio'));assert.ok(!/fetch\(|https?:|upload/i.test(block))});

await ok('Server has dedicated Cut audition endpoint',()=>assert.ok(server.includes('/api/creator/cut-studio/projects/:id/audition-jobs')));
await ok('Audition endpoint requires Cut Studio feature access',()=>{const i=server.indexOf('/api/creator/cut-studio/projects/:id/audition-jobs');assert.ok(server.slice(i,i+700).includes('requireCreatorFeatureAccess'))});
await ok('Audition job kind is cut_audition',()=>assert.ok(server.includes('kind:"cut_audition"')));
await ok('Audition job schema keeps Pass 21.10.27 compatibility at schema 8+',()=>{const m=server.match(/schema:(\d+),\s*\n?\s*kind:"cut_audition"/);assert.ok(m&&Number(m[1])>=8)});
await ok('Audition request clamps start to 24 hours',()=>assert.ok(server.includes('Math.min(24*60*60*1000')&&server.includes('input?.start_ms')));
await ok('Audition request clamps duration to 1-30 seconds',()=>assert.ok(server.includes('Math.max(1000,Math.min(30000')));
await ok('Track audition validates track key against project tracks',()=>assert.ok(server.includes('source_tracks?.some(track=>String(track.key)===trackKey)')));
await ok('Audition requires recording handoff id',()=>assert.ok(server.includes('Timeline-Audition ist nur für einen lokalen Recording-Handoff verfügbar.')));
await ok('Newest queued audition supersedes older queued audition',()=>assert.ok(server.includes("superseded_by_new_audition")&&server.includes("status='queued' AND manifest->>'kind'='cut_audition'")));
await ok('Old completed audition jobs are cleaned after one hour',()=>assert.ok(server.includes("manifest->>'kind'='cut_audition'")&&server.includes("INTERVAL '1 hour'")));
await ok('Audition concurrency is capped at two claimed/processing jobs',()=>assert.ok(server.includes('>=2')&&server.includes('Es laufen bereits zwei lokale Timeline-Vorschauen.')));
await ok('Normal export queue count excludes audition jobs',()=>assert.ok(server.includes("COALESCE(manifest->>'kind','cut_export')<>'cut_audition'")));
await ok('Creator normal export list excludes audition jobs by default',()=>assert.ok(server.includes('includeAudition=false')&&server.includes('includeAudition?"":"AND COALESCE')));
await ok('Bridge job list includes audition jobs for local Launcher',()=>assert.ok(server.includes('listCutExportJobs(req.studioBridge.creator_id,50,{includeAudition:true})')));
await ok('Server audition manifest does not accept a file path from request',()=>{const a=server.indexOf('async function createCutAuditionJob'),b=server.indexOf('async function transitionCutExportJob',a),block=server.slice(a,b);assert.ok(!/input\?\.(file|path)|input\.(file|path)/i.test(block))});

await ok('Launcher recognizes only cut_audition manifest kind',()=>assert.ok(main.includes('function isCutAuditionJob(job){return String(job?.manifest?.kind||"")==="cut_audition"}')));
await ok('Launcher verifies both local handoff id and project id',()=>{const a=main.indexOf('function auditionRecordingHandoff'),b=main.indexOf('async function processCutAuditionJob',a),block=main.slice(a,b);assert.ok(block.includes('item.id')&&block.includes('item.projectId')&&block.includes('item.filePath'))});
await ok('Launcher claims queued audition before local validation',()=>{const a=main.indexOf('async function processCutAuditionJob'),b=main.indexOf('async function pollCutAuditionJobs',a),block=main.slice(a,b);assert.ok(block.indexOf('bridge.claimCutJob')<block.indexOf('auditionRecordingHandoff(job)'))});
await ok('Missing local handoff becomes failed claimed job instead of retry loop',()=>{const a=main.indexOf('async function processCutAuditionJob'),b=main.indexOf('async function pollCutAuditionJobs',a),block=main.slice(a,b);assert.ok(block.includes('bridge.failCutJob')&&block.includes('["claimed","processing"]'))});
await ok('Launcher uses local authentic stream index for track audition',()=>assert.ok(main.includes('local.stream_index')&&main.includes('createEmbeddedTrackPreview')));
await ok('Launcher overrides mix stream indices from local handoff',()=>assert.ok(main.includes('{...track,stream_index:Number(local.stream_index)}')));
await ok('Launcher passes timeline start into track preview',()=>assert.ok(main.includes('seconds:durationMs/1000,startMs,gainDb')));
await ok('Launcher passes timeline start into mix preview',()=>assert.ok(main.includes('seconds:durationMs/1000,startMs}')));
await ok('Launcher completion result contains metadata only',()=>{const a=main.indexOf('async function processCutAuditionJob'),b=main.indexOf('async function pollCutAuditionJobs',a),block=main.slice(a,b);const m=block.match(/bridge\.completeCutJob\(job\.id,\{output_name:"local-audition\.wav"([^}]*)\}\)/);assert.ok(m);assert.ok(!m[0].includes('previewPath'));assert.ok(!m[0].includes('preview_path'))});
await ok('Local preview path is sent only to local Electron audition event',()=>assert.ok(main.includes('send("launcher:cut-audition"')&&main.includes('previewPath:String(preview?.preview_path||"")')));
await ok('Audition poller checks queued audition jobs',()=>assert.ok(main.includes('jobs.find(job=>isCutAuditionJob(job)&&job.status==="queued")')));
await ok('Audition poll interval is 1500 ms',()=>assert.ok(main.includes('setInterval(()=>pollCutAuditionJobs().catch(()=>{}),1500)')));
await ok('Audition loop starts with Launcher',()=>assert.ok(main.includes('startCutAuditionLoop()')));
await ok('Audition loop stops before quit',()=>assert.ok(main.includes('stopCutAuditionLoop()')));
await ok('Normal Launcher Cut library filters audition jobs',()=>assert.ok(main.includes('filter(job=>!isCutAuditionJob(job))')));
await ok('Preload exposes local audition event only as callback',()=>assert.ok(preload.includes('onCutAudition: callback')&&preload.includes('launcher:cut-audition')));
await ok('Launcher renderer plays local preview with Audio',()=>assert.ok(renderer.includes('new Audio(localFileUrl(previewPath))')&&renderer.includes('onCutAudition')));
await ok('Launcher renderer replaces prior audition playback',()=>assert.ok(renderer.includes('cutAuditionAudio?.pause?.()')));

await ok('Cut Studio HTML contains timeline audition panel',()=>assert.ok(cutHtml.includes('id="cutAuditionPanel"')&&cutHtml.includes('PLAYBACK HEAD')));
await ok('Cut Studio HTML contains playhead range',()=>assert.ok(cutHtml.includes('id="cutAuditionPlayhead"')&&cutHtml.includes('type="range"')));
await ok('Cut Studio HTML contains A and B markers',()=>assert.ok(cutHtml.includes('id="cutAuditionA"')&&cutHtml.includes('id="cutAuditionB"')));
await ok('Cut Studio HTML contains A/B audition actions',()=>assert.ok(cutHtml.includes('A HÖREN')&&cutHtml.includes('B HÖREN')));
await ok('Cut Studio has per-track audition button',()=>assert.ok(cutJs.includes('data-cut-audition-track')));
await ok('Playhead input updates labels locally while dragging',()=>{assert.ok(/auditionPlayhead\.oninput=.*renderAuditionLabels/.test(cutJs));assert.ok(!/auditionPlayhead\.oninput=.*requestCutAudition/.test(cutJs))});
await ok('Playhead change requests four-second scrub preview',()=>assert.ok(/durationMs:4000[\s\S]{0,140}silent:true/.test(cutJs)));
await ok('Normal mix audition requests twelve seconds',()=>assert.ok(cutJs.includes('cutAuditionMix')&&cutJs.includes('durationMs:12000')));
await ok('A/B markers are saved quietly',()=>assert.ok(cutJs.includes('cutAuditionSetA')&&cutJs.includes('saveProject({quiet:true})')&&cutJs.includes('cutAuditionSetB')));
await ok('Audition request saves current mixer state before queueing',()=>{const a=cutJs.indexOf('async function requestCutAudition'),b=cutJs.indexOf('function renderProjects',a),block=cutJs.slice(a,b);assert.ok(block.indexOf('saveProject({quiet:true})')<block.indexOf('/audition-jobs'))});
await ok('Audition request carries no local file path',()=>{const a=cutJs.indexOf('async function requestCutAudition'),b=cutJs.indexOf('function renderProjects',a),block=cutJs.slice(a,b);assert.ok(!/filePath|previewPath|preview_path/.test(block))});
await ok('Project payload persists playhead/A/B markers',()=>assert.ok(cutJs.includes('audition_playhead_ms:auditionClamp')&&cutJs.includes('audition_a_ms:auditionClamp')&&cutJs.includes('audition_b_ms:auditionClamp')));
await ok('Opening a project resets audition UI hydration state',()=>assert.ok(cutJs.includes('delete el.dataset.ready')));
await ok('Timeline audition is limited to recording handoff projects',()=>assert.ok(cutJs.includes('Timeline-Audition benötigt einen lokalen Recording-Handoff.')));
await ok('Cut Studio styles Pass 21.10.27 audition UI',()=>assert.ok(cutCss.includes('Pass 21.10.27')&&cutCss.includes('.cut-audition-panel')&&cutCss.includes('.audition-active')));

await ok('Root package registers Pass 21.10.27 test',()=>assert.ok(pkg.scripts?.['studio-timeline-audition21:check']?.includes('pass21-10-27-test.mjs')));
await ok('Combined Stream Studio check includes Pass 21.10.27',()=>assert.ok(pkg.scripts?.['stream-studio21:check']?.includes('studio-timeline-audition21:check')));
await ok('Master checklist retains Pass 21.10.27 milestone',()=>assert.ok(checklist.includes('Pass 21.10.27')));
await ok('Master checklist contains Pass 21.10.27 section',()=>assert.ok(checklist.includes('## Pass 21.10.27 Update')));
await ok('Detail documentation exists',()=>assert.ok(detail.includes('Pass 21.10.27')&&detail.includes('Timeline Audition')));
await ok('Detail documentation states local preview security boundary',()=>assert.ok(detail.includes('lokal')&&detail.includes('Preview-WAV')&&detail.includes('Dateipfad')));

console.log(`\nStream Studio Timeline Audition Pass 21.10.27: ${pass}/${pass+fail} PASS`);
if(fail)process.exitCode=1;
