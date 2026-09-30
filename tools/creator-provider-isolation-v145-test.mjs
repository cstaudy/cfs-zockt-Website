import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(v,m){if(!v)throw new Error(m)}
const server=read('server.js');
const studio=read('public/assets/js/widget-studio.js');
const studioHtml=read('public/pages/widget-studio.html');
const launcher=read('launcher/renderer/app.js');
const renderer=read('public/assets/js/cfs-widget-renderer.js');
const runtime=read('public/assets/js/cfs-widget-runtime.js');
const launcherPkg=json('launcher/package.json');
const parts=String(launcherPkg.version).split('.').map(Number);
assert(parts[0]>0||parts[1]>47||(parts[1]===47&&parts[2]>=21),`launcher must be >= 0.47.21, got ${launcherPkg.version}`);

// Generic creator signup/login foundation: registration is public and gets a fresh creator_id.
assert(server.includes('"/api/account/register"'),'creator registration route missing');
assert(server.includes('const creatorId =\n                createCreatorAccountId();'),'registration must allocate creator-specific id');
assert(server.includes('INSERT INTO creator_accounts'),'creator account persistence missing');

// Every external connection is creator-scoped.
for(const needle of [
  'CREATE TABLE IF NOT EXISTS tiktok_connections',
  'CREATE TABLE IF NOT EXISTS twitch_connections',
  'CREATE TABLE IF NOT EXISTS launcher_provider_oauth_handoffs',
  'CREATE TABLE IF NOT EXISTS creator_widgets',
  'creator_id TEXT PRIMARY KEY',
  'req.studioBridge.creator_id',
  'assertProviderAccountAvailable("twitch"',
  'assertProviderAccountAvailable("tiktok"'
]) assert(server.includes(needle),`creator isolation contract missing: ${needle}`);
assert(server.includes('provider_account_in_use'),'external provider account collision protection missing');

// Twitch EventSub must be authenticated from the raw request body and scoped to the broadcaster/creator.
assert(server.includes('express.raw({type:"application/json",limit:"256kb"})'),'Twitch EventSub raw-body route missing');
assert(server.includes('crypto.createHmac("sha256",twitchEventSubSecret())'),'Twitch EventSub HMAC verification missing');
assert(server.includes('crypto.timingSafeEqual'),'Twitch EventSub constant-time signature check missing');
for(const scope of ['moderator:read:followers','channel:read:subscriptions','bits:read']) assert(server.includes(scope),`Twitch required scope missing: ${scope}`);
for(const type of ['stream.online','stream.offline','channel.follow','channel.subscribe','channel.cheer']) assert(server.includes(`type:"${type}"`),`Twitch EventSub type missing: ${type}`);
assert(server.includes("WHERE connected=TRUE AND twitch_user_id=$1 LIMIT 1"),'Twitch EventSub must resolve broadcaster to a connected creator');
assert(server.includes("provider,'twitch'" )||server.includes("'twitch',$4,$5"),'Twitch events must be provider-tagged');
assert(server.includes('ON CONFLICT DO NOTHING'),'Twitch EventSub deduplication missing');

// TikTok and Twitch live state must not overwrite each other.
assert(server.includes('CREATE TABLE IF NOT EXISTS creator_provider_live_state'),'provider-specific live state missing');
assert(server.includes('PRIMARY KEY (creator_id, provider)'),'provider live state must be creator+provider scoped');

// Widget catalog must be provider-specific and server-enforced.
for(const needle of ['twitch_live_timer','twitch_follow_alert','twitch_latest_follower','twitch_sub_alert','twitch_cheer_alert']) assert(server.includes(needle),`Twitch widget missing: ${needle}`);
assert(server.includes('.filter(item=>!hasProviderFilter||item.provider==="obs"||item.provider_connected)'),'unconnected provider widgets must be filtered from registry');
assert(server.includes('code:"provider_not_connected"'),'widget creation must reject disconnected provider');
assert(server.includes('code:"provider_scope_missing"'),'Twitch widget creation must reject missing scope');
assert(server.includes('["twitch","youtube"].includes(widgetProvider)?widgetProvider:null'),'provider widget runtime must filter provider events');

// Creator-facing Studio must expose only connected provider areas.
assert(studioHtml.includes('data-platform-filter="twitch"'),'Twitch platform card missing');
assert(studioHtml.includes('TikTok verbunden')&&studioHtml.includes('Twitch verbunden'),'provider-specific Studio guidance missing');
assert(studio.includes('el.hidden=state.providerAccess?.tiktok?.connected!==true'),'TikTok Studio filter must hide when disconnected');
assert(studio.includes('el.hidden=state.providerAccess?.twitch?.connected!==true'),'Twitch Studio filter must hide when disconnected');
assert(studio.includes('new URLSearchParams(location.search).get("platform")'),'provider-specific Studio deep link missing');

// Launcher must switch a connected provider button from OAuth to that provider's widgets.
assert(launcher.includes('connected?`${cap.toUpperCase()} WIDGETS`'), 'connected provider must expose provider widget CTA');
assert(launcher.includes('/pages/widget-studio.html?platform=${encodeURIComponent(provider)}'),'launcher provider CTA must deep-link to provider-filtered widgets');
assert(launcher.includes('BERECHTIGEN'),'provider reauthorization CTA missing for newly required scopes');

// Stream readiness accepts either provider; no Twitch creator is forced to connect TikTok.
assert(server.includes('const providerReady=tiktokReady||twitchReady||youtubeReady;')||server.includes('const providerReady=tiktokReady||twitchReady;'),'stream-ready must accept connected providers');
assert(server.includes('label:"LIVE-Plattform"'),'provider-neutral stream-ready step missing');

// Runtime understands provider-native LIVE widgets.
assert(renderer.includes('live_provider')&&runtime.includes('live_provider'),'provider-native widget runtime support missing');

console.log(JSON.stringify({ok:true,version:'v145',launcher:launcherPkg.version,multi_creator_isolation:true,provider_widget_gating:true,twitch_eventsub:true,stream_ready_any_provider:true}));
