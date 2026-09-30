import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message)}

const launcher=json('launcher/package.json');
{const p=String(launcher.version).split('.').map(Number);assert(p[0]>0||p[1]>47||(p[1]===47&&p[2]>=18),`v141 launcher baseline requires >=0.47.18: ${launcher.version}`);}
for(const file of [
  'launcher/src/obs-websocket-controller.js',
  'launcher/tools/obs-websocket-controller-v141-test.mjs',
  'launcher/tools/tiktok-live-health-v141-test.mjs',
  'lib/provider-oauth-contract.js',
  'tools/provider-oauth-foundation-v141-test.mjs'
])assert(fs.existsSync(path.join(root,file)),`v141 integration file missing: ${file}`);

const main=read('launcher/main.js');
const preload=read('launcher/preload.js');
const config=read('launcher/src/config-store.js');
const obsDoctor=read('launcher/src/obs-doctor.js');
const renderer=read('launcher/renderer/app.js');
const html=read('launcher/renderer/index.html');
const tiktool=read('launcher/src/providers/tiktool-provider.js');
const server=read('server.js');
const integrations=read('public/assets/js/page-integrations.js');
const integrationsHtml=read('public/pages/integrations.html');

for(const needle of ['launcher:obs-websocket-connect','launcher:obs-websocket-disconnect','launcher:obs-websocket-refresh','launcher:obs-websocket-scene','launcher:obs-websocket-browser-source'])assert(main.includes(needle),`OBS IPC missing: ${needle}`);
for(const needle of ['obsWebSocketConnect','obsWebSocketDisconnect','obsWebSocketRefresh','obsWebSocketScene','obsWebSocketBrowserSource'])assert(preload.includes(needle),`OBS preload method missing: ${needle}`);
assert(config.includes('obsWebSocketPasswordEncrypted')&&config.includes('getObsWebSocketPassword')&&config.includes('clearObsWebSocketPassword'),'OBS password is not handled through encrypted local settings');
assert(obsDoctor.includes('copy.hash')&&obsDoctor.includes('token'),'OBS URL fragment token redaction missing');
assert(main.includes('request_policy:"allowlist"')&&main.includes('password_exposed:false'),'OBS Bridge health must expose policy but no credential');
assert(html.includes('START & STATUS')&&html.includes('VERBINDEN')&&html.includes('PRODUZIEREN')&&html.includes('COMMUNITY')&&html.includes('SYSTEM & TESTS'),'Launcher navigation categorization missing');
assert(html.includes('OBS WEBSOCKET')&&html.includes('obsWsUrl')&&renderer.includes('renderObsWebSocket'),'OBS control UI missing');
assert(tiktool.includes('reconnectManaged: true')&&tiktool.includes('lastEventAt')&&tiktool.includes('connectAttempts'),'TikTok LIVE health/reconnect metadata missing');
assert(server.includes('"/api/creator/integration-capabilities"')&&server.includes('publicProviderOAuthContracts'),'Integration capability endpoint missing');
assert(integrations.includes('/api/creator/integration-capabilities'),'Integrations UI does not consume capability endpoint');
assert(integrationsHtml.includes('Twitch')&&integrationsHtml.includes('YouTube'),'Twitch/YouTube integration surfaces missing');

const {publicProviderOAuthContracts}=require(path.join(root,'lib/provider-oauth-contract.js'));
const contracts=publicProviderOAuthContracts({});
assert(contracts.every(row=>row.production_ready===false),'Provider integrations must not claim production readiness');
assert(typeof contracts.find(row=>row.provider==='youtube')?.oauth_implemented==='boolean','YouTube OAuth implementation flag missing');
assert(!JSON.stringify(contracts).includes('TWITCH_CLIENT_SECRET'),'Provider public contracts leaked env secret names');

console.log(JSON.stringify({ok:true,launcher:launcher.version,obs_websocket:'code_ready_acceptance_open',tiktok_live:'health_hardened_acceptance_open',oauth_foundations:contracts.map(row=>row.provider)}));
