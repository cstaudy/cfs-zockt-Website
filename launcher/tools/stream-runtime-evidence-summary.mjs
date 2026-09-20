import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {evaluateSoakGuard,GUARD_PASS}=require('../src/stream-soak-guard.js');

const args=process.argv.slice(2);
const value=name=>{const i=args.indexOf(name);return i>=0?String(args[i+1]||''):''};
const has=name=>args.includes(name);
const file=value('--file')||args.find(x=>!x.startsWith('--'))||'';
if(!file){console.error('Usage: node tools/stream-runtime-evidence-summary.mjs --file <evidence.json> [--strict]');process.exit(2)}
const full=path.resolve(file);let data;try{data=JSON.parse(fs.readFileSync(full,'utf8'))}catch(error){console.error(`Evidence konnte nicht gelesen werden: ${error.message}`);process.exit(2)}
if(data?.kind!=='stream_runtime_soak_evidence'||data?.pass!=='21.10.22'){console.error('Datei ist keine CFS Stream Runtime Evidence aus Pass 21.10.22.');process.exit(2)}
const s=data.summary||{},guard=data.guard||s.guard||evaluateSoakGuard(s,data.meta||{}),minutes=Number(s.durationMs||0)/60000;
console.log('CFS Stream Runtime Evidence');
console.log(`Session: ${data.id||'–'}`);
console.log(`Dauer: ${minutes.toFixed(1)} min · Samples: ${Number(s.samples||0)}`);
console.log(`Ziele: ${Number(s.targetIds?.length||0)}/${Number(s.expectedTargets||0)} · Recording: ${s.recording?.observed?'beobachtet':(s.recordingExpected?'FEHLT':'nicht erwartet')}`);
console.log(`Upload Peak: ${Number(s.maxUploadKbps||0)} kbit/s · Encoder Min: ${Number(s.minEncoderSpeed||0).toFixed(2)}x · FPS Ø: ${Number(s.averageFps||0).toFixed(1)}`);
console.log(`Dropped: ${Number(s.maxDroppedFrames||0)} · Reconnects: ${Number(s.reconnects||0)} · Watchdog: ${Number(s.watchdogRestarts||0)} · Errors: ${Number(s.errors||0)}`);
console.log(`Scenes: ${Number(s.sceneSwitches||0)} Switches · ${Number(s.sceneSwitchFailures||0)} Fehler · ${Number(s.sceneTransitions||0)} Transitions · ${Number(s.sceneTransitionFallbacks||0)} Fallbacks`);
console.log(`Game Recovery: ${Number(s.gameCapture?.helperRestarts||0)} Helper · ${Number(s.gameCapture?.frameStalls||0)} Stall · ${Number(s.gameCapture?.deviceLossRestarts||0)} D3D · ${Number(s.gameCapture?.windowRebinds||0)} Window-Rebind`);
console.log(`Audio Recovery: ${Number(s.applicationAudio?.recoveries||0)} Recovery · ${Number(s.applicationAudio?.helperRestarts||0)} Helper · ${Number(s.applicationAudio?.processRebinds||0)} Process-Rebind`);

console.log(`\nSOAK GUARD · PASS ${guard?.pass||GUARD_PASS}`);
console.log(`Technischer Status: ${guard?.status||'–'} · Acceptance-Coverage: ${guard?.acceptanceStatus||'–'} · Auto-Acceptance: NEIN`);
const counts=guard?.counts||{};
console.log(`Checks: PASS ${Number(counts.PASS||0)} · WARN ${Number(counts.WARN||0)} · FAIL ${Number(counts.FAIL||0)} · INCOMPLETE ${Number(counts.INCOMPLETE||0)}`);
const scenario=guard?.scenarioCoverage||{};
console.log(`Pflichtszenarien: ${Number(scenario.observed||0)}/${Number(scenario.required||0)} beobachtet${Array.isArray(scenario.missing)&&scenario.missing.length?` · offen: ${scenario.missing.join(', ')}`:''}`);
const issues=Array.isArray(guard?.checks)?guard.checks.filter(row=>row.status!=='PASS'):[];
if(issues.length){console.log('\nGuard-Hinweise:');for(const row of issues)console.log(`- [${row.status}] ${row.label}: ${row.detail}`)}else console.log('\nKeine Guard-Hinweise.');

const warnings=Array.isArray(s.warnings)?s.warnings:[];
if(warnings.length){console.log('\nEvidence-Hinweise:');for(const w of warnings)console.log(`- ${w}`)}
console.log('\nWichtig: Der Soak Guard bewertet technische Evidence automatisch, ist aber noch keine reale Plattform-Abnahme. Eine echte Windows-/Provider-Abnahme bleibt eine separate menschliche Freigabe.');
console.log(`Raw media persisted: ${data.rawMediaPersisted===true?'YES':'NO'} · Secrets persisted: ${data.secretsPersisted===true?'YES':'NO'}`);

if(has('--strict')){
  if(guard?.status==='FAIL'||guard?.acceptanceStatus==='FAIL')process.exitCode=2;
  else if(guard?.status!=='PASS'||guard?.acceptanceStatus!=='PASS')process.exitCode=1;
}
