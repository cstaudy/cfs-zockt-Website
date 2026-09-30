import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const server=read('server.js');
const bridge=read('launcher/src/bridge-client.js');
const main=read('launcher/main.js');
const preload=read('launcher/preload.js');
const renderer=read('launcher/renderer/app.js');
const providers=read('launcher/src/stream-provider-catalog.js');
const credentialStore=read('launcher/src/stream-credential-store.js');
const streamStudio=read('public/assets/js/stream-studio.js');
const streamStudioHtml=read('public/pages/stream-studio.html');
const pkg=json('package.json');
const launcherPkg=json('launcher/package.json');

let pass=0,total=0;
const ok=(name,value)=>{total++;console.log(`${value?'PASS':'FAIL'} ${name}`);if(value)pass++;};
const hasAll=(text,parts)=>parts.every(part=>text.includes(part));
const versionAtLeast=(actual,minimum)=>{
  const a=String(actual||'').split('.').map(Number),m=String(minimum||'').split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}
  return true;
};

ok('backend >= 3.19.0',versionAtLeast(pkg.version,'3.19.0'));
ok('launcher >= 0.47.25',versionAtLeast(launcherPkg.version,'0.47.25'));
ok('Twitch stream key endpoint registered',server.includes('TWITCH_STREAM_KEY_URL = "https://api.twitch.tv/helix/streams/key"'));
ok('Twitch official ingest endpoint registered',server.includes('TWITCH_INGESTS_URL = "https://ingest.twitch.tv/ingests"'));
ok('Twitch stream-key scope isolated from EventSub scopes',
  server.includes('TWITCH_STREAM_TARGET_SCOPES = Object.freeze(["channel:read:stream_key"])') &&
  server.includes('...TWITCH_EVENTSUB_REQUIRED_SCOPES') &&
  server.includes('...TWITCH_STREAM_TARGET_SCOPES'));
ok('Twitch EventSub scope readiness remains independent',server.includes('const missingScopes=TWITCH_EVENTSUB_REQUIRED_SCOPES.filter'));
ok('Twitch stream target reports reauth separately',hasAll(server,['stream_target:{','reauth_required:Boolean(row?.connected)&&streamTargetMissing.length>0']));
ok('Twitch stream key request matches broadcaster',server.includes('new URLSearchParams({broadcaster_id:String(row.twitch_user_id||"")})'));
ok('Twitch fallback ingest contains no creator secret',server.includes('rtmp://ingest.global-contribute.live-video.net/app'));
ok('YouTube liveStreams endpoint registered',server.includes('YOUTUBE_LIVESTREAMS_URL = "https://www.googleapis.com/youtube/v3/liveStreams"'));
ok('YouTube keeps readonly scope',server.includes('YOUTUBE_OAUTH_SCOPES = Object.freeze(["https://www.googleapis.com/auth/youtube.readonly"])'));
ok('YouTube discovery checks active and upcoming broadcasts',hasAll(server,['youtubeBroadcastRows(row.access_token,"active")','youtubeBroadcastRows(row.access_token,"upcoming")']));
ok('YouTube bound stream IDs supported',server.includes('boundStreamId')&&server.includes('youtubeLiveStreamRows(row.access_token,{ids:boundIds})'));
ok('YouTube reusable own streams supported',server.includes('youtubeLiveStreamRows(row.access_token)'));
ok('YouTube public candidates omit streamName',server.includes('publicYouTubeStreamTargetCandidate')&&!/function publicYouTubeStreamTargetCandidate[\s\S]{0,1200}streamName/.test(server));
ok('YouTube credential uses RTMPS when available',server.includes('ingestion.rtmpsIngestionAddress||ingestion.ingestionAddress'));
ok('YouTube stream selection supported',hasAll(server,['status:"selection_required"','recommended_stream_id','requestedStreamId']));
ok('Provider target status bridge endpoint exists',server.includes('"/api/bridge/stream-studio/provider-targets/:provider"'));
ok('Provider credential import bridge endpoint exists',server.includes('"/api/bridge/stream-studio/provider-targets/:provider/import"'));
ok('Bridge responses are no-store',server.includes('res.set("Pragma","no-cache")')&&server.includes('res.set("Cache-Control","no-store")'));
ok('Provider import declares no server persistence',server.includes('server_storage:"none"')&&server.includes('credentials_persisted_server_side:false'));
ok('TikTok automatic credential import stays disabled',server.includes('provider:"tiktok",status:row?.connected?"manual_required":"connect_required"')&&server.includes('automatic_import:false'));
ok('Twitch beta gate applies to stream credential import',server.includes('await requireProviderBetaAccess(creatorId,"twitch")'));
ok('TikTok beta gate applies to target status/import',server.includes('await requireProviderBetaAccess(creatorId,"tiktok")'));
ok('Stream Studio exposes provider-target readiness without secrets',server.includes('provider_targets:providerTargets'));
ok('Bridge client has target status/import methods',hasAll(bridge,['providerStreamTargetStatus(provider)','importProviderStreamCredential(provider,payload={})']));
ok('Bridge advertises provider stream target import capability',bridge.includes('provider_stream_target_import_v1: true'));
ok('Launcher import validates configured studio target',main.includes('currentStreamTarget(targetId)')&&main.includes('Streaming-Ziel ist nicht mehr in deiner aktuellen Studio-Konfiguration vorhanden.'));
ok('Launcher refuses import without SafeStorage',main.includes('Windows SafeStorage muss verfügbar sein'));
ok('Launcher stores imported secret only in local credential store',main.includes('streamCredentialStore.set(targetId')&&main.includes('source:"provider_account"'));
ok('Launcher public import state strips credential',main.includes('function publicProviderStreamImport')&&!/function publicProviderStreamImport[\s\S]{0,1800}stream_key/.test(main));
ok('Launcher supports forced OAuth reauthorization',main.includes('force!==true')&&preload.includes('reauthorizeProviderAccount'));
ok('Launcher renderer offers account import',renderer.includes('AUS ACCOUNT ÜBERNEHMEN')&&renderer.includes('data-import-provider-stream'));
ok('Launcher renderer offers YouTube stream selection',renderer.includes('data-provider-stream-select')&&renderer.includes('AUSWAHL ÜBERNEHMEN'));
ok('Launcher renderer offers Twitch scope reauth',renderer.includes('STREAM-ZUGRIFF FREIGEBEN')&&renderer.includes('data-reauth-stream-provider'));
ok('Manual local credential fallback remains available',renderer.includes('MANUELL LOKAL SPEICHERN'));
ok('Credential store only permits RTMP/RTMPS',credentialStore.includes('["rtmp:", "rtmps:"].includes(url.protocol)'));
ok('Credential store forbids credentials in server URL',credentialStore.includes('url.username || url.password'));
ok('Credential store encrypts both server and key',hasAll(credentialStore,['serverUrlEncrypted:this.encrypt(serverUrl)','streamKeyEncrypted:this.encrypt(streamKey)']));
ok('Provider catalog documents account imports',providers.includes('channel:read:stream_key')&&providers.includes('no-store Bridge'));
ok('Website describes provider account target readiness',streamStudio.includes('ACCOUNT VERBUNDEN · LAUNCHER-IMPORT'));
ok('Website does not claim provider secrets are cloud-persisted',streamStudioHtml.includes('PostgreSQL speichert sie nicht'));
ok('Failure isolation contract remains active',server.includes('failure_policy:"isolate_destination"'));
ok('Cloud relay remains disabled',server.includes('cloud_relay:false'));
ok('v153 release script registered',Boolean(pkg.scripts['stream-provider-target153:check']&&pkg.scripts['release:v153']));

console.log(`\nStream Provider Targets v153: ${pass}/${total} ${pass===total?'PASS':'FAIL'}`);
if(pass!==total)process.exit(1);
