import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const exists=rel=>fs.existsSync(path.join(root,rel));
const results=[];
const check=(name,ok)=>{results.push({name,ok:Boolean(ok)});console.log(`${ok?'PASS':'FAIL'} ${name}`)};
const has=(text,token)=>String(text).includes(token);
const versionAtLeast=(actual,min)=>{
  const a=String(actual).split('.').map(Number),b=String(min).split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}
  return true;
};

for(const file of [
  'public/pages/stream-studio.html',
  'public/assets/css/stream-studio.css',
  'public/assets/js/stream-studio.js',
  'server.js','package.json','launcher/package.json',
  'public/assets/js/page-system-check.js','public/cfs-studio.webmanifest'
]) check(`${file} exists`,exists(file));

const html=read('public/pages/stream-studio.html');
const css=read('public/assets/css/stream-studio.css');
const js=read('public/assets/js/stream-studio.js');
const server=read('server.js');
const pkg=json('package.json');
const launcher=json('launcher/package.json');
const system=read('public/assets/js/page-system-check.js');
const manifest=json('public/cfs-studio.webmanifest');

check('backend >= 3.20.13',versionAtLeast(pkg.version,'3.20.13'));
check('launcher remains >= 0.47.30',versionAtLeast(launcher.version,'0.47.30'));
check('server backend remains >= 3.20.13',versionAtLeast((server.match(/const BACKEND_VERSION\s*=\s*\"(\d+\.\d+\.\d+)\"/)||[])[1],'3.20.13'));
check('system check backend remains >= 3.20.13',versionAtLeast((system.match(/backend:"(\d+\.\d+\.\d+)"/)||[])[1],'3.20.13'));
check('system check launcher remains 0.47.30',has(system,'launcher:"0.47.30"'));
check('schema remains 73',/schema:(?:7[3-9]|[89]\d|\d{3,})/.test(system));

check('CFS Studio keeps dedicated install manifest',has(html,'rel="manifest" href="/cfs-studio.webmanifest"'));
check('CFS Studio manifest starts at stream studio',String(manifest.start_url||'').includes('/pages/stream-studio.html'));
check('operator hero is compact',has(html,'stream-studio-hero-v168')&&has(html,'<h1>CFS <span>STUDIO.</span></h1>'));
check('launcher role is clear',has(html,'Der Launcher arbeitet im Hintergrund'));
check('OBS remains optional',has(html,'OBS bleibt optional'));
check('old marketing hub removed from markup',!has(html,'class="cfs-studio-hub"'));
check('old five-step marketing workflow removed from markup',!has(html,'class="stream-workflow-guide"'));

for(const label of ['SCENES & QUELLEN','PREVIEW & PROGRAM','AUDIO','STREAM-ZIELE','DIAGNOSE']){
  check(`operator nav ${label}`,has(html,`<strong>${label}</strong>`));
}
for(const anchor of ['href="#scene-composer"','href="#previewMonitor"','href="#studio-audio"','href="#stream-session"','href="#stream-live-operations"']){
  check(`operator anchor ${anchor}`,has(html,anchor));
}

check('layout tools are collapsed details',has(html,'<details class="stream-workspace-toolbar stream-workspace-tools" id="live-workspace">'));
check('layout customization remains available',has(html,'id="toggleStudioLayout"')&&has(html,'id="resetStudioLayout"')&&has(html,'id="studioWorkspacePreset"'));
check('operator heading describes three-column production',has(html,'Scenes links · Preview & Program in der Mitte · Stream-Ziele rechts'));
check('audio setup note retains local secret boundary',has(html,'Rohdaten und Stream-Credentials bleiben im Launcher'));

for(const id of ['previewMonitor','programMonitor','streamSceneList','streamSourceLibrary','activeOverlayRack','streamMixer','streamOutputProfile','streamDestination','streamEncoder','streamBitrate','takeScene','stream-preflight','stream-session','stream-activity','streamLiveGuard','multistreamTargets']){
  check(`core runtime id retained ${id}`,has(html,`id="${id}"`));
}

for(const [dock,title] of [['capture','CAPTURE'],['output','OUTPUT'],['health','DIAGNOSE'],['activity','COMMUNITY']]){
  const re=new RegExp(`<details[^>]*data-dock-id="${dock}"[^>]*>[\\s\\S]*?<summary class="stream-collapsible-summary"><span>${title}</span>`);
  check(`${dock} is a collapsible dock panel`,re.test(html));
}
check('collapsible technical docks are closed by default',!/<details[^>]*(?:data-dock-id="capture"|data-dock-id="output"|data-dock-id="health"|data-dock-id="activity")[^>]*\sopen(?:\s|>)/.test(html));
check('multistream security details are collapsed',has(html,'class="stream-inline-details multistream-details"')&&has(html,'PLATTFORM- & SICHERHEITSDETAILS'));
check('session technical note is collapsed',has(html,'<summary>TECHNISCHE TRENNUNG</summary>'));
check('secret policy remains explicit',has(html,'PostgreSQL speichert sie nicht')&&has(html,'Windows SafeStorage'));
check('no stream key input added to studio',!has(html,'name="stream_key"')&&!has(html,'id="streamKey"'));

const clientDefault='left:["scenes","sources"],center:["monitors","scene_composer","transition","overlay_rack"],right:["session",';
const serverDefault='left:["scenes","sources"]';
check('client workspace schema v3',has(js,'const DEFAULT_WORKSPACE={version:3')&&has(js,clientDefault));
check('server workspace schema v3',has(server,'version:3')&&has(server,serverDefault)&&has(server,'right:["session",')&&has(server,'"preflight","multistream"]')&&has(server,'wide:["activity","health"]'));
check('client default columns favor operator rails',has(js,'columns:{left_px:280,right_px:340}'));
check('server default columns favor operator rails',has(server,'columns:{left_px:280,right_px:340}'));
check('legacy v2 client migration exists',has(js,'LEGACY_WORKSPACE_V2')&&has(js,'function migrateWorkspaceLayout'));
check('legacy migration preserves custom columns',has(js,'legacyColumns')&&has(js,'Number(columns.left_px)===250')&&has(js,'Number(columns.right_px)===310'));
check('server mirrors legacy migration',has(server,'function streamStudioWorkspaceLooksLegacyDefault')&&has(server,'legacyColumns'));
check('workspace capture persists version 3',has(js,'normalizeWorkspaceLayout({version:3,zones'));
check('layout edit opens collapsed panels',has(js,"panel.dataset.layoutWasOpen=panel.open?'1':'0';panel.open=true"));
check('layout edit restores collapsed panels',has(js,"if(panel.dataset.layoutWasOpen==='0')panel.open=false"));
check('hash navigation reveals collapsed panel',has(js,'function revealStudioHash')&&has(js,'if(details)details.open=true'));
check('hash navigation is bound',has(js,'addEventListener("hashchange",revealStudioHash)'));

check('operator nav CSS exists',has(css,'.stream-operator-nav{'));
check('operator hero CSS exists',has(css,'.stream-studio-hero-v168'));
check('left and right rails are sticky',has(css,'.stream-dock-zone[data-dock-zone="left"],.stream-dock-zone[data-dock-zone="right"]{position:sticky'));
check('side session summary is compact',has(css,'.stream-dock-side .stream-session-summary{grid-template-columns:1fr 1fr}'));
check('secondary session metrics hide only in side rail',has(css,'.stream-dock-side .stream-session-summary>div:nth-child(6)'));
check('bottom layout prioritizes audio',has(css,'.stream-bottom-grid{grid-template-columns:minmax(420px,1.7fr)'));
check('collapsible panel CSS exists',has(css,'.stream-collapsible-panel{padding:0;overflow:hidden}'));
check('diagnostic wide dock is two columns',has(css,'.stream-wide-dock{grid-template-columns:1fr 1fr'));
check('mobile rails become static',has(css,'@media(max-width:980px)')&&has(css,'position:static;max-height:none;overflow:visible'));
check('mobile operator nav remains compact',has(css,'@media(max-width:620px)')&&has(css,'.stream-operator-nav{grid-template-columns:1fr 1fr'));

for(const doc of ['TECHNIK-v168.md','CREATOR-SUITE-COMPLETION-v168.md','SECURITY-BASELINE-v168.md','CFS-STUDIO-OPERATOR-v168.md','handoff/HANDOFF-v168.md','handoff/CURRENT-HANDOFF.md']){
  check(`v168 doc present ${doc}`,exists(doc));
}
check('v168 history remains in versioned documentation',has(read('CFS-STUDIO-OPERATOR-v168.md'),'v168')&&versionAtLeast(pkg.version,'3.20.13'));
const installReleaseMatch=read('INSTALLIEREN.txt').match(/npm run release:v(\d+)/);
check('install guide keeps v168 history or newer release',Number(installReleaseMatch?.[1]||0)>=168);

check('v168 check registered',pkg.scripts?.['studio-operator168:check']==='node tools/cfs-studio-operator-v168-test.mjs .');
check('v168 release chains v167',pkg.scripts?.['release:v168']==='npm run release:v167 && npm run studio-operator168:check');

const failed=results.filter(x=>!x.ok);
console.log(`\nCFS Studio Operator v168: ${results.length-failed.length}/${results.length} ${failed.length?'FAIL':'PASS'}`);
if(failed.length)process.exit(1);
