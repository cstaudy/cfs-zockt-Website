import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const results=[];
const add=(name,ok)=>results.push({name,ok:Boolean(ok)});
const has=(text,token)=>String(text).includes(token);

for(const file of [
  'public/pages/stream-studio.html',
  'public/assets/js/stream-studio.js',
  'public/assets/css/stream-studio.css',
  'server.js',
  'package.json',
  'CFS_MASTER_CHECKLIST_PASS21.md'
]) add(`${file} exists`,exists(file));

const html=read('public/pages/stream-studio.html');
const js=read('public/assets/js/stream-studio.js');
const css=read('public/assets/css/stream-studio.css');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));

add('workspace toolbar exists',has(html,'id="toggleStudioLayout"')&&has(html,'id="resetStudioLayout"'));
add('layout action explains movable panels',has(html,'Panels so anordnen, wie du streamst.'));
for(const zone of ['left','center','right','bottom','wide']) add(`dock zone ${zone} exists`,has(html,`data-dock-zone="${zone}"`));
for(const item of ['scenes','monitors','scene_composer','transition','overlay_rack','sources','capture','audio','output','preflight','session','health','activity','multistream']) add(`dock item ${item} exists`,has(html,`data-dock-id="${item}"`));
add('transition panel is dockable',has(html,'data-dock-id="transition"')&&has(html,'id="streamTransition"')&&has(html,'id="streamDuration"'));
add('scene panel is dockable',has(html,'data-dock-id="scenes"')&&has(html,'id="streamSceneList"'));
add('audio mixer is dockable',has(html,'data-dock-id="audio"')&&has(html,'id="streamMixer"'));
add('multistream is dockable',has(html,'data-dock-id="multistream"')&&has(html,'id="multistreamTargets"'));

add('client defines fixed dock zone allowlist',has(js,'const DOCK_ZONES=["left","center","right","bottom","wide"]'));
add('client defines fixed dock item allowlist',has(js,'const DOCK_ITEMS=["scenes","monitors","scene_composer","transition","overlay_rack","sources","capture","audio","output","preflight","session","health","activity","multistream"]'));
add('client normalizes workspace layout',has(js,'function normalizeWorkspaceLayout'));
add('client removes duplicate panels',has(js,'seen.has(id)'));
add('client restores missing panels from defaults',has(js,'DEFAULT_WORKSPACE.zones[zone]'));
add('client installs dedicated drag handles',has(js,'function installDockHandles')&&has(js,"stream-dock-handle"));
add('dragging only starts in layout editing mode',has(js,'!state.layoutEditing')&&has(js,'state.layoutDragArmed!==item.dataset.dockId'));
add('drag start uses only dock item id',has(js,"setData('text/plain',state.layoutDragId)"));
add('drop captures sanitized workspace layout',has(js,'function captureWorkspaceLayout')&&has(js,'normalizeWorkspaceLayout({version:2,zones,sizes:state.config.workspace_layout?.sizes||{},columns:state.config.workspace_layout?.columns||{}})'));
add('drop schedules persistence',has(js,'scheduleWorkspaceSave()'));
add('reset restores standard workspace',has(js,'function resetWorkspaceLayout')&&has(js,'normalizeWorkspaceLayout(DEFAULT_WORKSPACE)'));
add('layout editing can be locked',has(js,"button.textContent=state.layoutEditing?'LAYOUT SPERREN':'LAYOUT ANPASSEN'"));
add('workspace layout is part of saved config',has(js,'base.workspace_layout=normalizeWorkspaceLayout(cfg.workspace_layout)'));
add('render re-applies saved workspace',has(js,'function renderWorkspaceLayout')&&has(js,'renderWorkspaceLayout();renderLauncher()'));
add('moving panels does not use eval',!has(js,'eval(')&&!has(js,'new Function('));

add('CSS exposes drag handle only in edit mode',has(css,'.stream-studio-page.layout-editing .stream-dock-handle'));
add('CSS highlights drop zones',has(css,'.stream-studio-page.layout-editing [data-dock-zone].dock-over'));
add('CSS supports empty drop zones',has(css,'PANEL HIER ABLEGEN'));
add('CSS compacts transition in side docks',has(css,'.stream-dock-side .stream-take-bar{grid-template-columns:1fr'));
add('CSS compacts output in side docks',has(css,'.stream-dock-side .stream-output-grid'));
add('CSS has responsive dock behavior',has(css,'@media(max-width:980px)')&&has(css,'.stream-dock-side>.stream-panel{position:static'));
add('reduced-motion transition rule remains',has(css,'@media(prefers-reduced-motion:reduce)'));

add('server defines dock zone allowlist',has(server,'const STREAM_STUDIO_DOCK_ZONES=["left","center","right","bottom","wide"]'));
add('server defines dock item allowlist',has(server,'const STREAM_STUDIO_DOCK_ITEMS=["scenes","monitors","scene_composer","transition","overlay_rack","sources","capture","audio","output","preflight","session","health","activity","multistream"]'));
add('server has workspace defaults',has(server,'function streamStudioWorkspaceDefaults()'));
add('server sanitizes workspace layout',has(server,'function sanitizeStreamStudioWorkspace(input={})'));
add('server ignores unknown dock ids',has(server,'if(!allowed.has(id)||seen.has(id))continue'));
add('server restores missing dock items',has(server,'for(const id of defaults.zones[zone])'));
add('server persists sanitized workspace only',has(server,'clean.workspace_layout=sanitizeStreamStudioWorkspace(source.workspace_layout)'));
add('server stream config version bumped',has(server,'version:3'));
add('workspace contains no arbitrary HTML field',!has(server,'workspace_layout.html')&&!has(server,'workspace_layout.css')&&!has(server,'workspace_layout.script'));

add('studio layout check script registered',pkg.scripts?.['studio-layout21:check']==='node tools/stream-studio-dock-layout-pass21-9-1-test.mjs .');
add('previous stream studio check remains registered',Boolean(pkg.scripts?.['stream21:check']));
add('previous multistream check remains registered',Boolean(pkg.scripts?.['multistream21:check']));

const failed=results.filter(r=>!r.ok);
for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}`);
console.log(`\nStream Studio Dock Layout Pass 21.9.1: ${results.length-failed.length}/${results.length} PASS`);
if(failed.length) process.exitCode=1;
