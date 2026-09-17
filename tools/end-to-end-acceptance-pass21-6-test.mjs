import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.argv[2] || '.');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const results = [];
const add = (name, ok, detail='') => results.push({name, ok:Boolean(ok), detail:String(detail || '')});
const has = (text, token) => String(text).includes(token);
const rx = (text, re) => re.test(text);
const routeBlock = (text, marker, span=9000) => {
  const i = text.indexOf(marker);
  return i < 0 ? '' : text.slice(i, i + span);
};

const requiredFiles = [
  'server.js',
  'public/pages/widget-studio.html',
  'public/pages/scene-studio.html',
  'public/pages/launcher.html',
  'public/pages/launcher-connect.html'
];
for (const file of requiredFiles) add(`${file} exists`, exists(file));

const server = read('server.js');
const widgetPage = read('public/pages/widget-studio.html');
const scenePage = read('public/pages/scene-studio.html');
const launcherPage = read('public/pages/launcher.html');
const launcherConnectPage = read('public/pages/launcher-connect.html');

// Widget lifecycle: creator scoped -> draft -> explicit publish -> public output.
for (const [label, marker] of [
  ['widget list', '"/api/creator/widget-studio/widgets"'],
  ['widget detail', '"/api/creator/widget-studio/widgets/:id"'],
  ['widget draft save', '"/api/creator/widget-studio/widgets/:id/draft"'],
  ['widget manual control', '"/api/creator/widget-studio/widgets/:id/control"'],
  ['widget publish', '"/api/creator/widget-studio/widgets/:id/publish"'],
  ['widget duplicate', '"/api/creator/widget-studio/widgets/:id/duplicate"']
]) {
  const block = routeBlock(server, marker);
  add(`${label} route exists`, Boolean(block));
  add(`${label} requires creator account`, has(block, 'requireCreatorAccount'));
}

const createWidget = routeBlock(server, 'app.post(\n    "/api/creator/widget-studio/widgets"');
add('new widgets start as draft', has(createWidget, "'draft'"));

const publishWidget = routeBlock(server, '"/api/creator/widget-studio/widgets/:id/publish"');
add('widget publish promotes draft config', has(publishWidget, 'published_config') && has(publishWidget, 'draft_config'));
add('widget publish marks widget live', has(publishWidget, "status = 'live'") || has(publishWidget, "status='live'"));
add('widget publish records publish time', has(publishWidget, 'published_at'));

const publicWidget = routeBlock(server, '"/api/widgets/studio/:publicToken"', 12000);
add('public widget endpoint exists', Boolean(publicWidget));
add('public widget output is no-store', has(publicWidget, 'Cache-Control", "no-store"') || has(publicWidget, 'Cache-Control","no-store"'));
add('public widget endpoint returns only published widgets', has(publicWidget, 'getPublicStudioWidget'));
add('public widget payload sanitizes published config', has(publicWidget, 'sanitizeStudioWidgetConfig(row.published_config'));
add('manual/static widgets detach from LIVE data', has(publicWidget, 'const detachedData = staticObs || manualOnly'));
add('detached widget payload reports no LIVE bridge', has(publicWidget, 'configured: false') && has(publicWidget, 'online: false'));

// Scene lifecycle: only published creator-owned sources may enter a live scene.
for (const [label, marker] of [
  ['scene list', '"/api/creator/widget-studio/scenes"'],
  ['scene save', '"/api/creator/widget-studio/scenes/:id"'],
  ['scene publish', '"/api/creator/widget-studio/scenes/:id/publish"']
]) {
  const block = routeBlock(server, marker);
  add(`${label} route exists`, Boolean(block));
  add(`${label} requires creator account`, has(block, 'requireCreatorAccount'));
}

const createScene = routeBlock(server, 'app.post(\n    "/api/creator/widget-studio/scenes"');
add('new scenes start as draft', has(createScene, "'draft'"));

const saveScene = routeBlock(server, 'app.put(\n    "/api/creator/widget-studio/scenes/:id"');
add('scene save validates creator ownership', has(saveScene, 'validateSceneOwnership'));
add('scene save rejects invalid/unpublished sources', has(saveScene, 'ungültige oder nicht veröffentlichte Widgets'));

const publishScene = routeBlock(server, '"/api/creator/widget-studio/scenes/:id/publish"');
add('scene publish requires at least one item', has(publishScene, 'Object.values(config.layouts') && has(publishScene, '.some(layout=>(layout?.items||[]).length)'));
add('scene publish validates source ownership', has(publishScene, 'validateSceneOwnership'));
add('scene publish requires published source widgets', has(publishScene, 'Vor Publish müssen alle Scene-Widgets veröffentlicht sein.'));
add('scene publish promotes draft config to live', has(publishScene, "status='live'") && has(publishScene, 'published_config=draft_config'));

const publicScene = routeBlock(server, '"/api/widgets/scene/:token"');
add('public scene endpoint exists', Boolean(publicScene));
add('public scene endpoint is rate limited', has(publicScene, 'studioPublicReadLimiter'));
add('public scene output is no-store', has(publicScene, 'Cache-Control","no-store"') || has(publicScene, 'Cache-Control", "no-store"'));
add('public scene hydrates server-side approved scene', has(publicScene, 'hydratePublicScene(row)'));

// Launcher / bridge: bridge token stays separate from creator browser session.
for (const [label, marker, span] of [
  ['bridge library', '"/api/bridge/widget-studio/library"', 11000],
  ['bridge widget control', '"/api/bridge/widget-studio/widgets/:id/control"', 9000],
  ['bridge scenes', '"/api/bridge/widget-studio/scenes"', 7000],
  ['bridge status', '"/api/bridge/widget-studio/status"', 7000],
  ['bridge heartbeat', '"/api/bridge/widget-studio/heartbeat"', 9000],
  ['bridge session start', '"/api/bridge/widget-studio/session/start"', 8000],
  ['bridge session end', '"/api/bridge/widget-studio/session/end"', 7000],
  ['bridge event ingest', '"/api/bridge/widget-studio/events"', 9000],
  ['bridge action fetch', '"/api/bridge/widget-studio/actions"', 9000],
  ['bridge action ack', '"/api/bridge/widget-studio/actions/ack"', 7000],
  ['bridge action nack', '"/api/bridge/widget-studio/actions/nack"', 7000]
]) {
  const block = routeBlock(server, marker, span);
  add(`${label} route exists`, Boolean(block));
  add(`${label} requires studio bridge auth`, has(block, 'requireStudioBridge'));
}

const bridgeLibrary = routeBlock(server, '"/api/bridge/widget-studio/library"', 11000);
add('bridge library exposes only live widgets', has(bridgeLibrary, 'widgets.filter(widget=>widget.status==="live")'));
add('bridge library exposes only published live scenes', has(bridgeLibrary, "status='live' AND published_config IS NOT NULL"));

const bridgeControl = routeBlock(server, '"/api/bridge/widget-studio/widgets/:id/control"', 10000);
add('bridge control only supports manual widget modes', has(bridgeControl, 'manual_counter') && has(bridgeControl, 'manual_timer'));
add('bridge control scopes widget lookup to bridge creator', has(bridgeControl, 'getStudioWidgetById(creatorId, req.params.id)'));
add('bridge control mirrors live manual state into published config', has(bridgeControl, 'current.status === "live"') && has(bridgeControl, 'published_config'));

const bridgeEvents = routeBlock(server, '"/api/bridge/widget-studio/events"', 10000);
add('bridge event ingest requires live-bridge entitlement', has(bridgeEvents, 'requireCreatorFeatureAccess(creatorId,"live_bridge","creator")'));
add('bridge event ingest enforces batch limit', has(bridgeEvents, 'WIDGET_BRIDGE_MAX_BATCH'));
add('bridge event ingest blocks session lifecycle events', has(bridgeEvents, '["live_start","live_end","reset"].includes(type)'));
add('bridge events are tagged launcher_bridge', has(bridgeEvents, '"launcher_bridge"'));

const bridgeLogout = routeBlock(server, '"/api/bridge/widget-studio/logout"', 5000);
add('bridge logout requires studio bridge auth', has(bridgeLogout, 'requireStudioBridge'));
add('bridge logout revokes current bridge', has(bridgeLogout, 'revokeCurrentStudioBridge'));

// UI contract: explicit publish and stable output hand-off.
add('Widget Studio keeps explicit publish action', has(widgetPage, 'VERÖFFENTLICHEN') || has(widgetPage, 'PUBLISH'));
add('Widget Studio loads shared widget renderer', has(widgetPage, '/assets/js/cfs-widget-renderer.js'));
add('Widget Studio loads studio runtime', has(widgetPage, '/assets/js/widget-studio.js'));
add('Scene Studio says only published widgets can be live', has(scenePage, 'Nur veröffentlichte Widgets können in einer Live-Scene verwendet werden.'));
add('Scene Studio keeps explicit publish action', has(scenePage, 'id="publishScene"'));
add('Scene Studio exposes readonly output URL', has(scenePage, 'id="sceneOutputUrl"') && has(scenePage, 'readonly'));
add('Scene Studio loads shared widget renderer', has(scenePage, '/assets/js/cfs-widget-renderer.js'));
add('Scene Studio loads scene runtime', has(scenePage, '/assets/js/scene-studio.js'));
add('Launcher links directly to Widget Studio', has(launcherPage, '/pages/widget-studio.html'));
add('Launcher exposes device-connect path', has(launcherPage, '/pages/launcher-connect.html'));
add('Device-connect page requires matching local code', has(launcherConnectPage, 'Der Code auf dieser Seite muss mit dem Code im Launcher übereinstimmen.'));

const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.detail ? ` · ${r.detail}` : ''}`);
console.log(`\nEnd-to-End Acceptance Pass 21.6: ${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exitCode = 1;
