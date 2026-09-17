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

add('workspace text explains resizing',has(html,'am Eckgriff in der Größe ändern'));
add('preview/program is dockable',has(html,'data-dock-id="monitors"')&&has(html,'data-dock-title="Preview & Program"'));
add('stream check is dockable',has(html,'data-dock-id="preflight"')&&has(html,'data-dock-title="Stream Check"'));
add('transition remains dockable',has(html,'data-dock-id="transition"')&&has(html,'id="streamTransition"'));

add('client workspace v2 exists',has(js,'const DEFAULT_WORKSPACE={version:2'));
add('client allowlist includes monitors',has(js,'"monitors","scene_composer"'));
add('client allowlist includes preflight',has(js,'"output","preflight","session"'));
add('client workspace has sizes map',has(js,'sizes:{},columns:{left_px:250,right_px:310}'));
add('client clamps panel width',has(js,'clampWorkspaceNumber(width,220,1600'));
add('client clamps panel height',has(js,'clampWorkspaceNumber(height,80,1400'));
add('client clamps left column',has(js,'columns.left_px,190,520,250'));
add('client clamps right column',has(js,'columns.right_px,220,620,310'));
add('client creates resize handle',has(js,'stream-dock-resize-handle'));
add('client supports pointer resize',has(js,'function beginPanelResize')&&has(js,'function movePanelResize')&&has(js,'function endPanelResize'));
add('client supports keyboard resize',has(js,'function resizePanelByKeyboard'));
add('client supports panel size reset',has(js,'function resetPanelSize'));
add('double click resets panel size',has(js,"resize.addEventListener('dblclick'"));
add('client creates side column handles',has(js,'function installZoneResizeHandles'));
add('client supports side column resizing',has(js,'function beginZoneResize')&&has(js,'function moveZoneResize')&&has(js,'function endZoneResize'));
add('client persists sizes during layout capture',has(js,'sizes:state.config.workspace_layout?.sizes||{}'));
add('client persists columns during layout capture',has(js,'columns:state.config.workspace_layout?.columns||{}'));
add('reset resets sizes and columns through defaults',has(js,'Standardlayout, Panelgrößen und Seitenbreiten wiederhergestellt.'));
add('drag blocked during resize',has(js,'state.layoutResize||state.zoneResize'));
add('global pointer move drives resize',has(js,'movePanelResize(event);moveZoneResize(event)'));
add('pointer cancel safely ends resize',has(js,'addEventListener("pointercancel"'));

add('CSS uses persisted left column variable',has(css,'--cfs-left-column'));
add('CSS uses persisted right column variable',has(css,'--cfs-right-column'));
add('CSS supports custom panel width',has(css,'--cfs-panel-width'));
add('CSS supports custom panel height',has(css,'--cfs-panel-height'));
add('CSS shows resize handle only in edit mode',has(css,'.stream-studio-page.layout-editing .stream-dock-resize-handle'));
add('CSS has side column resize handle',has(css,'.stream-zone-resize'));
add('CSS hides resize controls on mobile',has(css,'.stream-dock-resize-handle{display:none!important}'));
add('CSS forces auto mobile panel size',has(css,'height:auto!important'));
add('side dock stacks preview and program',has(css,'.stream-dock-side .stream-monitors{grid-template-columns:1fr}'));

add('server allowlist includes monitors',has(server,'"scenes","monitors","scene_composer"'));
add('server allowlist includes preflight',has(server,'"output","preflight","session"'));
add('server workspace defaults v2',has(server,'version:2')&&has(server,'sizes:{}')&&has(server,'columns:{left_px:250,right_px:310}'));
add('server sanitizes sizes object',has(server,'const sizes=source.sizes'));
add('server accepts only known dock ids for sizes',has(server,'for(const id of STREAM_STUDIO_DOCK_ITEMS)'));
add('server clamps persisted width',has(server,'clampNumber(value.width_px,220,1600,220)'));
add('server clamps persisted height',has(server,'clampNumber(value.height_px,80,1400,80)'));
add('server clamps left column width',has(server,'clampNumber(columns.left_px,190,520,250)'));
add('server clamps right column width',has(server,'clampNumber(columns.right_px,220,620,310)'));
add('server still rejects unknown dock ids',has(server,'if(!allowed.has(id)||seen.has(id))continue'));
add('server stores no arbitrary dock HTML',!has(server,'workspace_layout.html')&&!has(server,'workspace_layout.style')&&!has(server,'workspace_layout.script'));

add('new workspace check script registered',pkg.scripts?.['studio-resize21:check']==='node tools/stream-studio-resizable-workspace-pass21-10-11-test.mjs .');
add('aggregate studio check includes resize pass',String(pkg.scripts?.['stream-studio21:check']||'').includes('studio-resize21:check'));
add('previous dock layout check remains',Boolean(pkg.scripts?.['studio-layout21:check']));
add('scene composer check remains',Boolean(pkg.scripts?.['scene-composer21:check']));
add('live health check remains',Boolean(pkg.scripts?.['stream-health21:check']));

const failed=results.filter(item=>!item.ok);
for(const item of results) console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\nResizable Workspace Pass 21.10.11: ${results.length-failed.length}/${results.length} PASS`);
if(failed.length) process.exitCode=1;
