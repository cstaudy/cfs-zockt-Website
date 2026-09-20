import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {RecordingHandoffStore,sourceTracks,durationMs}=require('../launcher/src/recording-handoff-store.js');
const {sanitizeCutProject,sanitizeSourceTracks}=require('../lib/creator-cut-studio.js');
const {buildCutJobManifest}=require('../lib/creator-cut-jobs.js');
const {CutMediaEngine}=require('../launcher/src/cut-media-engine.js');

let pass=0,fail=0;
function ok(name,fn){try{fn();pass++;console.log(`PASS ${name}`)}catch(error){fail++;console.error(`FAIL ${name}`);console.error(error?.stack||error)}}
const read=rel=>fs.readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
const main=read('launcher/main.js'),preload=read('launcher/preload.js'),bridge=read('launcher/src/bridge-client.js'),server=read('server.js');
const webJs=read('public/assets/js/cut-studio.js'),webHtml=read('public/pages/cut-studio.html'),webCss=read('public/assets/css/cut-studio.css');
const launcherJs=read('launcher/renderer/app.js'),launcherHtml=read('launcher/renderer/index.html'),launcherCss=read('launcher/renderer/styles.css');
const pkg=JSON.parse(read('package.json')),checklist=read('CFS_MASTER_CHECKLIST_PASS21.md'),detail=read('STREAM_STUDIO_RECORDING_CUT_HANDOFF_PASS21_10_25.md');

ok('Pass 21.10.25 handoff milestone remains documented',()=>assert.ok(detail.includes('Pass 21.10.25')&&detail.includes('Recording → Cut Studio Multitrack Handoff')));
ok('Source tracks map six recording stems',()=>{const rows=sourceTracks([{key:'mix',title:'Stream Mix'},{key:'mic',title:'Mic'},{key:'game',title:'Game'},{key:'discord',title:'Discord'},{key:'music',title:'Music'},{key:'alerts',title:'Alerts'}]);assert.equal(rows.length,6)});
ok('Source tracks preserve embedded stream indices',()=>{const rows=sourceTracks([{key:'mix'},{key:'mic'},{key:'game'}]);assert.deepEqual(rows.map(x=>x.stream_index),[0,1,2])});
ok('Stream Mix is disabled by default when stems exist',()=>{const rows=sourceTracks([{key:'mix'},{key:'mic'}]);assert.equal(rows[0].enabled,false);assert.equal(rows[1].enabled,true)});
ok('Single recording track remains enabled',()=>assert.equal(sourceTracks([{key:'mix'}])[0].enabled,true));
ok('Duration uses recording timestamps',()=>assert.equal(durationMs('2026-01-01T00:00:00Z','2026-01-01T00:00:12Z',0),12000));

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-rec-cut-'));
const media=path.join(tmp,'recording.mkv');fs.writeFileSync(media,Buffer.alloc(2048,7));
const storeFile=path.join(tmp,'recording-handoffs.json');
const store=new RecordingHandoffStore(storeFile);
const handoff=store.create({filePath:media,startedAt:'2026-01-01T00:00:00Z',stoppedAt:'2026-01-01T00:10:00Z',profile:'1080p60',encoder:'nvenc',sceneId:'scene_1',sceneName:'Gameplay',audioTracks:[{key:'mix',title:'Stream Mix'},{key:'mic',title:'Mic'},{key:'game',title:'Game'}],streamKey:'DO_NOT_STORE',token:'DO_NOT_STORE',serverUrl:'rtmps://secret.example/live'});
ok('Handoff creates stable rec id',()=>assert.match(handoff.id,/^rec_[a-f0-9]{16}$/));
ok('Handoff stores local file path only in local store',()=>assert.equal(path.resolve(handoff.filePath),path.resolve(media)));
ok('Handoff records file byte size',()=>assert.equal(handoff.bytes,2048));
ok('Handoff records scene metadata',()=>assert.equal(handoff.sceneName,'Gameplay'));
ok('Handoff records 10 minute duration',()=>assert.equal(handoff.durationMs,600000));
ok('Handoff starts pending',()=>assert.equal(handoff.status,'pending'));
ok('Local store never persists streamKey',()=>assert.ok(!fs.readFileSync(storeFile,'utf8').includes('DO_NOT_STORE')));
ok('Local store never persists injected RTMP server',()=>assert.ok(!fs.readFileSync(storeFile,'utf8').includes('secret.example')));
ok('Handoff can enter linking state',()=>assert.equal(store.setProject(handoff.id,{projectId:'cut_1',projectTitle:'Recording'}).status,'linking'));
ok('Handoff can become ready',()=>assert.equal(store.markLinked(handoff.id,{projectId:'cut_1'}).status,'ready'));
ok('Snapshot counts ready handoffs',()=>assert.equal(store.snapshot().ready,1));

ok('Cut source-track sanitizer limits to eight',()=>assert.equal(sanitizeSourceTracks(Array.from({length:12},(_,i)=>({key:`t${i}`,stream_index:i}))).length,8));
ok('Cut source-track sanitizer clamps stream index',()=>assert.equal(sanitizeSourceTracks([{key:'mic',stream_index:99}])[0].stream_index,15));
ok('Cut source-track sanitizer clamps gain',()=>assert.equal(sanitizeSourceTracks([{key:'mic',gain_db:99}])[0].gain_db,12));
ok('Cut source-track sanitizer clamps pan',()=>assert.equal(sanitizeSourceTracks([{key:'mic',pan:-9}])[0].pan,-1));
ok('Cut project retains handoff id',()=>{const p=sanitizeCutProject({export_preset:{source_handoff_id:'rec_abc',source_tracks:[{key:'mic',label:'Mic',stream_index:1}]}});assert.equal(p.export_preset.source_handoff_id,'rec_abc')});
ok('Cut project retains source track metadata',()=>{const p=sanitizeCutProject({export_preset:{source_tracks:[{key:'mic',label:'Mic',stream_index:1,solo:true}]}});assert.equal(p.export_preset.source_tracks[0].solo,true)});

const project=sanitizeCutProject({title:'Recording',format:'landscape',export_preset:{source_handoff_id:'rec_abc',source_tracks:[{key:'mix',label:'Stream Mix',stream_index:0,enabled:false},{key:'mic',label:'Mic',stream_index:1,enabled:true,gain_db:2},{key:'game',label:'Game',stream_index:2,enabled:true}]}});
const manifest=buildCutJobManifest({...project,id:'cut_1'},[{id:'clip_1',label:'Full',in_ms:0,out_ms:10000,selected:true,sort_order:0}]);
ok('Cut job manifest keeps embedded tracks',()=>assert.equal(manifest.export_preset.source_tracks.length,3));
ok('Cut job manifest keeps handoff id',()=>assert.equal(manifest.export_preset.source_handoff_id,'rec_abc'));
ok('Cut job manifest contains no local file path',()=>assert.ok(!JSON.stringify(manifest).includes(media)));

const engine=new CutMediaEngine({outputRoot:tmp});
engine.state.capabilities.encoders.software=true;
const clip={in_ms:0,out_ms:10000,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0};
const args=engine.buildArgs({sourcePath:'recording.mkv',clip,manifest:{format:'landscape',export_preset:{fps:30,encoder:'software',audio_bitrate_kbps:192,source_tracks:manifest.export_preset.source_tracks}},outputPath:'out.mp4',hasAudio:true});
const graph=args[args.indexOf('-filter_complex')+1];
ok('Media engine reads Mic from embedded stream 1',()=>assert.ok(graph.includes('[0:a:1]')));
ok('Media engine reads Game from embedded stream 2',()=>assert.ok(graph.includes('[0:a:2]')));
ok('Disabled Stream Mix is not read',()=>assert.ok(!graph.includes('[0:a:0]')));
ok('Media engine mixes active source stems',()=>assert.ok(graph.includes('amix=inputs=2')));
ok('Media engine maps mixed source label',()=>assert.ok(args.includes('[cfs_src_audio]')));
ok('Source track gain reaches FFmpeg graph',()=>assert.ok(graph.includes('volume=2.0dB')));
const soloArgs=engine.buildArgs({sourcePath:'recording.mkv',clip,manifest:{format:'landscape',export_preset:{fps:30,encoder:'software',source_tracks:[{key:'mic',stream_index:1,enabled:true,solo:true},{key:'game',stream_index:2,enabled:true,solo:false}]}},outputPath:'solo.mp4',hasAudio:true});
const soloGraph=soloArgs[soloArgs.indexOf('-filter_complex')+1];
ok('Solo keeps selected embedded source',()=>assert.ok(soloGraph.includes('[0:a:1]')));
ok('Solo excludes other embedded source',()=>assert.ok(!soloGraph.includes('[0:a:2]')));

ok('Stream Engine emits recording-finalized event',()=>assert.ok(read('launcher/src/stream-engine.js').includes('recording-finalized')));
ok('Finalized event includes audio track metadata',()=>assert.ok(read('launcher/src/stream-engine.js').includes('audioTracks:')));
ok('Bridge client can create Cut project',()=>assert.ok(bridge.includes('createCutProject(payload')));
ok('Bridge client can create Cut clip',()=>assert.ok(bridge.includes('createCutClip(projectId')));
ok('Server exposes bridge Cut project POST',()=>assert.ok(server.includes('app.post("/api/bridge/cut-studio/projects"')));
ok('Server exposes bridge Cut clip POST',()=>assert.ok(server.includes('app.post("/api/bridge/cut-studio/projects/:id/clips"')));
ok('Launcher auto materializes finalized recordings',()=>assert.ok(main.includes('handleRecordingFinalized')&&main.includes('materializeRecordingHandoff')));
ok('Launcher creates one full-recording clip',()=>assert.ok(main.includes('label:"Gesamte Aufnahme"')));
ok('Launcher keeps local recording path in MediaSourceStore',()=>assert.ok(main.includes('filePath:handoff.filePath')));
ok('Launcher strips source stems for unrelated manual video files',()=>assert.ok(main.includes('linkedRecordingHandoff')&&main.includes('source_tracks:[]')));
ok('Preload exposes recording handoff action',()=>assert.ok(preload.includes('handoffRecordingToCut')));

ok('Cut Studio has embedded recording track panel',()=>assert.ok(webHtml.includes('cutRecordingTracksPanel')));
ok('Cut Studio renders source tracks',()=>assert.ok(webJs.includes('renderSourceTracks')));
ok('Cut Studio reads edited source tracks',()=>assert.ok(webJs.includes('readSourceTracks')));
ok('Cut Studio preserves source handoff id on save',()=>assert.ok(webJs.includes('source_handoff_id:String(state.project?.export_preset?.source_handoff_id')));
ok('Cut Studio source tracks expose gain/mute/solo/pan',()=>['gain_db','mute','solo','pan'].forEach(x=>assert.ok(webJs.includes(`data-source-track-field="${x}"`))));
ok('Cut Studio styles recording track editor',()=>assert.ok(webCss.includes('.cut-recording-tracks')));
ok('Launcher has recording handoff list',()=>assert.ok(launcherHtml.includes('toolsRecordingHandoffs')));
ok('Launcher has recording handoff counter',()=>assert.ok(launcherHtml.includes('toolsRecordingHandoffCount')));
ok('Launcher renders handoff status and actions',()=>assert.ok(launcherJs.includes('data-recording-handoff')));
ok('Launcher invokes handoff API from UI',()=>assert.ok(launcherJs.includes('handoffRecordingToCut')));
ok('Launcher styles recording handoff cards',()=>assert.ok(launcherCss.includes('.tools-recording-handoff')));

ok('Root package registers pass 21.10.25 check',()=>assert.ok(pkg.scripts?.['studio-recording-cut21:check']?.includes('pass21-10-25-test.mjs')));
ok('Combined Stream Studio check includes pass 21.10.25',()=>assert.ok(pkg.scripts?.['stream-studio21:check']?.includes('studio-recording-cut21:check')));
ok('Master checklist retains pass 21.10.25 milestone',()=>assert.ok(checklist.includes('## Pass 21.10.25 Update')));
ok('Pass 21.10.25 checklist section exists',()=>assert.ok(checklist.includes('## Pass 21.10.25 Update')));
ok('Pass detail documentation exists',()=>assert.ok(detail.includes('Pass 21.10.25')&&detail.includes('Recording → Cut Studio Multitrack Handoff')));
ok('Detail docs explicitly keep media local',()=>assert.ok(detail.includes('lokal')&&detail.includes('Streamkeys')));

console.log(`\nStream Studio Recording → Cut Studio Handoff Pass 21.10.25: ${pass}/${pass+fail} PASS`);
if(fail)process.exitCode=1;
