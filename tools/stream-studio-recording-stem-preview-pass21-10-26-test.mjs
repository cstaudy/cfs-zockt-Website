import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {RecordingHandoffStore,sourceTracks}=require('../launcher/src/recording-handoff-store.js');
const {sanitizeSourceTracks,sanitizeCutProject}=require('../lib/creator-cut-studio.js');
const {CutMediaEngine}=require('../launcher/src/cut-media-engine.js');
let pass=0,fail=0;
function ok(name,fn){try{fn();pass++;console.log(`PASS ${name}`)}catch(error){fail++;console.error(`FAIL ${name}`);console.error(error?.stack||error)}}
const read=rel=>fs.readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
const storeSrc=read('launcher/src/recording-handoff-store.js'),engineSrc=read('launcher/src/cut-media-engine.js'),main=read('launcher/main.js'),preload=read('launcher/preload.js'),renderer=read('launcher/renderer/app.js'),rendererCss=read('launcher/renderer/styles.css'),bridge=read('launcher/src/bridge-client.js'),server=read('server.js'),cutJs=read('public/assets/js/cut-studio.js'),cutHtml=read('public/pages/cut-studio.html'),cutCss=read('public/assets/css/cut-studio.css'),checklist=read('CFS_MASTER_CHECKLIST_PASS21.md'),detail=read('STREAM_STUDIO_RECORDING_STEM_PREVIEW_PASS21_10_26.md'),pkg=JSON.parse(read('package.json'));

ok('Recording handoff store advances to schema 2 / pass 21.10.26',()=>{assert.ok(storeSrc.includes('schema:2'));assert.ok(storeSrc.includes('pass:"21.10.26"'))});
ok('New recording stems contain local analysis state',()=>{const row=sourceTracks([{key:'mic',title:'Mic'}])[0];assert.deepEqual(row.analysis.waveform,[]);assert.equal(row.analysis.waveform_path,'')});
ok('New recording stems contain local preview state',()=>{const row=sourceTracks([{key:'game',title:'Game'}])[0];assert.equal(row.preview.preview_path,'');assert.equal(row.preview.duration_ms,0)});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-stem26-')),media=path.join(tmp,'rec.mkv');fs.writeFileSync(media,Buffer.alloc(64,1));const store=new RecordingHandoffStore(path.join(tmp,'handoffs.json'));const handoff=store.create({filePath:media,audioTracks:[{key:'mix',title:'Stream Mix'},{key:'mic',title:'Mic'}]});
ok('Store can persist embedded stem analysis',()=>{const next=store.setTrackAnalysis(handoff.id,'mic',{available:true,peak_db:-3.2,mean_db:-18.4,waveform_path:path.join(tmp,'wave.png'),waveform:[0,.2,.8,1],analyzed_at:'2026-09-18T10:00:00Z'});assert.equal(next.tracks[1].analysis.peak_db,-3.2);assert.deepEqual(next.tracks[1].analysis.waveform,[0,.2,.8,1])});
ok('Store can persist local track preview',()=>{const preview=path.join(tmp,'mic.wav');fs.writeFileSync(preview,Buffer.alloc(32));const next=store.setTrackPreview(handoff.id,'mic',{preview_path:preview,duration_ms:12000,created_at:'2026-09-18T10:00:00Z'});assert.equal(next.tracks[1].preview.exists,true)});
ok('Store can persist local current-mix preview',()=>{const preview=path.join(tmp,'mix.wav');fs.writeFileSync(preview,Buffer.alloc(32));const next=store.setMixPreview(handoff.id,{preview_path:preview,duration_ms:12000});assert.equal(next.mixPreview.exists,true)});
ok('Local preview path remains in local handoff file only',()=>assert.ok(fs.readFileSync(path.join(tmp,'handoffs.json'),'utf8').includes('mic.wav')));

const clean=sanitizeSourceTracks([{key:'mic',waveform:[-2,0,.25,1,9],peak_db:-2.4,mean_db:-19.2,analyzed_at:'2026-09-18T10:00:00Z'}])[0];
ok('Cloud waveform sanitizer clamps normalized values',()=>assert.deepEqual(clean.waveform,[0,0,.25,1,1]));
ok('Cloud waveform sanitizer preserves peak metadata',()=>assert.equal(clean.peak_db,-2.4));
ok('Cloud waveform sanitizer preserves mean metadata',()=>assert.equal(clean.mean_db,-19.2));
ok('Cloud waveform sanitizer preserves analysis timestamp',()=>assert.equal(clean.analyzed_at,'2026-09-18T10:00:00Z'));
ok('Cloud waveform sanitizer caps envelope to 64 bins',()=>assert.equal(sanitizeSourceTracks([{key:'mic',waveform:Array(100).fill(.5)}])[0].waveform.length,64));
ok('Cut project retains waveform metadata through sanitizer',()=>{const p=sanitizeCutProject({export_preset:{source_tracks:[{key:'mic',waveform:[.1,.9],peak_db:-1}]}});assert.deepEqual(p.export_preset.source_tracks[0].waveform,[.1,.9])});
ok('Sanitized source tracks contain no local waveform path',()=>assert.ok(!JSON.stringify(clean).includes('waveform_path')));
ok('Sanitized source tracks contain no preview path',()=>assert.ok(!JSON.stringify(clean).includes('preview_path')));

const engine=new CutMediaEngine({outputRoot:tmp});
ok('Cut Media Engine exposes binary FFmpeg runner',()=>assert.equal(typeof engine.runBinaryProcess,'function'));
ok('Cut Media Engine exposes embedded waveform extractor',()=>assert.equal(typeof engine.embeddedWaveformBins,'function'));
ok('Cut Media Engine exposes embedded stem analyzer',()=>assert.equal(typeof engine.analyzeEmbeddedAudio,'function'));
ok('Cut Media Engine exposes single stem preview builder',()=>assert.equal(typeof engine.createEmbeddedTrackPreview,'function'));
ok('Cut Media Engine exposes current stem mix preview builder',()=>assert.equal(typeof engine.createEmbeddedMixPreview,'function'));
ok('Waveform extraction uses selected embedded stream',()=>assert.ok(engineSrc.includes('[0:a:${idx}]aformat=channel_layouts=mono,showwavespic')));
ok('Waveform extraction returns reduced 64-bin envelope',()=>assert.ok(engineSrc.includes('bins=64')&&engineSrc.includes('toFixed(3)')));
ok('Track preview is capped at 30 seconds',()=>assert.ok(engineSrc.includes('Math.min(30,Number(seconds)||12)')));
ok('Track preview is local PCM WAV',()=>assert.ok(engineSrc.includes('-track.wav')&&engineSrc.includes('pcm_s16le')));
ok('Mix preview reuses sourceTrackAudioGraph solo/mute logic',()=>assert.ok(engineSrc.includes('createEmbeddedMixPreview')&&engineSrc.includes('this.sourceTrackAudioGraph')));

ok('Bridge client can update Cut projects',()=>assert.ok(bridge.includes('updateCutProject(projectId,payload')));
ok('Server exposes bridge Cut project PUT',()=>assert.ok(server.includes('app.put("/api/bridge/cut-studio/projects/:id"')));
ok('Launcher can analyze every recording stem',()=>assert.ok(main.includes('analyzeRecordingHandoff')&&main.includes('analyzeEmbeddedAudio')));
ok('Launcher syncs only reduced analysis metadata to Cut project',()=>assert.ok(main.includes('recordingHandoffProjectTracks')&&main.includes('waveform:(analysis.waveform||[]).slice(0,64)')));
ok('Launcher does not sync waveform PNG path in project track metadata',()=>{const a=main.indexOf('function recordingHandoffProjectTracks'),b=main.indexOf('async function syncRecordingHandoffAnalysisToProject',a);assert.ok(!main.slice(a,b).includes('waveform_path'))});
ok('Launcher does not sync preview WAV path in project track metadata',()=>{const a=main.indexOf('function recordingHandoffProjectTracks'),b=main.indexOf('async function syncRecordingHandoffAnalysisToProject',a);assert.ok(!main.slice(a,b).includes('preview_path'))});
ok('Launcher single-stem audition applies current Cut gain/pan',()=>assert.ok(main.includes('gainDb:Number(current.gain_db||0)')&&main.includes('pan:Number(current.pan||0)')));
ok('Launcher mix audition refreshes current Cut project settings',()=>assert.ok(main.includes('previewRecordingHandoffMix')&&main.includes('refreshCreatorLibrary({notify:false})')));
ok('Launcher mix audition uses saved source track settings',()=>assert.ok(main.includes('project?.export_preset?.source_tracks||handoff.tracks||[]')));
ok('Launcher registers analyze IPC',()=>assert.ok(main.includes('launcher:recording-handoff-analyze')));
ok('Launcher registers track preview IPC',()=>assert.ok(main.includes('launcher:recording-handoff-preview-track')));
ok('Launcher registers mix preview IPC',()=>assert.ok(main.includes('launcher:recording-handoff-preview-mix')));
ok('Preload exposes analyze action',()=>assert.ok(preload.includes('analyzeRecordingHandoff')));
ok('Preload exposes stem audition action',()=>assert.ok(preload.includes('previewRecordingTrack')));
ok('Preload exposes mix audition action',()=>assert.ok(preload.includes('previewRecordingMix')));

ok('Launcher renders local stem waveform image',()=>assert.ok(renderer.includes('tools-recording-stem-wave')&&renderer.includes('waveform_path')));
ok('Launcher renders local audio preview controls',()=>assert.ok(renderer.includes('tools-recording-preview')&&renderer.includes('<audio')));
ok('Launcher has per-stem audition button',()=>assert.ok(renderer.includes('data-recording-preview-track')));
ok('Launcher has current-mix audition button',()=>assert.ok(renderer.includes('data-recording-preview-mix')));
ok('Launcher has waveform analysis button',()=>assert.ok(renderer.includes('data-recording-analyze')));
ok('Launcher styles local stem audition UI',()=>assert.ok(rendererCss.includes('Pass 21.10.26')&&rendererCss.includes('.tools-recording-stem-wave')));

ok('Cut Studio renders reduced waveform bars',()=>assert.ok(cutJs.includes('sourceWaveformHtml')&&cutJs.includes('cut-source-waveform')));
ok('Cut Studio preserves waveform metadata on save',()=>assert.ok(cutJs.includes('data-source-track-field="waveform"')&&cutJs.includes('waveform,peak_db')));
ok('Cut Studio explains audition stays local in Launcher',()=>assert.ok(cutHtml.includes('Vorhören läuft lokal im Launcher')));
ok('Cut Studio styles source waveforms',()=>assert.ok(cutCss.includes('Pass 21.10.26')&&cutCss.includes('.cut-source-waveform')));
ok('Cut project metadata never includes local Recording file path field',()=>{const text=main.slice(main.indexOf('function recordingHandoffProjectPayload'),main.indexOf('async function materializeRecordingHandoff'));assert.ok(!/filePath\s*:/.test(text))});
ok('Cloud waveform is metadata only, not raw PCM/BGRA payload',()=>{const text=main.slice(main.indexOf('function recordingHandoffProjectTracks'),main.indexOf('async function syncRecordingHandoffAnalysisToProject'));assert.ok(!text.includes('pcm'));assert.ok(!text.includes('bgra'))});

ok('Root package registers pass 21.10.26 check',()=>assert.ok(pkg.scripts?.['studio-recording-preview21:check']?.includes('pass21-10-26-test.mjs')));
ok('Combined Stream Studio check includes pass 21.10.26',()=>assert.ok(pkg.scripts?.['stream-studio21:check']?.includes('studio-recording-preview21:check')));
ok('Master checklist retains pass 21.10.26 milestone',()=>assert.ok(checklist.includes('## Pass 21.10.26 Update')));
ok('Pass 21.10.26 checklist section exists',()=>assert.ok(checklist.includes('## Pass 21.10.26 Update')));
ok('Pass detail documentation exists',()=>assert.ok(detail.includes('Pass 21.10.26')&&detail.includes('Stem Preview')));
ok('Detail docs keep recording media and preview local',()=>assert.ok(detail.includes('Preview-WAV')&&detail.includes('lokal')));

console.log(`\nStream Studio Recording Stem Preview Pass 21.10.26: ${pass}/${pass+fail} PASS`);
if(fail)process.exitCode=1;
