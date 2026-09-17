import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('public/pages/stream-studio.html');
const js=read('public/assets/js/stream-studio.js');
const css=read('public/assets/css/stream-studio.css');
const server=read('server.js');
const cut=read('public/pages/cut-studio.html');
const audio=read('public/pages/audio-studio.html');
const launcher=read('public/pages/launcher.html');
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
const pkg=JSON.parse(read('package.json'));
const checks=[];const add=(name,ok)=>checks.push({name,ok:Boolean(ok)});const has=(text,token)=>text.includes(token);

add('studio hub exists',has(html,'class="cfs-studio-hub"'));
add('studio hub states unified UX and modular engines',has(html,'Eine Oberfläche · getrennte Engines.'));
add('live workspace link exists',has(html,'href="#live-workspace"'));
add('audio workspace link exists',has(html,'href="#studio-audio"'));
add('cut workspace link exists',has(html,'href="/pages/cut-studio.html"'));
add('launcher workspace link exists',has(html,'href="/pages/launcher.html"'));
add('widget workspace link exists',has(html,'href="/pages/widget-studio.html"'));
add('live workspace anchor exists',has(html,'id="live-workspace"'));
add('audio mixer anchor exists',has(html,'id="studio-audio"'));
add('audio mixer links to advanced audio page',has(html,'href="/pages/audio-studio.html">AUDIO STUDIO</a>'));
add('cut page links back to CFS Studio',has(cut,'href="/pages/stream-studio.html">ZUM CFS STUDIO</a>'));
add('audio page links back to live mixer',has(audio,'href="/pages/stream-studio.html#studio-audio">ZUM LIVE MIXER</a>'));
add('launcher page links back to CFS Studio',has(launcher,'href="/pages/stream-studio.html">ZUM CFS STUDIO</a>'));

add('session dashboard exists',has(html,'data-dock-id="session"')&&has(html,'id="stream-session"'));
add('session dashboard exposes status',has(html,'id="streamSessionStatus"'));
add('session dashboard exposes elapsed time',has(html,'id="streamSessionElapsed"'));
add('session dashboard exposes start time',has(html,'id="streamSessionStarted"'));
add('session dashboard exposes target count',has(html,'id="streamSessionTargets"'));
add('session dashboard exposes upload',has(html,'id="streamSessionUpload"'));
add('session dashboard exposes reconnects',has(html,'id="streamSessionReconnects"'));
add('data estimate is explicitly scoped to current studio visit',has(html,'seit diesem Studio-Aufruf geschätzt'));
add('session dashboard routes control to launcher',has(html,'LAUNCHER STEUERN'));
add('session note explains modular runtime isolation',has(html,'LIVE-Produktion, Cut-Export und lokale Launcher-Engine bleiben getrennte Laufzeitbereiche'));

add('client dock allowlist contains session',has(js,'"output","preflight","session","health"'));
add('server dock allowlist contains session',has(server,'"output","preflight","session","health"'));
add('default wide dock contains session first',has(js,'wide:["preflight","session","health","activity","multistream"]')&&has(server,'wide:["preflight","session","health","activity","multistream"]'));
add('session bytes are browser-only state',has(js,'sessionTransferredBytes:0'));
add('session transfer estimate uses measured upload',has(js,'state.sessionLastUploadKbps*1000/8'));
add('session estimate bounds one sample gap',has(js,'Math.min(15,(now-state.sessionLastSampleAt)/1000)'));
add('session start derives from runtime timestamps',has(js,'function streamSessionStartedAt'));
add('session clock renders every second',has(js,'function scheduleStreamSessionClock')&&has(js,'},1000)'));
add('runtime poll accumulates session estimate',has(js,'accumulateSessionTransfer(state.runtime)'));
add('runtime poll renders session dashboard',has(js,'renderStreamSession();renderStreamHealth()'));
add('session target rendering uses textContent',has(js,'title.textContent=target.label||runtimeProviderLabel(target.provider)'));
add('session rendering has no innerHTML assignment',!js.slice(js.indexOf('function renderStreamSession'),js.indexOf('function scheduleStreamSessionClock')).includes('innerHTML'));
add('session rendering does not mutate backend',!js.slice(js.indexOf('function renderStreamSession'),js.indexOf('function scheduleStreamSessionClock')).includes('CFS.json('));
add('no stream key field in session dashboard',!has(html,'streamSessionKey')&&!has(js,'streamSessionKey'));
add('no RTMP url field in session dashboard',!has(html,'streamSessionRtmp')&&!has(js,'streamSessionRtmp'));

add('studio hub CSS exists',has(css,'.cfs-studio-hub'));
add('session dashboard CSS exists',has(css,'.stream-session-rack'));
add('session dashboard responsive CSS exists',has(css,'@media(max-width:700px)')&&has(css,'.stream-session-summary'));
add('hub horizontal nav responsive CSS exists',has(css,'.cfs-studio-hub-nav'));

add('dedicated npm check exists',pkg.scripts?.['studio-hub21:check']==='node tools/stream-studio-hub-session-pass21-10-10-test.mjs .');
add('aggregate studio check includes hub check',pkg.scripts?.['stream-studio21:check']?.includes('studio-hub21:check'));
add('master checklist version updated',/\*\*Aktueller Entwicklungsstand:\*\* Pass 21\.10\.(?:1[0-9]|[2-9][0-9])/.test(checklist));
add('master checklist documents architecture rule',has(checklist,'Zusammen in der Bedienung, getrennt in den Laufzeit-Engines.'));
add('master checklist documents session dashboard',has(checklist,'Stream Session Dashboard'));

const passed=checks.filter(row=>row.ok).length;
for(const row of checks)console.log(`${row.ok?'PASS':'FAIL'}  ${row.name}`);
console.log(`\nCFS Studio Hub & Session Dashboard Pass 21.10.10: ${passed}/${checks.length} PASS`);
if(passed!==checks.length)process.exit(1);
