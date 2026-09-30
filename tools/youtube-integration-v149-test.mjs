import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const server=read('server.js');
const ui=read('public/assets/js/page-integrations.js');
const html=read('public/pages/integrations.html');
const widgetStudio=read('public/assets/js/widget-studio.js');
const env=read('.env.example');
const launcherMain=read('launcher/main.js');
const launcherRenderer=read('launcher/renderer/app.js');
const launcherProviders=read('launcher/src/provider-manager.js');
const pkg=JSON.parse(read('package.json'));

let pass=0,total=0;
function check(name,value){total++;const ok=Boolean(value);if(ok)pass++;console.log(`${ok?'PASS':'FAIL'}  ${name}`);}

check('backend is at least v149 baseline',versionAtLeast(pkg.version,'3.18.0'));
check('YouTube connection table exists',server.includes('CREATE TABLE IF NOT EXISTS youtube_connections'));
check('YouTube OAuth state table exists',server.includes('CREATE TABLE IF NOT EXISTS youtube_oauth_states'));
check('YouTube channel ownership is unique',server.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_youtube_channel_owner'));
check('YouTube OAuth uses readonly scope only',server.includes('const YOUTUBE_OAUTH_SCOPES = Object.freeze(["https://www.googleapis.com/auth/youtube.readonly"])')&&!server.includes('YOUTUBE_OAUTH_SCOPES = Object.freeze(["https://www.googleapis.com/auth/youtube"'));
check('YouTube OAuth requests offline refresh',server.includes('access_type:"offline"')&&server.includes('prompt:"consent"'));
check('YouTube OAuth state is hashed server-side',server.includes('INSERT INTO youtube_oauth_states(state_hash,creator_id,expires_at)')&&server.includes('[hashValue(state),normalizeCreatorId(creatorId)]'));
check('YouTube OAuth cookie is HttpOnly and scoped',server.includes('res.cookie(YOUTUBE_STATE_COOKIE,state,{httpOnly:true')&&server.includes('path:"/auth/youtube"'));
check('YouTube callback consumes one-time state',server.includes('DELETE FROM youtube_oauth_states WHERE state_hash=$1 AND expires_at>=NOW() RETURNING creator_id'));
check('YouTube access token is encrypted at rest',server.includes('encryptSecret(String(data?.access_token||""))'));
check('YouTube refresh token is encrypted at rest',server.includes('refresh?encryptSecret(refresh):null'));
check('YouTube token refresh is implemented',server.includes('async function refreshYouTubeTokens')&&server.includes('grant_type:"refresh_token"'));
check('YouTube channel sync uses mine=true',server.includes('part:"snippet,statistics",mine:"true",maxResults:"5"'));
check('YouTube provider ownership is creator isolated',server.includes('assertProviderAccountAvailable("youtube",channel.id,creatorId)'));
check('YouTube active LIVE discovery uses own broadcasts',server.includes('broadcastStatus:"active",mine:"true",maxResults:"5"'));
check('YouTube live state is provider-specific',server.includes("provider='youtube'")&&server.includes('getProviderLiveState(creatorId,"youtube")'));
check('YouTube live chat polling is implemented',server.includes('liveChatId:chatId,part:"id,snippet,authorDetails"')&&server.includes('YOUTUBE_CHAT_MESSAGES_URL'));
check('YouTube chat event is normalized',server.includes('if(type==="textMessageEvent")return"chat"'));
check('YouTube membership events are normalized',server.includes('membershipGiftingEvent')&&server.includes('return"membership"'));
check('YouTube Super Chat/Sticker events are normalized',server.includes('superChatEvent')&&server.includes('superStickerEvent')&&server.includes('return"super_chat"'));
check('YouTube event dedupe key uses source message id',server.includes('const eventKey=`youtube:${String(item?.id||crypto.randomUUID())'));
check('YouTube runtime worker exists',server.includes('startYouTubeRuntimeWorker')&&server.includes('runYouTubeRuntimeReconcile'));
check('YouTube status route exists and is no-store',server.includes('app.get("/api/creator/youtube/status",requireCreatorAccount')&&server.includes('res.set("Cache-Control","no-store")'));
check('YouTube connect route exists',server.includes('app.get("/auth/creator/youtube",requireCreatorAccount,creatorWriteLimiter'));
check('YouTube sync route exists',server.includes('app.post("/api/creator/youtube/sync",requireCreatorAccount,creatorWriteLimiter'));
check('YouTube disconnect requires account elevation',server.includes('app.post("/api/creator/youtube/disconnect",requireCreatorAccount,requireCreatorAccountElevation'));
check('YouTube disconnect revokes provider token',server.includes('YOUTUBE_REVOKE_URL')&&server.includes('youtube_disconnected'));
check('public YouTube payload does not expose OAuth tokens',!publicFunctionBody().includes('access_token')&&!publicFunctionBody().includes('refresh_token'));
check('YouTube widgets stay provider-pure',server.includes('provider: "youtube"')||server.includes('provider:"youtube"'));
check('YouTube widget taxonomy rejects cross-provider metrics',server.includes('youtube: Object.freeze({forbidden_events:')&&server.includes('forbidden_metric_prefixes:["live.likes","live.gifts","live.shares","live.viewers","profile.likes","twitch."]'));
check('Integrations UI has YouTube connect/sync/disconnect',html.includes('id="youtubeConnect"')&&html.includes('id="youtubeSync"')&&html.includes('id="youtubeDisconnect"'));
check('Integrations client calls YouTube status/sync/disconnect',ui.includes('/api/creator/youtube/status')&&ui.includes('/api/creator/youtube/sync')&&ui.includes('/api/creator/youtube/disconnect'));
check('Widget Studio provider catalog exposes YouTube area',server.includes('youtube:Boolean(providerAccess?.youtube?.connected)')&&server.includes('["tiktok","twitch","youtube","obs"].includes(area)')&&server.includes('youtube_chat_overlay'));
check('Launcher recognizes YouTube provider',launcherProviders.includes('key:"youtube"')&&launcherProviders.includes('label:"YouTube Live"'));
check('Launcher account-connect flow includes YouTube',launcherMain.includes('["tiktok","twitch","youtube"]')&&launcherRenderer.includes('provider==="youtube"'));
check('Google/YouTube env vars are documented',env.includes('GOOGLE_CLIENT_ID=')&&env.includes('GOOGLE_CLIENT_SECRET=')&&env.includes('YOUTUBE_REDIRECT_URI='));

const {publicProviderOAuthContracts}=require(path.join(root,'lib/provider-oauth-contract.js'));
const rows=publicProviderOAuthContracts({GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:'sentinel-youtube-secret',YOUTUBE_REDIRECT_URI:'https://cfs-zockt.de/auth/youtube/callback'});
const youtube=rows.find(row=>row.provider==='youtube');
check('public OAuth contract reports YouTube implemented',youtube?.oauth_implemented===true);
check('public OAuth contract keeps YouTube acceptance open',youtube?.production_ready===false);
check('public OAuth contract advertises readonly scope',youtube?.read_scope==='https://www.googleapis.com/auth/youtube.readonly');
check('public OAuth contract does not expose client secret',!JSON.stringify(rows).includes('sentinel-youtube-secret'));
check('v149 YouTube gate remains registered',pkg.scripts['youtube149:check']==='node tools/youtube-integration-v149-test.mjs .');

console.log(`\nYouTube Integration v149: ${pass}/${total} ${pass===total?'PASS':'FAIL'}`);
if(pass!==total)process.exit(1);

function publicFunctionBody(){
  return (server.match(/function publicYouTubeConnection\(row,live=null\)\{[\s\S]*?\n\}/)||[''])[0];
}
function versionAtLeast(actual,minimum){
  const a=String(actual||'').split('.').map(Number),m=String(minimum||'').split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}
  return true;
}
