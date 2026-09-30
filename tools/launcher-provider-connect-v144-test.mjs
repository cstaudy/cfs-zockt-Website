import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(v,m){if(!v)throw new Error(m)}
const server=read('server.js');
const bridge=read('launcher/src/bridge-client.js');
const main=read('launcher/main.js');
const preload=read('launcher/preload.js');
const html=read('launcher/renderer/index.html');
const app=read('launcher/renderer/app.js');
const handoffPage=read('public/pages/launcher-provider-connect.html');
const handoffJs=read('public/assets/js/launcher-provider-connect.js');
const launcher=json('launcher/package.json');
const version=String(launcher.version).split('.').map(Number);
assert(version[0]>0||version[1]>47||(version[1]===47&&version[2]>=20),`launcher must be >= 0.47.20, got ${launcher.version}`);
for(const needle of [
  'CREATE TABLE IF NOT EXISTS launcher_provider_oauth_handoffs',
  '"/api/bridge/integrations/:provider/connect"',
  '"/auth/launcher/integrations/start"',
  'issueLauncherProviderOAuthHandoff',
  'consumeLauncherProviderOAuthHandoff',
  'launcher-provider-connect.html#',
  'DELETE FROM launcher_provider_oauth_handoffs WHERE expires_at < NOW()',
  'path.startsWith("/auth/launcher/integrations")'
])assert(server.includes(needle),`server v144 provider handoff missing: ${needle}`);
assert(server.includes('integrations:{')&&(server.includes('live_events_ready:tiktokLiveReady')||server.includes('live_events_ready:tiktokBeta.allowed&&tiktokLiveReady'))&&server.includes('eventsub_implemented:'),'bridge library integration readiness missing');
assert(!server.includes('launcher-provider-connect.html?handoff='),'handoff token must not be placed in query string');
assert(bridge.includes('beginProviderConnect(provider)')&&bridge.includes('/api/bridge/integrations/${encodeURIComponent(key)}/connect'),'bridge provider-connect client missing');
assert(bridge.includes('provider_oauth_handoff_v1: true'),'bridge capability missing');
assert(preload.includes('connectProviderAccount'),'preload provider connect method missing');
for(const needle of ['connectProviderAccount(provider)','scheduleProviderIntegrationPoll','target.pathname!=="/pages/launcher-provider-connect.html"','shell.openExternal(target.toString())'])assert(main.includes(needle),`launcher main provider connect missing: ${needle}`);
assert(html.includes('data-provider-connect="tiktok"')&&html.includes('data-provider-connect="twitch"'),'TikTok/Twitch launcher buttons missing');
assert(app.includes('renderProviderConnections')&&app.includes('[data-provider-connect]')&&app.includes('connectProviderAccount(provider)'),'provider launcher UI render missing');
assert((app.includes('Twitch LIVE-Events folgen mit EventSub')||app.includes('Twitch EventSub ist bereit')||app.includes('Twitch EventSub inklusive Chat ist bereit'))&&(app.includes('EventSub wird eingerichtet')||app.includes('EventSub inklusive Chat wird eingerichtet')),'Twitch runtime readiness must remain explicit and state-aware');
assert(app.includes('LIVE-Events benötigen zusätzlich einen aktiven TikTok LIVE-Provider'),'TikTok OAuth must remain distinct from LIVE provider readiness');
assert(handoffPage.includes('id="providerConnectForm"')&&handoffPage.includes('method="post"'),'handoff page form missing');
assert(handoffJs.includes('history.replaceState')&&handoffJs.includes('location.hash'),'handoff page must remove fragment before submit');
assert(handoffJs.includes('form.submit()'),'handoff page does not submit one-time code');
assert(!handoffJs.includes('console.log')&&!main.includes('logger?.info(raw)'),'handoff token must not be logged');
console.log(JSON.stringify({ok:true,launcher:launcher.version,providers:['tiktok','twitch'],handoff:'fragment_to_post_one_time',twitch_live_events:'not_overclaimed'}));
