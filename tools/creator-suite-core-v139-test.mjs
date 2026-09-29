import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { BridgeClient } = require('../launcher/src/bridge-client.js');

const client = new BridgeClient({
  settings:{backendUrl:'http://127.0.0.1:9999',provider:'mock'},
  token:'test-token',
  logger:{info(){},warn(){},error(){}},
  version:'0.47.17',
  streamHealthProvider:()=>({status:'idle'}),
  interactiveGamesProvider:()=>({available:true,status:'ready'}),
  liveProviderHealthProvider:()=>({key:'mock',ready:true,status:'connected'}),
  streamCredentialsProvider:()=>({encryptionAvailable:true,targets:{twitch:{configured:true},youtube:{configured:false}}}),
  obsIntegrationProvider:()=>({available:true,mode:'browser_source_doctor'})
});

const caps = client.capabilities;
const requiredFlags = [
  'creator_suite_runtime_v1','stream_engine_v1','multistream_local_v1',
  'local_stream_credentials_v1','interactive_games_v1','live_provider_health_v1',
  'obs_browser_source_doctor_v1','signed_requests_v1','replay_guard_v1','secure_transport_guard_v1'
];
for (const key of requiredFlags) {
  if (caps[key] !== true) throw new Error(`Capability fehlt: ${key}`);
}
if (Number(caps.stream_studio_protocol) !== 6) throw new Error('Stream Studio Protocol ist nicht 6');
if (caps.integration_health?.stream_credentials?.configured_targets !== 1) throw new Error('Credential-Summary falsch');
if (JSON.stringify(caps).toLowerCase().includes('stream-key')) throw new Error('Capabilities dürfen keine Stream-Keys enthalten');

client.validateStreamStudioContract({contract:{
  protocol:6,
  credentials:'launcher_local_encrypted',
  required_launcher_capabilities:['signed_requests_v1','replay_guard_v1','stream_engine_v1','multistream_local_v1','local_stream_credentials_v1']
}});

let rejected = false;
try {
  client.validateStreamStudioContract({contract:{protocol:6,credentials:'cloud',required_launcher_capabilities:[]}});
} catch (error) {
  rejected = error?.code === 'stream_studio_credential_policy_rejected';
}
if (!rejected) throw new Error('Unsichere Credential-Policy wurde nicht abgelehnt');

rejected = false;
try {
  client.validateStreamStudioContract({contract:{protocol:99,credentials:'launcher_local_encrypted',required_launcher_capabilities:[]}});
} catch (error) {
  rejected = error?.code === 'stream_studio_protocol_unsupported';
}
if (!rejected) throw new Error('Unbekanntes Protokoll wurde nicht abgelehnt');

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
for (const needle of [
  'protocol:6',
  'credentials:"launcher_local_encrypted"',
  'cloud_stream_keys:false',
  'failure_policy:"isolate_destination"',
  'required_launcher_capabilities'
]) {
  if (!server.includes(needle)) throw new Error(`Server-Contract fehlt: ${needle}`);
}

console.log(JSON.stringify({ok:true,checks:14,launcher:'0.47.17',stream_studio_protocol:6}));
