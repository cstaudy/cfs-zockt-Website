import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};
const server=read('server.js');
const studio=read('public/assets/js/widget-studio.js');
const renderer=read('public/assets/js/cfs-widget-renderer.js');
const stream=read('public/assets/js/stream-studio.js');
const streamHtml=read('public/pages/stream-studio.html');
const integrations=read('public/assets/js/page-integrations.js');
const launcher=read('launcher/renderer/app.js');
const pkg=JSON.parse(read('package.json'));
const launcherPkg=JSON.parse(read('launcher/package.json'));

const versionAtLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),m=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false}return true};
assert(versionAtLeast(pkg.version,'3.16.0'),`backend must be at least 3.16.0, got ${pkg.version}`);
assert(versionAtLeast(launcherPkg.version,'0.47.22'),`launcher must be >= 0.47.22, got ${launcherPkg.version}`);

const scopeBlock=(server.match(/const TWITCH_OAUTH_SCOPES = Object\.freeze\(\[([\s\S]*?)\]\);/)||[])[1]||'';
for(const scope of ['moderator:read:followers','channel:read:subscriptions','bits:read','user:read:chat','user:bot','channel:bot']){
  assert(scopeBlock.includes(`"${scope}"`),`missing Twitch OAuth scope ${scope}`);
}
assert(!scopeBlock.includes('user:write:chat'),'read-only Twitch chat must not request user:write:chat');

assert(server.includes('{type:"channel.chat.message",version:"1",scopes:["user:read:chat","user:bot","channel:bot"]}'),'channel.chat.message EventSub definition missing');
assert(server.includes('if(type==="channel.chat.message")condition.user_id=id;'),'Twitch chat EventSub condition must bind user_id');
assert(server.includes('type==="channel.chat.message"?"chat"'),'Twitch chat must normalize to chat event_type');
assert(server.includes('event?.chatter_user_name||event?.chatter_user_login'),'Twitch chatter identity normalization missing');
assert(server.includes('source_provider:"twitch"'),'Twitch event provider marker missing');
assert(server.includes('source_event_id:String(event?.message_id||messageId||"")'),'Twitch chat source event id missing');
assert(server.includes('chat_events_implemented:true'),'Twitch runtime must advertise implemented chat events');

assert(server.includes('twitch_chat_overlay: {'),'Twitch chat widget definition missing');
assert(server.includes('required_scopes: ["user:read:chat","user:bot","channel:bot"]'),'Twitch chat widget scope gate missing');
assert(server.includes('source: "Twitch EventSub Chat"'),'Twitch chat widget source missing');
assert(server.includes('studioWidgetRequiredScopes'),'multi-scope widget helper missing');
assert(server.includes('code:"provider_scope_missing"')&&server.includes('required_scopes:missingScopes'),'server-side Twitch widget scope rejection missing');

assert(studio.includes('x==="tiktok"||x==="twitch"')&&studio.includes('x==="obs"'),'Widget Studio area filter must include Twitch');
assert(studio.includes('if(kind==="chat")return["twitch_chat_overlay"]'),'Twitch chat quick start missing');
assert(studio.includes('"twitch_chat_overlay"'),'Twitch chat must be in the Studio catalog/recommendations');
assert(studio.includes('Chat, LIVE-Timer, Follow-, Sub- und Cheer-Widgets'),'Twitch Studio provider guidance must mention chat');

assert(renderer.includes('String(item?.event_type||"")==="chat"'),'shared widget renderer must consume normalized chat events');
assert(renderer.includes('payload?.message'),'shared widget renderer must render chat message payload');
assert(server.includes('async function getRecentCreatorActivityEvents'),'multi-provider activity query missing');
assert(server.includes('getProviderLiveState(creatorId,"twitch")'),'activity query must include Twitch session');
assert(server.includes('events: await getRecentCreatorActivityEvents(req.creatorAccount.id'),'activity API must use multi-provider query');
assert(stream.includes('/api/creator/widget-studio/live/events?limit=50'),'Stream Studio must consume creator activity feed');
assert(streamHtml.includes('creator-isolierte TikTok- und Twitch-LIVE-Events'),'Multi-Chat UI must describe Twitch integration');

assert(integrations.includes('EventSub + Chat sind code-seitig implementiert'),'Integrations page must report code-ready chat without production overclaim');
assert(launcher.includes('Twitch EventSub inklusive Chat ist bereit'),'Launcher Twitch readiness must include chat');
assert(launcher.includes('Twitch Chat, LIVE-Timer, Follows, Subs und Cheers'),'Launcher Twitch widget summary must include chat');

console.log(JSON.stringify({ok:true,version:'v146',backend:pkg.version,launcher:launcherPkg.version,twitch_chat_eventsub:true,twitch_chat_widget:true,multi_chat:true,read_only_scopes:true}));

