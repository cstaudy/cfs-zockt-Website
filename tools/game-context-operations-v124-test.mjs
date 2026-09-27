import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const storeSrc=read('launcher/src/recording-handoff-store.js');
const main=read('launcher/main.js');
const cutLib=read('lib/creator-cut-studio.js');
const supportSrc=read('launcher/src/support-bundle.js');
const dashboard=read('public/pages/dashboard.html');
const dashboardJs=read('public/assets/js/page-dashboard.js');
const styles=read('public/assets/css/styles.css');
const pkg=JSON.parse(read('launcher/package.json'));

check('launcher advanced to 0.47.7',pkg.version==='0.47.7');
check('recording handoff schema advanced to v4',storeSrc.includes('schema:4')&&storeSrc.includes('v124-recording-context-integrity'));
check('recording context fingerprint uses cfsgc sha prefix',storeSrc.includes('function gameContextFingerprint')&&storeSrc.includes('`cfsgc_${crypto.createHash("sha256")'));
check('launcher forwards immutable context id into CUT payload',main.includes('context_id:String(captured.context_id||"")'));
check('CUT sanitizer accepts only valid context ids',cutLib.includes('context_id:/^cfsgc_[a-f0-9]{32}$/'));
check('support bundle accepts game activity and recording handoffs',supportSrc.includes('gameActivity,')&&supportSrc.includes('recordingHandoffs,'));
check('support bundle writes separate sanitized game activity file',supportSrc.includes('"game-activity.json"')&&supportSrc.includes('localPathsIncluded:false'));
check('support bundle writes recording handoff summary without raw media',supportSrc.includes('"recording-handoffs.json"')&&supportSrc.includes('rawMediaIncluded:false'));
check('dashboard has dedicated game context card',dashboard.includes('id="dashboardPlayingCard"')&&dashboard.includes('SPIELKONTEXT'));
check('dashboard renders active and recent unified context',dashboardJs.includes('gameContext.mode === "active"')&&dashboardJs.includes('gameContext.mode === "recent"'));
check('dashboard operation grid handles added card responsively',styles.includes('grid-template-columns:repeat(auto-fit,minmax(210px,1fr))'));

const {normalizeGameContext,gameContextFingerprint}=require(path.join(root,'launcher/src/recording-handoff-store.js'));
const fixed={mode:'active',game_name:'Call of Duty: Warzone',platform:'playstation_5',source:'launcher_manual',started_at:'2026-09-27T00:00:00.000Z',presence_id:'cfsgp_'+'a'.repeat(32),resumed_after_restart:true,captured_at:'2026-09-27T01:00:00.000Z',local_path:'C:/secret',process_name:'secret.exe'};
const one=normalizeGameContext(fixed),two=normalizeGameContext(fixed);
check('context fingerprint is deterministic',one.context_id===two.context_id&&/^cfsgc_[a-f0-9]{32}$/.test(one.context_id));
check('context fingerprint helper matches normalized snapshot',gameContextFingerprint(one)===one.context_id);
check('recording context drops arbitrary local/process fields',!('local_path' in one)&&!('process_name' in one));

const {createSupportBundle}=require(path.join(root,'launcher/src/support-bundle.js'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-v124-'));
const bundle=createSupportBundle({directory:tmp,appVersion:'0.47.7',settings:{backendUrl:'https://example.invalid'},diagnostics:{ok:true},fieldTest:{ok:true},releaseGate:{},interactiveGames:{available:true},gameActivity:{enabled:true,source:'launcher_manual',platform:'playstation_5',active:{game_name:'Warzone',source:'launcher_manual',platform:'playstation_5',started_at:'2026-09-27T00:00:00.000Z',last_seen_at:'2026-09-27T00:01:00.000Z'},pending:2,last_error:'',next_retry_at:null},recordingHandoffs:{schema:4,pending:1,ready:0,items:[{id:'rec_test',status:'pending',filePath:'C:/secret/video.mkv',durationMs:60000,profile:'1080p60',format:'mkv',sceneName:'Gameplay',projectId:'',gameContext:one}]},logText:'ok'});
const ga=JSON.parse(fs.readFileSync(path.join(bundle.folder,'game-activity.json'),'utf8'));
const rh=JSON.parse(fs.readFileSync(path.join(bundle.folder,'recording-handoffs.json'),'utf8'));
check('support bundle runtime writes both new files',bundle.files.includes('game-activity.json')&&bundle.files.includes('recording-handoffs.json'));
check('game activity support report remains sanitized',ga.localPathsIncluded===false&&ga.secretsIncluded===false&&ga.active?.game_name==='Warzone');
check('recording support report keeps context id but no file path',rh.items?.[0]?.game_context?.context_id===one.context_id&&!JSON.stringify(rh).includes('C:/secret'));
check('recording support report explicitly excludes raw media',rh.rawMediaIncluded===false&&rh.localPathsIncluded===false);
fs.rmSync(tmp,{recursive:true,force:true});

const failed=checks.filter(x=>!x.ok);
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Game Context Operations v124 checks passed.`);
if(failed.length)process.exit(1);
