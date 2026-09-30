import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {publicProviderOAuthContracts}=require("../lib/provider-oauth-contract.js");
function assert(value,message){if(!value)throw new Error(message)}
const rows=publicProviderOAuthContracts({TWITCH_CLIENT_ID:"id",TWITCH_CLIENT_SECRET:"sentinel-oauth-secret-v141",TWITCH_REDIRECT_URI:"https://cfs-zockt.de/auth/twitch/callback"});
const twitch=rows.find(x=>x.provider==="twitch"),youtube=rows.find(x=>x.provider==="youtube");
assert(twitch&&youtube,"Twitch/YouTube contracts missing");
assert(typeof youtube.oauth_implemented==="boolean","YouTube OAuth implementation flag missing");
assert(typeof twitch.oauth_implemented==="boolean","Twitch OAuth implementation flag missing");
assert(twitch.production_ready===false&&youtube.production_ready===false,"foundation must not claim production ready");
assert(twitch.scope_policy==="feature_derived_least_privilege","Twitch least-privilege policy missing");
assert(youtube.read_scope==="https://www.googleapis.com/auth/youtube.readonly","YouTube readonly scope mismatch");
assert(Array.isArray(youtube.manage_scopes)&&youtube.manage_scopes.includes("https://www.googleapis.com/auth/youtube"),"YouTube manage scope missing");
assert(twitch.configuration.client_id===true&&twitch.configuration.client_secret===true&&twitch.configuration.redirect_uri===true,"Twitch config flags failed");
assert(!JSON.stringify(rows).includes("sentinel-oauth-secret-v141"),"OAuth secret value leaked into public contract");
console.log(JSON.stringify({ok:true,providers:rows.map(x=>x.provider),productionReady:rows.some(x=>x.production_ready)}));
