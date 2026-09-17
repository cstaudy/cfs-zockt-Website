import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('public/assets/js/stream-studio.js');
const html = read('public/pages/stream-studio.html');
const css = read('public/assets/css/stream-studio.css');
const pkg = JSON.parse(read('package.json'));
const checklist = read('CFS_MASTER_CHECKLIST_PASS21.md');

const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

check('health sample history exists', js.includes('liveHealthSamples:[]'));
check('samples are bounded to two minutes', js.includes('Date.now()-120000'));
check('sample list is bounded', js.includes('.slice(-30)'));
check('sample captures dropped frames', js.includes('dropped:Number(metrics.dropped_frames||0)'));
check('sample captures reconnects', js.includes('reconnects:Number(metrics.reconnects||0)'));
check('sample captures watchdog restarts', js.includes('watchdog:Number(metrics.watchdog_restarts||0)'));
check('sample captures encoder speed', js.includes('speed:Number(metrics.encoder_speed||0)'));
check('sample captures per-target bitrate', js.includes('bitrate:Number(target.metrics?.bitrate_kbps||0)'));
check('one-minute trend delta exists', js.includes("liveHealthDelta('dropped',60000)"));
check('encoder critical threshold exists', js.includes('speed<0.90'));
check('encoder warning threshold exists', js.includes('speed<0.98'));
check('drop critical threshold exists', js.includes('dropDelta>=10'));
check('drop warning threshold exists', js.includes('dropDelta>=2'));
check('reconnect critical threshold exists', js.includes('reconnectDelta>=2'));
check('watchdog diagnosis exists', js.includes("liveHealthDelta('watchdog',60000)"));
check('target error isolation diagnosis exists', js.includes("status==='error'"));
check('target reconnect diagnosis exists', js.includes("status==='reconnecting'"));
check('bitrate critical ratio exists', js.includes('ratio<0.65'));
check('bitrate warning ratio exists', js.includes('ratio<0.82'));
check('fps critical ratio exists', js.includes('ratio<0.75'));
check('fps warning ratio exists', js.includes('ratio<0.9'));
check('profile-aware expected FPS exists', js.includes('expectedFpsForProfile'));
check('guard renders through textContent', js.includes('title.textContent=guard.title') && js.includes('span.textContent=issue.text'));
check('guard keeps issue list bounded', js.includes('guard.issues.slice(0,8)'));
check('runtime polling pushes samples', js.includes('pushLiveHealthSample(state.runtime)'));
check('health render includes live guard', js.includes('renderLiveGuard();'));
check('live guard panel exists', html.includes('id="streamLiveGuard"'));
check('live guard title exists', html.includes('id="streamLiveGuardTitle"'));
check('live guard badge exists', html.includes('id="streamLiveGuardBadge"'));
check('live guard issue list exists', html.includes('id="streamLiveGuardList"'));
check('advisory-only message exists', html.includes('DIAGNOSE STATT AUTOPILOT'));
check('no automatic setting-change promise', html.includes('niemals ohne deine Aktion geändert'));
check('ok severity styling exists', css.includes('[data-severity="ok"]'));
check('warning severity styling exists', css.includes('[data-severity="warning"]'));
check('danger severity styling exists', css.includes('[data-severity="danger"]'));
check('mobile live-guard layout exists', css.includes('@media(max-width:700px){.stream-live-guard li'));
check('dedicated npm check exists', pkg.scripts?.['stream-guard21:check']?.includes('stream-studio-live-guard-pass21-10-9-test.mjs'));
check('aggregate studio check includes guard', pkg.scripts?.['stream-studio21:check']?.includes('stream-guard21:check'));
check('master checklist references pass 21.10.9', checklist.includes('Pass 21.10.9'));

const guardBlock = js.slice(js.indexOf('function buildLiveGuard'), js.indexOf('function renderStreamHealth'));
check('diagnostics do not call backend mutation', guardBlock && !guardBlock.includes('CFS.json('));
check('diagnostics do not call save', guardBlock && !/\bsave\s*\(/.test(guardBlock));
check('diagnostics do not start or stop targets', guardBlock && !/startDestination|stopDestination|startTarget|stopTarget/.test(guardBlock));

let passed = 0;
for (const row of checks) {
  if (row.ok) { passed++; console.log(`PASS  ${row.name}`); }
  else console.error(`FAIL  ${row.name}`);
}
console.log(`\nStream Studio Live Guard Pass 21.10.9: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
