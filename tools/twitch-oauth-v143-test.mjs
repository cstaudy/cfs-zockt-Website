import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function assert(v,m){if(!v)throw new Error(m)}
const server=read('server.js');
const ui=read('public/assets/js/page-integrations.js');
const html=read('public/pages/integrations.html');
const env=read('.env.example');
for(const needle of [
 'CREATE TABLE IF NOT EXISTS twitch_connections',
 'CREATE TABLE IF NOT EXISTS twitch_oauth_states',
 '"/auth/creator/twitch"',
 '"/auth/twitch/callback"',
 '"/api/creator/twitch/status"',
 '"/api/creator/twitch/sync"',
 '"/api/creator/twitch/disconnect"',
 'refreshTwitchTokens',
 'validateTwitchToken',
 'TWITCH_VALIDATE_INTERVAL_MS = 55 * 60 * 1000',
 'encryptSecret(String(data.access_token||""))',
 'encryptSecret(refresh)',
 'twitch_disconnected',
 'twitch_connected'
]) assert(server.includes(needle),`Twitch OAuth v143 missing: ${needle}`);
assert(server.includes('path.startsWith("/auth/tiktok")||path.startsWith("/auth/twitch")'),'Twitch auth is not covered by incident write freeze');
assert(!server.includes('res.json({access_token'),'Twitch access token must not be returned directly');
assert(html.includes('TWITCH VERBINDEN')&&(html.includes('EventSub/Chat')||html.includes('EVENTSUB + CHAT')||html.includes('EventSub + Chat')),'Twitch integration UI missing or overclaims runtime readiness');
assert(ui.includes('/api/creator/twitch/status')&&ui.includes('/api/creator/twitch/sync')&&ui.includes('/api/creator/twitch/disconnect'),'Twitch UI actions missing');
assert(env.includes('TWITCH_CLIENT_ID=')&&env.includes('TWITCH_CLIENT_SECRET=')&&env.includes('TWITCH_REDIRECT_URI='),'Twitch env documentation missing');
const {publicProviderOAuthContracts}=require(path.join(root,'lib/provider-oauth-contract.js'));
const rows=publicProviderOAuthContracts({TWITCH_CLIENT_ID:'id',TWITCH_CLIENT_SECRET:'sentinel-v143-secret',TWITCH_REDIRECT_URI:'https://cfs-zockt.de/auth/twitch/callback'});
const twitch=rows.find(x=>x.provider==='twitch');
const youtube=rows.find(x=>x.provider==='youtube');
assert(twitch?.oauth_implemented===true,'Twitch contract must report OAuth implemented');
assert(twitch?.production_ready===false,'Twitch must stay not production-ready before EventSub/real acceptance');
assert(twitch?.implemented_capabilities?.includes('token_validate')&&twitch?.implemented_capabilities?.includes('token_refresh'),'Twitch token lifecycle capability missing');
assert(typeof youtube?.oauth_implemented==='boolean','YouTube OAuth implementation flag missing');
assert(!JSON.stringify(rows).includes('sentinel-v143-secret'),'Twitch secret leaked through public OAuth contract');
console.log(JSON.stringify({ok:true,twitch:'oauth_implemented_runtime_open',youtube:'later_versions_allowed'}));
