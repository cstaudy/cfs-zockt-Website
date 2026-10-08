import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(process.argv[2]||'.');
const require=createRequire(import.meta.url);
const {publicProviderLiveState,widgetEventReadAllowed,LIVE_PROVIDER_FRESHNESS_MS}=require(path.join(root,'lib/widget-provider-live-policy.js'));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const server=read('server.js');
const launcherNormalizer=require(path.join(root,'launcher/src/provider-event-normalizer.js'));
const renderer=require(path.join(root,'public/assets/js/cfs-widget-renderer.js'));
let count=0;
function check(name,fn){fn();console.log('PASS '+name);count++}
const NOW=1_800_000_000_000;
const iso=ms=>new Date(ms).toISOString();
const row={connected:true,session_id:'twitch:123',started_at:iso(NOW-360000),updated_at:iso(NOW-5000)};
check('Fresh Twitch connection is live',()=>assert.equal(publicProviderLiveState('twitch',row,NOW).connected,true));
check('Twitch times out after reconcile grace',()=>{
  const live=publicProviderLiveState('twitch',{...row,updated_at:iso(NOW-LIVE_PROVIDER_FRESHNESS_MS.twitch-1)},NOW);
  assert.equal(live.connected,false);assert.equal(live.stale,true);assert.equal(live.session_id,'twitch:123');
});
check('YouTube has its own shorter freshness bound',()=>assert.ok(LIVE_PROVIDER_FRESHNESS_MS.youtube<LIVE_PROVIDER_FRESHNESS_MS.twitch));
check('Stale YouTube reports offline',()=>assert.deepEqual(
  [publicProviderLiveState('youtube',{...row,updated_at:iso(NOW-LIVE_PROVIDER_FRESHNESS_MS.youtube+1)},NOW).connected,
   publicProviderLiveState('youtube',{...row,updated_at:iso(NOW-LIVE_PROVIDER_FRESHNESS_MS.youtube-1)},NOW).connected],
  [true,false]));
check('No provider state is offline and stale',()=>{const x=publicProviderLiveState('twitch',null,NOW);assert.equal(x.connected,false);assert.equal(x.stale,true);assert.equal(x.session_id,null)});
check('Explicit offline retains previous session for hold',()=>{const x=publicProviderLiveState('twitch',{...row,connected:false},NOW);assert.equal(x.connected,false);assert.equal(x.session_id,'twitch:123');assert.equal(x.stale,false)});
check('Future timestamps fail closed',()=>assert.equal(publicProviderLiveState('youtube',{...row,updated_at:iso(NOW+120000)},NOW).connected,false));
check('Bad timestamps fail closed',()=>assert.equal(publicProviderLiveState('twitch',{...row,updated_at:'nonsense'},NOW).stale,true));
const alert={event_type:'follow',source_kind:'live_provider',mode:'alert'};
const chat={event_type:'chat',source_kind:'live_provider',mode:'chat'};
const latest={event_type:'follow',source_kind:'live_provider',mode:'latest'};
const live={connected:true,stale:false,session_id:'twitch:123'};
check('Online alerts and chat have session data',()=>{assert.equal(widgetEventReadAllowed(alert,live),true);assert.equal(widgetEventReadAllowed(chat,live),true)});
check('Missing session never reads historical events',()=>assert.equal(widgetEventReadAllowed(alert,{...live,session_id:null}),false));
check('Offline alerts and chat do not replay',()=>{assert.equal(widgetEventReadAllowed(alert,{...live,connected:false}),false);assert.equal(widgetEventReadAllowed(chat,{...live,connected:false}),false)});
check('Stale alerts cannot replay',()=>assert.equal(widgetEventReadAllowed(alert,{...live,stale:true}),false));
check('Latest widget can hold last observed event offline',()=>assert.equal(widgetEventReadAllowed(latest,{...live,connected:false}),true));
check('Latest widget never reads across missing session',()=>assert.equal(widgetEventReadAllowed(latest,{...live,session_id:null}),false));
check('TikTok Bridge events follow same offline contract',()=>assert.equal(widgetEventReadAllowed({...alert,source_kind:'live_bridge'},live),true));
check('Manual/static sources cannot consume provider events',()=>assert.equal(widgetEventReadAllowed({...alert,source_kind:'manual'},live),false));
check('Twitch and YouTube events remain separate at query',()=>{assert.ok(server.includes('AND provider = $${params.length}'));assert.ok(server.includes('AND session_id = $${params.length}'))});
check('Server refuses unscoped event read',()=>assert.match(server,/if\(!resolvedSessionId\)return\[\];/));
check('Public OBS widget endpoint applies live policy',()=>assert.ok(server.includes('eventType && widgetEventReadAllowed(definition, publicSnapshot.live)')));
check('Provider state is computed by shared policy',()=>assert.ok(server.includes('return publicProviderLiveState(key,row);')));
check('Live mock events are not accepted into bridge metrics',()=>{assert.ok(server.includes('reason:"simulator_not_live"'));assert.ok(server.indexOf('reason:"simulator_not_live"')<server.indexOf('const freshness = bridgeEventFreshness(event, nowMs);'))});
check('Mock adapter marks its event source as simulator',()=>assert.equal(launcherNormalizer.normalizeProviderEvent('mock',{event_type:'follow',event_key:'test'}).payload.source_provider,'simulator'));
check('TikTool adapter marks its source as TikTok',()=>assert.equal(launcherNormalizer.normalizeProviderEvent('tiktool',{event_type:'gift',event_key:'real',amount:2}).payload.source_provider,'tiktok'));
check('Twitch EventSub definitions and scoped event queue wired',()=>{for(const name of ['channel.follow','channel.subscribe','channel.subscription.message','channel.subscription.gift','channel.cheer','channel.chat.message','stream.online','stream.offline'])assert.ok(server.includes(`{type:"${name}"`));assert.ok(server.includes('insertTwitchRuntimeEvent(creatorId,eventType,event,messageId)'))});
check('YouTube polling supports nextPageToken and official polling interval',()=>assert.ok(server.includes('data?.nextPageToken')&&server.includes('data?.pollingIntervalMillis')&&server.includes('insertYouTubeRuntimeEvent(creatorId,item)')));
check('TikTok Bridge event flow unchanged for authenticated live events',()=>assert.ok(server.includes('applyStudioLiveEvent(creatorId, event || {}, "launcher_bridge")')&&server.includes('requireStudioBridge')));
check('Twitch Follow/Bits widgets use own source metrics',()=>{
  for(const [key,metric,mode] of [
    ['twitch_follow_session_counter','twitch.followers_gained','counter'],
    ['twitch_follow_session_goal','twitch.followers_gained','goal'],
    ['twitch_bits_session_counter','twitch.bits','counter'],
    ['twitch_bits_session_goal','twitch.bits','goal']
  ]){
    const segment=server.split(`    ${key}: {`)[1]?.split('    },')[0];
    assert.ok(segment,`${key} absent`);
    assert.ok(segment.includes(`metric: "${metric}"`));
    assert.ok(segment.includes(`mode: "${mode}"`));
    assert.ok(segment.includes('source_kind: "live_provider"'));
    assert.ok(segment.includes('provider: "twitch"'));
  }
});
check('Twitch aggregation uses only creator and current session',()=>{
  const segment=server.split('async function getTwitchSessionMetrics(')[1]?.split('async function studioDataSnapshot(')[0];
  assert.ok(segment);
  assert.match(segment,/WHERE creator_id=\$1 AND provider='twitch' AND session_id=\$2/);
  assert.ok(segment.includes("event_type='follow'"));
  assert.ok(segment.includes("event_type='cheer'"));
  assert.ok(segment.includes('if(!sessionId)return {followers_gained:0,bits:0}'));
});
check('Twitch widget snapshot receives real session aggregates',()=>assert.ok(server.includes('const twitch=await getTwitchSessionMetrics(creatorId,live.session_id);')));
check('No invented Twitch follower profile totals',()=>assert.ok(server.includes('followers:0,')&&server.includes('twitch.followers_gained')));
check('Renderer reads Twitch Follow live metric',()=>{
  const data=renderer.runtimeData({widget:{definition:{mode:'counter',source_kind:'live_provider',metric:'twitch.followers_gained'},config:{data:{metric:'twitch.followers_gained'},settings:{offlineBehavior:'hold'}}},data:{profile:{},bridge:{},live:{connected:true,stale:false,provider:'twitch'},twitch:{followers_gained:7,bits:1500}}});
  assert.equal(data.current,7);
});
check('Renderer reads Twitch Bits live metric',()=>{
  const data=renderer.runtimeData({widget:{definition:{mode:'goal',source_kind:'live_provider',metric:'twitch.bits'},config:{data:{metric:'twitch.bits'},settings:{goal:2000,offlineBehavior:'hold'}}},data:{profile:{},bridge:{},live:{connected:true,stale:false,provider:'twitch'},twitch:{followers_gained:7,bits:1500}}});
  assert.equal(data.current,1500);assert.equal(data.goal,2000);
});
check('Twitch metric labels are explicit in editor',()=>{
  const studio=read('public/assets/js/widget-studio.js');
  assert.ok(studio.includes('"twitch.followers_gained":"Twitch Follows (Session)"'));
  assert.ok(studio.includes('"twitch.bits":"Twitch Bits (Session)"'));
});
check('No migration required',()=>assert.ok(!read('lib/widget-provider-live-policy.js').includes('ALTER TABLE')));
console.log(`\nProvider Live Bindings v3.20.60: ${count}/${count} PASS`);
