import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.argv[2] || '.');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

const results = [];
const add = (name, ok, detail='') => results.push({name, ok:Boolean(ok), detail:String(detail || '')});
const has = (text, token) => String(text).includes(token);
const regex = (text, re) => re.test(text);
const sliceBetween = (text, start, end, from = 0) => {
  const a = text.indexOf(start, from);
  if (a < 0) return '';
  const b = end ? text.indexOf(end, a + start.length) : -1;
  return text.slice(a, b >= 0 ? b : undefined);
};

for (const file of [
  'server.js',
  'public/assets/js/app.js',
  'public/assets/js/page-tiktok.js',
  'public/assets/js/widget-studio.js',
  'public/assets/js/launcher.js',
  'public/assets/js/launcher-connect.js',
  'public/pages/tiktok.html',
  'public/pages/widget-studio.html',
  'public/pages/launcher.html',
  'public/pages/launcher-connect.html'
]) add(`${file} exists`, exists(file));

const server = read('server.js');
const app = read('public/assets/js/app.js');
const tiktokJs = read('public/assets/js/page-tiktok.js');
const widgetJs = read('public/assets/js/widget-studio.js');
const launcherJs = read('public/assets/js/launcher.js');
const launcherConnectJs = read('public/assets/js/launcher-connect.js');
const tiktokPage = read('public/pages/tiktok.html');
const widgetPage = read('public/pages/widget-studio.html');
const launcherPage = read('public/pages/launcher.html');
const launcherConnectPage = read('public/pages/launcher-connect.html');

// TikTok creator isolation and OAuth state handling.
add('creator TikTok status requires account', regex(server, /"\/api\/creator\/tiktok\/status"[\s\S]{0,180}requireCreatorAccount/));
add('creator TikTok OAuth entry requires account', regex(server, /"\/auth\/creator\/tiktok"[\s\S]{0,180}requireCreatorAccount/));
add('creator TikTok sync requires account', regex(server, /"\/api\/creator\/tiktok\/sync"[\s\S]{0,180}requireCreatorAccount/));
add('creator TikTok disconnect requires account', regex(server, /"\/api\/creator\/tiktok\/disconnect"[\s\S]{0,180}requireCreatorAccount/));
add('legacy TikTok start uses trusted public write guard', regex(server, /"\/auth\/tiktok\/start"[\s\S]{0,220}requireTrustedPublicWrite/));
add('OAuth state is stored hashed with expiry', has(server, 'INSERT INTO tiktok_oauth_states') && has(server, 'state_hash') && has(server, "INTERVAL '10 minutes'"));
add('OAuth callback compares state cookie in constant-time helper', has(server, 'safeEqualText(\n                    state,\n                    cookieState') || regex(server, /safeEqualText\(\s*state,\s*cookieState\s*\)/));
add('OAuth callback consumes state exactly once', has(server, 'DELETE FROM tiktok_oauth_states') && has(server, 'RETURNING\n                        creator_id'));
add('OAuth state cookie is HttpOnly and production-secure', regex(server, /TIKTOK_STATE_COOKIE[\s\S]{0,500}httpOnly:\s*true[\s\S]{0,200}secure:\s*NODE_ENV\s*!==\s*"development"/));
add('OAuth state cookie is scoped to TikTok auth path', regex(server, /TIKTOK_STATE_COOKIE[\s\S]{0,700}sameSite:\s*"lax"[\s\S]{0,220}path:\s*"\/auth\/tiktok"/));

const publicTikTokFn = sliceBetween(server, 'function publicTikTokConnection', 'app.get(\n    "/api/creator/tiktok/status"');
add('public TikTok connection payload omits access token', !has(publicTikTokFn, 'access_token'));
add('public TikTok connection payload omits refresh token', !has(publicTikTokFn, 'refresh_token'));
add('TikTok page uses creator-scoped status API', has(tiktokJs, "'/api/creator/tiktok/status'"));
add('TikTok page uses creator-scoped sync API', has(tiktokJs, "'/api/creator/tiktok/sync'"));
add('TikTok page uses creator-scoped disconnect API', has(tiktokJs, "'/api/creator/tiktok/disconnect'"));
add('TikTok connect button uses creator OAuth entry', has(tiktokPage, 'href="/auth/creator/tiktok"'));
add('TikTok page requires authenticated creator', has(tiktokJs, 'CFS.requireAuth()'));

// Browser write integrity.
add('creator APIs are covered by browser-write origin and CSRF middleware', has(server, 'req.path.startsWith("/api/creator/")') && has(server, 'browserWriteSourceAllowed(req, res)') && has(server, 'requireCreatorCsrf(req, res, next)'));
add('client sends CSRF header on same-origin writes', has(app, 'headers.set("X-CSRF-Token", csrf)') && has(app, 'target.origin === location.origin'));
add('client fetches use same-origin credentials', has(app, 'credentials: "same-origin"'));

// Widget Studio: manual path stays independent of TikTok and never auto-publishes.
add('Widget Studio states manual widgets work without TikTok', has(widgetPage, 'Manuelle Widgets funktionieren auch ohne TikTok'));
for (const kind of ['goal','counter','timer','chat','camera']) {
  add(`Widget Studio quick start includes ${kind}`, has(widgetPage, `data-quick-create="${kind}"`));
}
add('quick-start copy says nothing is auto-published', has(widgetPage, 'Es wird nichts automatisch veröffentlicht.'));
add('widget creation uses creator-scoped API', has(widgetJs, 'api("/api/creator/widget-studio/widgets"'));
const createStart = server.indexOf('app.post(\n    "/api/creator/widget-studio/widgets"');
const createEnd = server.indexOf('app.get(\n    "/api/creator/widget-studio/widgets/:id"', createStart);
const createBlock = createStart >= 0 ? server.slice(createStart, createEnd > createStart ? createEnd : createStart + 9000) : '';
add('widget creation requires creator account', regex(createBlock, /requireCreatorAccount/));
add('widget creation does not require an active TikTok connection', !regex(createBlock, /if\s*\([^)]*connection\?\.connected[^)]*\)/));
add('widget creation starts as draft', has(createBlock, "'draft'"));

// Launcher device-link protections.
add('launcher device-link start is rate limited', regex(server, /"\/api\/launcher\/device-link\/start"[\s\S]{0,180}launcherDeviceStartLimiter/));
add('launcher device-link poll is rate limited', regex(server, /"\/api\/launcher\/device-link\/poll"[\s\S]{0,180}launcherDevicePollLimiter/));
add('launcher poll requires device id and secret', has(server, 'getLauncherDeviceLinkBySecret(\n                req.body?.device_link_id,\n                req.body?.device_secret') || regex(server, /getLauncherDeviceLinkBySecret\([\s\S]{0,180}device_link_id[\s\S]{0,120}device_secret/));
add('launcher device confirmation requires creator account', regex(server, /"\/api\/creator\/launcher\/device-link\/confirm"[\s\S]{0,180}requireCreatorAccount/));
add('launcher device list requires creator account', regex(server, /"\/api\/creator\/launcher\/devices"[\s\S]{0,180}requireCreatorAccount/));
add('launcher device revoke requires creator account', regex(server, /"\/api\/creator\/launcher\/devices\/:id"[\s\S]{0,180}requireCreatorAccount/));
add('launcher connect page warns against foreign codes', has(launcherConnectPage, 'Bestätige keinen Code aus Chat, E-Mail oder einer fremden Bildschirmfreigabe.'));
add('launcher connect page requires matching device code', has(launcherConnectPage, 'Der Code auf dieser Seite muss mit dem Code im Launcher übereinstimmen.'));
add('launcher connect flow uses creator API', has(launcherConnectJs, '/api/creator/launcher/device-link/'));
add('launcher overview loads creator-scoped devices', has(launcherJs, '/api/creator/launcher/devices'));
add('launcher page is an authenticated creator workspace', has(launcherPage, 'creator-workspace') && has(launcherJs, 'CFS.requireAuth()'));

const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.detail ? ` · ${r.detail}` : ''}`);
console.log(`\nIntegration Acceptance Pass 21.5: ${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exitCode = 1;
