import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {StreamRuntimeEvidenceRecorder,EVIDENCE_SCHEMA,EVIDENCE_PASS,DEFAULT_SAMPLE_MS,MAX_SAMPLES,sanitizeEngineTelemetry,sampleFromProviders,summarizeEvidence}=require('../launcher/src/stream-runtime-evidence.js');

let pass=0,fail=0;function yes(name,ok){if(ok){pass++;console.log(`PASS ${name}`)}else{fail++;console.error(`FAIL ${name}`)}}function check(name,fn){try{fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}

const moduleText=fs.readFileSync(new URL('../launcher/src/stream-runtime-evidence.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../launcher/main.js',import.meta.url),'utf8');
const preload=fs.readFileSync(new URL('../launcher/preload.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../launcher/renderer/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../launcher/renderer/index.html',import.meta.url),'utf8');
const summaryTool=fs.readFileSync(new URL('../launcher/tools/stream-runtime-evidence-summary.mjs',import.meta.url),'utf8');
const rootPkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const launcherPkg=JSON.parse(fs.readFileSync(new URL('../launcher/package.json',import.meta.url),'utf8'));
const checklist=fs.readFileSync(new URL('../CFS_MASTER_CHECKLIST_PASS21.md',import.meta.url),'utf8');
const detail=fs.readFileSync(new URL('../STREAM_STUDIO_RUNTIME_EVIDENCE_PASS21_10_22.md',import.meta.url),'utf8');

check('Evidence schema is v1',()=>assert.equal(EVIDENCE_SCHEMA,1));
check('Evidence pass is 21.10.22',()=>assert.equal(EVIDENCE_PASS,'21.10.22'));
check('Default sample cadence is 2 seconds',()=>assert.equal(DEFAULT_SAMPLE_MS,2000));
check('Evidence sample retention is bounded',()=>assert.ok(MAX_SAMPLES>=1000&&MAX_SAMPLES<=20000));

check('Telemetry sanitizer excludes file paths and credentials',()=>{const clean=sanitizeEngineTelemetry({status:'running',streamKey:'SECRET',filePath:'C:/secret.mkv',destinations:{a:{id:'a',provider:'twitch',status:'live',streamKey:'SECRET',metrics:{fps:60}}}});const text=JSON.stringify(clean);assert.equal(text.includes('SECRET'),false);assert.equal(text.includes('secret.mkv'),false);assert.equal(clean.destinations[0].provider,'twitch')});
check('Sample contains engine, game and audio metrics only',()=>{const row=sampleFromProviders({engineTelemetry:{status:'running',metrics:{uploadKbps:5000}},gameCapture:{runtimeVerified:true,totals:{frameStalls:1}},applicationAudio:{runtimeVerified:true,recovery:{recoveries:2}}});assert.equal(row.engine.metrics.uploadKbps,5000);assert.equal(row.gameCapture.totals.frameStalls,1);assert.equal(row.applicationAudio.recovery.recoveries,2)});

check('Summary aggregates multistream, recording, scene and recovery evidence',()=>{const samples=[
 {at:'2026-09-18T10:00:00.000Z',engine:{metrics:{uploadKbps:9000,encoderSpeed:1.03,averageFps:60,droppedFrames:0,reconnects:0,watchdogRestarts:0,errors:0,sceneSwitches:1,sceneSwitchFailures:0,sceneTransitions:1,sceneTransitionFallbacks:0},destinations:[{id:'yt',label:'YouTube',provider:'youtube',status:'live',reconnectAttempt:0,metrics:{fps:60,speed:1.02,droppedFrames:0}}],recording:{status:'live',metrics:{fps:60,speed:1.01,droppedFrames:0}}},gameCapture:{totals:{helperRestarts:0,frameStalls:0,deviceLossRestarts:0,windowRebinds:0,captureErrors:0,bytes:100}},applicationAudio:{recovery:{recoveries:0,helperRestarts:0,processRebinds:0,continuityBytes:0}}},
 {at:'2026-09-18T10:10:00.000Z',engine:{metrics:{uploadKbps:11000,encoderSpeed:.98,averageFps:59.8,droppedFrames:4,reconnects:1,watchdogRestarts:0,errors:0,sceneSwitches:3,sceneSwitchFailures:0,sceneTransitions:2,sceneTransitionFallbacks:1},destinations:[{id:'yt',label:'YouTube',provider:'youtube',status:'live',reconnectAttempt:1,metrics:{fps:59,speed:.98,droppedFrames:4}},{id:'tw',label:'Twitch',provider:'twitch',status:'live',reconnectAttempt:0,metrics:{fps:60,speed:1.00,droppedFrames:0}}],recording:{status:'live',metrics:{fps:60,speed:.99,droppedFrames:0}}},gameCapture:{totals:{helperRestarts:1,frameStalls:1,deviceLossRestarts:0,windowRebinds:1,captureErrors:0,bytes:200}},applicationAudio:{recovery:{recoveries:1,helperRestarts:1,processRebinds:1,continuityBytes:4096}}}
 ];const s=summarizeEvidence(samples,{expectedTargets:2,recordingExpected:true});assert.equal(s.durationMs,600000);assert.equal(s.targetIds.length,2);assert.equal(s.recording.observed,true);assert.equal(s.maxDroppedFrames,4);assert.equal(s.reconnects,1);assert.equal(s.sceneSwitches,3);assert.equal(s.gameCapture.frameStalls,1);assert.equal(s.applicationAudio.continuityBytes,4096);assert.ok(s.warnings.some(x=>x.includes('Dropped Frames')))});

check('Game and audio recovery counters are session deltas, not launcher-lifetime totals',()=>{const rows=[{at:'2026-09-18T10:00:00Z',engine:{metrics:{},destinations:[]},gameCapture:{totals:{helperRestarts:5,frameStalls:3,bytes:1000}},applicationAudio:{recovery:{recoveries:7,helperRestarts:4,processRebinds:2,continuityBytes:900}}},{at:'2026-09-18T10:05:00Z',engine:{metrics:{},destinations:[]},gameCapture:{totals:{helperRestarts:7,frameStalls:4,bytes:1600}},applicationAudio:{recovery:{recoveries:8,helperRestarts:5,processRebinds:4,continuityBytes:1200}}}];const s=summarizeEvidence(rows,{});assert.equal(s.gameCapture.helperRestarts,2);assert.equal(s.gameCapture.frameStalls,1);assert.equal(s.gameCapture.bytes,600);assert.equal(s.applicationAudio.recoveries,1);assert.equal(s.applicationAudio.processRebinds,2);assert.equal(s.applicationAudio.continuityBytes,300)});

check('Recorder writes JSON and matching SHA-256 without raw media or secrets',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-evidence-'));let now=Date.parse('2026-09-18T10:00:00Z');let engine={status:'running',desiredRunning:true,metrics:{uploadKbps:5000,liveTargets:1,encoderSpeed:1,averageFps:60},destinations:{yt:{id:'yt',label:'YT',provider:'youtube',status:'live',metrics:{fps:60,speed:1}}},recording:null};const recorder=new StreamRuntimeEvidenceRecorder({baseDir:dir,nowFn:()=>now,setIntervalFn:()=>({unref(){}}),clearIntervalFn:()=>{},telemetryProvider:()=>engine,gameCaptureProvider:()=>({runtimeVerified:true,totals:{bytes:123}}),applicationAudioProvider:()=>({runtimeVerified:true,recovery:{recoveries:0}})});recorder.start({label:'test',expectedTargets:1,providers:['youtube'],captureType:'game'});now+=120000;recorder.capture('manual');const result=recorder.finalize('test_stop');assert.ok(fs.existsSync(result.filePath));assert.ok(fs.existsSync(result.filePath+'.sha256'));const text=fs.readFileSync(result.filePath,'utf8');const data=JSON.parse(text);assert.equal(data.rawMediaPersisted,false);assert.equal(data.secretsPersisted,false);assert.equal(text.includes('streamKey'),false);assert.equal(data.summary.targetIds[0],'yt');const hash=crypto.createHash('sha256').update(text).digest('hex');assert.equal(result.sha256,hash);assert.ok(fs.readFileSync(result.filePath+'.sha256','utf8').includes(hash));fs.rmSync(dir,{recursive:true,force:true})});

check('Main starts evidence only after successful engine start',()=>assert.ok(main.indexOf('const result=await engine.start')<main.indexOf('beginStreamRuntimeEvidence({targets:active')));
check('Main finalizes evidence on stream stop',()=>assert.ok(main.includes('finishStreamRuntimeEvidence("stream_stop")')));
check('Main finalizes evidence on device logout',()=>assert.ok(main.includes('finishStreamRuntimeEvidence("device_logout")')));
check('Graceful shutdown finalizes evidence',()=>assert.ok(main.includes('finishStreamRuntimeEvidence(reason)')));
check('Engine state updates feed evidence samples',()=>assert.ok(main.includes('capture?.("engine_state")')));
check('Game recovery becomes evidence event',()=>assert.ok(main.includes('game_capture_recovery')));
check('Audio recovery becomes evidence event',()=>assert.ok(main.includes('application_audio_recovery')));
check('Evidence folder IPC exists',()=>assert.ok(main.includes('launcher:stream-evidence-open')));
check('Preload exposes evidence folder action',()=>assert.ok(preload.includes('openStreamEvidence')));
check('Launcher UI still exposes automatic soak evidence status',()=>assert.ok(html.includes('streamEvidenceSamples')&&html.includes('stream-evidence-box')));
check('Renderer explicitly says raw media and secrets are not stored',()=>assert.ok(app.includes('keine Streamkeys, Tokens, Audio- oder Videodaten')));
check('Renderer opens evidence folder',()=>assert.ok(app.includes('openStreamEvidence()')));
check('Summary tool refuses wrong evidence kind/pass',()=>assert.ok(summaryTool.includes("stream_runtime_soak_evidence")&&summaryTool.includes("21.10.22")));
check('Summary tool states this is not automatically real acceptance',()=>assert.ok(summaryTool.includes('noch keine reale Plattform-Abnahme')));
check('Launcher package exposes evidence summary',()=>assert.equal(launcherPkg.scripts['stream-evidence:summary'],'node tools/stream-runtime-evidence-summary.mjs'));
check('Root package registers pass 21.10.22 check',()=>assert.ok(rootPkg.scripts?.['studio-runtime-evidence21:check']?.includes('stream-studio-runtime-evidence-pass21-10-22-test.mjs')));
check('Combined Stream Studio check includes pass 21.10.22',()=>assert.ok(rootPkg.scripts?.['stream-studio21:check']?.includes('studio-runtime-evidence21:check')));
check('Pass 21.10.22 remains represented in master checklist',()=>assert.ok(checklist.includes('## Pass 21.10.22 Update')));
check('Pass 21.10.22 checklist section exists',()=>assert.ok(checklist.includes('## Pass 21.10.22 Update')));
check('Pass detail documentation exists',()=>assert.ok(detail.includes('Pass 21.10.22')&&detail.includes('Runtime Evidence')));
check('Previous pass 21.10.21 remains documented',()=>assert.ok(checklist.includes('## Pass 21.10.21 Update')));
check('Evidence module marks rawMediaPersisted false',()=>assert.ok(moduleText.includes('rawMediaPersisted:false')));
check('Evidence module marks secretsPersisted false',()=>assert.ok(moduleText.includes('secretsPersisted:false')));

console.log(`\nStream Studio Runtime Evidence Pass 21.10.22: ${pass}/${pass+fail} PASS`);if(fail)process.exitCode=1;
