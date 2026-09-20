import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {summarizeEvidence,StreamRuntimeEvidenceRecorder}=require('../launcher/src/stream-runtime-evidence.js');
const {GUARD_PASS,GUARD_SCHEMA,DEFAULT_GUARD_PROFILE,DEFAULT_THRESHOLDS,evaluateSoakGuard,buildScenarioCoverage,audioBytesToMs,worstStatus}=require('../launcher/src/stream-soak-guard.js');

let pass=0,fail=0;function yes(name,ok){if(ok){pass++;console.log(`PASS ${name}`)}else{fail++;console.error(`FAIL ${name}`)}}function check(name,fn){try{fn();yes(name,true)}catch(error){yes(name,false);console.error(error?.stack||error)}}

const guardText=fs.readFileSync(new URL('../launcher/src/stream-soak-guard.js',import.meta.url),'utf8');
const evidenceText=fs.readFileSync(new URL('../launcher/src/stream-runtime-evidence.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../launcher/main.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../launcher/renderer/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../launcher/renderer/index.html',import.meta.url),'utf8');
const summaryTool=fs.readFileSync(new URL('../launcher/tools/stream-runtime-evidence-summary.mjs',import.meta.url),'utf8');
const rootPkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const launcherPkg=JSON.parse(fs.readFileSync(new URL('../launcher/package.json',import.meta.url),'utf8'));
const checklist=fs.readFileSync(new URL('../CFS_MASTER_CHECKLIST_PASS21.md',import.meta.url),'utf8');
const detail=fs.readFileSync(new URL('../STREAM_STUDIO_SOAK_GUARD_PASS21_10_23.md',import.meta.url),'utf8');

function makeRows({minutes=10,targetCount=2,expectedFps=60,outageSamples=0,recording=true,encoderSpeed=1.02,dropped=0,errors=0,watchdog=0,switchFailures=0,transitionFallbacks=0,reconnects=1,gameRebind=1,audioRebind=1,helperRestarts=0,frameStalls=0,deviceLoss=0,captureErrors=0,audioRecoveries=0,audioContinuityBytes=0}={}){
  const sampleMs=2000,start=Date.parse('2026-09-18T10:00:00Z'),count=Math.floor(minutes*60000/sampleMs)+1,rows=[];
  for(let i=0;i<count;i++){
    const at=new Date(start+i*sampleMs).toISOString(),outage=i>=100&&i<100+outageSamples;
    const destinations=Array.from({length:targetCount},(_,idx)=>({id:`t${idx+1}`,label:`Target ${idx+1}`,provider:idx===0?'youtube':'twitch',status:outage&&idx===0?'reconnecting':'live',reconnectAttempt:outage&&idx===0?1:0,metrics:{fps:expectedFps,speed:encoderSpeed,droppedFrames:dropped,duplicatedFrames:0}}));
    rows.push({at,engine:{metrics:{uploadKbps:12000,encoderSpeed,averageFps:expectedFps,droppedFrames:dropped,reconnects:i>=100?reconnects:0,watchdogRestarts:watchdog,errors,sceneSwitches:i>=50?1:0,sceneSwitchFailures:switchFailures,sceneTransitions:i>=60?1:0,sceneTransitionFallbacks:transitionFallbacks},destinations,recording:recording?{status:'live',metrics:{fps:expectedFps,speed:encoderSpeed,droppedFrames:dropped,duplicatedFrames:0}}:null},gameCapture:{totals:{helperRestarts:i>=120?helperRestarts:0,processRebinds:0,windowRebinds:i>=150?gameRebind:0,frameStalls:i>=120?frameStalls:0,deviceLossRestarts:i>=120?deviceLoss:0,captureErrors:i>=120?captureErrors:0,bytes:i*1000}},applicationAudio:{recovery:{helperRestarts:0,processRebinds:i>=200?audioRebind:0,continuityBytes:i>=120?audioContinuityBytes:0,recoveries:i>=120?audioRecoveries:0}}});
  }
  return rows;
}
function summarizeAndGuard(opts={},meta={}){const rows=makeRows(opts),m={expectedTargets:opts.targetCount??2,recordingExpected:opts.recording!==false,captureType:'game',audioSources:['discord'],sampleMs:2000,expectedFps:60,...meta};const summary=summarizeEvidence(rows,m);return {summary,guard:evaluateSoakGuard(summary,m),meta:m,rows}}

check('Guard schema is v1',()=>assert.equal(GUARD_SCHEMA,1));
check('Guard pass is 21.10.23',()=>assert.equal(GUARD_PASS,'21.10.23'));
check('Default guard profile is windows_multistream_10m',()=>assert.equal(DEFAULT_GUARD_PROFILE,'windows_multistream_10m'));
check('Minimum soak duration is 10 minutes',()=>assert.equal(DEFAULT_THRESHOLDS.minDurationMs,600000));
check('Encoder WARN threshold is 0.98x',()=>assert.equal(DEFAULT_THRESHOLDS.encoderSpeedWarnBelow,.98));
check('Encoder FAIL threshold is 0.90x',()=>assert.equal(DEFAULT_THRESHOLDS.encoderSpeedFailBelow,.90));
check('Target WARN live coverage is 98 percent',()=>assert.equal(DEFAULT_THRESHOLDS.targetLiveCoverageWarnBelow,98));
check('Target FAIL live coverage is 95 percent',()=>assert.equal(DEFAULT_THRESHOLDS.targetLiveCoverageFailBelow,95));
check('Target outage WARN is 10 seconds',()=>assert.equal(DEFAULT_THRESHOLDS.targetOutageWarnAboveMs,10000));
check('Target outage FAIL is 30 seconds',()=>assert.equal(DEFAULT_THRESHOLDS.targetOutageFailAboveMs,30000));
check('Audio continuity conversion assumes 48k stereo s16le',()=>assert.equal(audioBytesToMs(192000),1000));
check('Worst status orders FAIL above INCOMPLETE/WARN/PASS',()=>assert.equal(worstStatus([{status:'WARN'},{status:'INCOMPLETE'},{status:'FAIL'}]),'FAIL'));

check('Healthy 10 minute soak reaches technical PASS',()=>{const {guard}=summarizeAndGuard({outageSamples:3});assert.equal(guard.status,'PASS')});
check('Healthy soak with exercised scenarios reaches acceptance PASS',()=>{const {guard}=summarizeAndGuard({outageSamples:3,reconnects:1,gameRebind:1,audioRebind:1});assert.equal(guard.acceptanceStatus,'PASS');assert.equal(guard.acceptanceReady,true)});
check('Short soak is INCOMPLETE not PASS',()=>{const {guard}=summarizeAndGuard({minutes:2});assert.equal(guard.status,'INCOMPLETE')});
check('Short soak does not become automatic acceptance',()=>{const {guard}=summarizeAndGuard({minutes:2});assert.equal(guard.acceptanceReady,false)});
check('Encoder speed below 0.98 warns',()=>{const {guard}=summarizeAndGuard({encoderSpeed:.95});assert.equal(guard.checks.find(x=>x.id==='encoder_speed').status,'WARN')});
check('Encoder speed below 0.90 fails',()=>{const {guard}=summarizeAndGuard({encoderSpeed:.85});assert.equal(guard.checks.find(x=>x.id==='encoder_speed').status,'FAIL');assert.equal(guard.status,'FAIL')});
check('Dropped frame WARN budget is enforced',()=>{const {guard}=summarizeAndGuard({dropped:6});assert.equal(guard.checks.find(x=>x.id==='dropped_frames').status,'WARN')});
check('Dropped frame FAIL budget is enforced',()=>{const {guard}=summarizeAndGuard({dropped:31});assert.equal(guard.checks.find(x=>x.id==='dropped_frames').status,'FAIL')});
check('Engine errors are hard FAIL',()=>{const {guard}=summarizeAndGuard({errors:1});assert.equal(guard.checks.find(x=>x.id==='engine_errors').status,'FAIL')});
check('Watchdog restarts are hard FAIL',()=>{const {guard}=summarizeAndGuard({watchdog:1});assert.equal(guard.checks.find(x=>x.id==='watchdog').status,'FAIL')});
check('Scene switch failures are hard FAIL',()=>{const {guard}=summarizeAndGuard({switchFailures:1});assert.equal(guard.checks.find(x=>x.id==='scene_switch').status,'FAIL')});
check('Transition fallback produces WARN',()=>{const {guard}=summarizeAndGuard({transitionFallbacks:1});assert.equal(guard.checks.find(x=>x.id==='transition_fallback').status,'WARN')});
check('Six second target reconnect remains inside PASS budget',()=>{const {guard}=summarizeAndGuard({outageSamples:3});assert.equal(guard.checks.find(x=>x.id==='target:t1').status,'PASS')});
check('Twelve second target outage warns',()=>{const {guard}=summarizeAndGuard({outageSamples:6});assert.equal(guard.checks.find(x=>x.id==='target:t1').status,'WARN')});
check('Thirty two second target outage fails',()=>{const {guard}=summarizeAndGuard({outageSamples:16});assert.equal(guard.checks.find(x=>x.id==='target:t1').status,'FAIL')});
check('Summary stores per-target live coverage',()=>{const {summary}=summarizeAndGuard({outageSamples:3});assert.ok(summary.targets.t1.liveCoveragePct>98&&summary.targets.t1.liveCoveragePct<100)});
check('Summary stores per-target longest outage',()=>{const {summary}=summarizeAndGuard({outageSamples:3});assert.equal(summary.targets.t1.longestNonLiveMs,6000)});
check('Summary stores recording live coverage',()=>{const {summary}=summarizeAndGuard({});assert.equal(summary.recording.liveCoveragePct,100)});
check('Missing expected recording fails recording gate',()=>{const {guard}=summarizeAndGuard({recording:false},{recordingExpected:true});assert.equal(guard.checks.find(x=>x.id==='recording').status,'FAIL')});
check('Capture errors fail game recovery gate',()=>{const {guard}=summarizeAndGuard({captureErrors:1});assert.equal(guard.checks.find(x=>x.id==='game_recovery').status,'FAIL')});
check('Single game helper restart warns without hard fail',()=>{const {guard}=summarizeAndGuard({helperRestarts:1});assert.equal(guard.checks.find(x=>x.id==='game_recovery').status,'WARN')});
check('Four game helper restarts fail recovery budget',()=>{const {guard}=summarizeAndGuard({helperRestarts:4});assert.equal(guard.checks.find(x=>x.id==='game_recovery').status,'FAIL')});
check('Application audio continuity above two seconds warns',()=>{const {guard}=summarizeAndGuard({audioContinuityBytes:192000*3});assert.equal(guard.checks.find(x=>x.id==='audio_recovery').status,'WARN')});
check('Application audio continuity above ten seconds fails',()=>{const {guard}=summarizeAndGuard({audioContinuityBytes:192000*11});assert.equal(guard.checks.find(x=>x.id==='audio_recovery').status,'FAIL')});
check('Scenario coverage requires target reconnect for multi-target soak',()=>{const summary=summarizeEvidence(makeRows({reconnects:0,outageSamples:0}),{expectedTargets:2,recordingExpected:true});summary.reconnects=0;const coverage=buildScenarioCoverage(summary,{expectedTargets:2,recordingExpected:true,captureType:'game',audioSources:['discord']});assert.ok(coverage.missing.includes('Isolierter Ziel-Reconnect'))});
check('Scenario coverage requires game rebind for game capture',()=>{const {summary}=summarizeAndGuard({gameRebind:0});summary.gameCapture.windowRebinds=0;summary.gameCapture.processRebinds=0;const coverage=buildScenarioCoverage(summary,{expectedTargets:2,recordingExpected:true,captureType:'game',audioSources:['discord']});assert.ok(coverage.missing.includes('Game Window/Process Rebind'))});
check('Scenario coverage requires app-audio rebind when app audio is configured',()=>{const {summary}=summarizeAndGuard({audioRebind:0});summary.applicationAudio.processRebinds=0;const coverage=buildScenarioCoverage(summary,{expectedTargets:2,recordingExpected:true,captureType:'game',audioSources:['discord']});assert.ok(coverage.missing.includes('Application-Audio Rebind'))});
check('Missing scenario coverage makes acceptance INCOMPLETE without lowering technical quality',()=>{const {summary,meta}=summarizeAndGuard({outageSamples:0,reconnects:0,gameRebind:0,audioRebind:0});summary.reconnects=0;summary.gameCapture.windowRebinds=0;summary.applicationAudio.processRebinds=0;const guard=evaluateSoakGuard(summary,meta);assert.equal(guard.status,'PASS');assert.equal(guard.acceptanceStatus,'INCOMPLETE')});
check('Guard explicitly does not auto-mark platform acceptance',()=>{const {guard}=summarizeAndGuard({outageSamples:3});assert.equal(guard.platformAcceptance,false);assert.equal(guard.realWindowsAcceptance,false)});

check('Recorder persists guardPass 21.10.23 and guard object',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-guard-'));let now=Date.parse('2026-09-18T10:00:00Z');const engine={status:'running',metrics:{encoderSpeed:1,averageFps:60,droppedFrames:0,reconnects:1,sceneSwitches:1,sceneTransitions:1},destinations:{yt:{id:'yt',label:'YT',provider:'youtube',status:'live',metrics:{fps:60,speed:1,droppedFrames:0}}},recording:{status:'live',metrics:{fps:60,speed:1,droppedFrames:0}}};const rec=new StreamRuntimeEvidenceRecorder({baseDir:dir,nowFn:()=>now,setIntervalFn:()=>({unref(){}}),clearIntervalFn:()=>{},telemetryProvider:()=>engine,gameCaptureProvider:()=>({totals:{windowRebinds:1}}),applicationAudioProvider:()=>({recovery:{processRebinds:1}})});rec.start({expectedTargets:1,recordingExpected:true,captureType:'game',audioSources:['discord'],sampleMs:2000,expectedFps:60});now+=600000;rec.capture('end');const out=rec.finalize('test');const data=JSON.parse(fs.readFileSync(out.filePath,'utf8'));assert.equal(data.guardPass,'21.10.23');assert.equal(data.guard.pass,'21.10.23');assert.equal(data.summary.guard.pass,'21.10.23');assert.equal(data.rawMediaPersisted,false);assert.equal(data.secretsPersisted,false);fs.rmSync(dir,{recursive:true,force:true})});
check('Evidence meta stores sample cadence',()=>assert.ok(evidenceText.includes('sampleMs:Math.max(1000')));
check('Evidence meta stores expected FPS',()=>assert.ok(evidenceText.includes('expectedFps:safeNumber')));
check('Main passes output FPS into evidence recorder',()=>assert.ok(main.includes('expectedFps:Number(output?.fps||0)')));
check('Launcher UI advanced to pass 21.10.23',()=>assert.ok(html.includes('RUNTIME EVIDENCE + SOAK GUARD · PASS 21.10.23')));
check('Launcher UI exposes guard and acceptance cells',()=>assert.ok(html.includes('streamEvidenceGuard')&&html.includes('streamEvidenceAcceptance')));
check('Renderer shows technical guard status',()=>assert.ok(app.includes('GUARD ${String(guard.status||"–")}')));
check('Renderer states guard is not automatic real acceptance',()=>assert.ok(app.includes('keine automatische reale Plattform-Abnahme')));
check('Summary tool prints SOAK GUARD pass',()=>assert.ok(summaryTool.includes('SOAK GUARD · PASS')));
check('Summary tool prints strict automation mode',()=>assert.ok(summaryTool.includes("has('--strict')")));
check('Summary tool still accepts Pass 21.10.22 evidence files',()=>assert.ok(summaryTool.includes("data?.pass!=='21.10.22'")));
check('Summary tool explicitly denies auto acceptance',()=>assert.ok(summaryTool.includes('keine reale Plattform-Abnahme')));
check('Launcher package exposes explicit guard command',()=>assert.equal(launcherPkg.scripts['stream-evidence:guard'],'node tools/stream-runtime-evidence-summary.mjs --guard'));
check('Root package exposes explicit guard command',()=>assert.equal(rootPkg.scripts['stream-evidence:guard'],'npm --prefix launcher run stream-evidence:guard --'));
check('Root package registers pass 21.10.23 check',()=>assert.ok(rootPkg.scripts?.['studio-soak-guard21:check']?.includes('stream-studio-soak-guard-pass21-10-23-test.mjs')));
check('Combined Stream Studio check includes pass 21.10.23',()=>assert.ok(rootPkg.scripts?.['stream-studio21:check']?.includes('studio-soak-guard21:check')));
check('Pass 21.10.23 remains documented after later passes',()=>assert.ok(checklist.includes('## Pass 21.10.23 Update')));
check('Pass 21.10.23 checklist section exists',()=>assert.ok(checklist.includes('## Pass 21.10.23 Update')));
check('Pass 21.10.23 detail documentation exists',()=>assert.ok(detail.includes('Pass 21.10.23')&&detail.includes('Soak Guard')));
check('Previous pass 21.10.22 remains documented',()=>assert.ok(checklist.includes('## Pass 21.10.22 Update')));
check('Guard module contains no stream-key or token persistence',()=>{assert.equal(/streamKey|stream_key|accessToken|refreshToken/.test(guardText),false)});

console.log(`\nStream Studio Soak Guard Pass 21.10.23: ${pass}/${pass+fail} PASS`);if(fail)process.exitCode=1;
