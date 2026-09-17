import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(process.argv[2] || '.');
const req = createRequire(import.meta.url);
const checks=[];
const check=(name,ok)=>{checks.push({name,ok:Boolean(ok)}); console.log(`${ok?'PASS':'FAIL'}  ${name}`)};
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const normalizerPath=path.join(root,'launcher/src/provider-event-normalizer.js');
check('Provider event normalizer exists',fs.existsSync(normalizerPath));
const {normalizeProviderEvent,sanitizePayload,sourceProviderForAdapter}=req(normalizerPath);

check('TikTool maps to TikTok',sourceProviderForAdapter('tiktool')==='tiktok');
check('Mock maps to simulator',sourceProviderForAdapter('mock')==='simulator');
check('Unknown adapter fails closed to bridge',sourceProviderForAdapter('something')==='launcher_bridge');

const chat=normalizeProviderEvent('tiktool',{event_type:'chat',event_key:'evt-1',actor_name:' Test\nUser ',payload:{message:'Hallo\nWelt',source_channel:'room-1',evil:'drop-me'}});
check('Chat normalized to TikTok',chat.payload.source_provider==='tiktok');
check('Chat line breaks sanitized',chat.payload.message==='Hallo Welt');
check('Actor sanitized',chat.actor_name==='Test User');
check('Unknown payload field dropped',!('evil' in chat.payload));
check('Source channel kept',chat.payload.source_channel==='room-1');

const gift=sanitizePayload({giftName:'Rose',giftId:'1',repeatCount:3,provider_value_unit:'diamonds',secret:'nope'},'tiktok');
check('Gift name normalized',gift.gift_name==='Rose');
check('Gift repeat normalized',gift.repeat_count===3);
check('Gift value unit allowlisted',gift.provider_value_unit==='diamonds');
check('Sensitive arbitrary field dropped',!('secret' in gift));

let rejected=false;
try{normalizeProviderEvent('twitch',{event_type:'arbitrary'});}catch{rejected=true;}
check('Unknown event types rejected',rejected);

const manager=read('launcher/src/provider-manager.js');
check('Provider manager uses normalizer',manager.includes('normalizeProviderEvent'));
check('Adapter catalog declares TikTok',manager.includes('sourceProvider:"tiktok"'));
check('Adapter catalog declares Twitch future adapter',manager.includes('key:"twitch"'));
check('Adapter catalog marks unimplemented adapters',manager.includes('implemented:false'));
check('Provider state exposes source_provider',manager.includes('source_provider:sourceProviderForAdapter'));

const bridge=read('launcher/src/bridge-client.js');
check('Bridge sanitizes payload before queue',bridge.includes('sanitizePayload(event.payload'));
check('Bridge event type allowlist remains',bridge.includes('"viewer_update", "chat"'));

const server=read('server.js');
check('Server bridge payload sanitizer exists',server.includes('function sanitizeStudioBridgeEventPayload'));
check('Server event source provider allowlist exists',server.includes('STREAM_STUDIO_EVENT_SOURCE_PROVIDERS'));
check('Server stores sanitized event payload',server.includes('const payload = sanitizeStudioBridgeEventPayload(input.payload)'));
check('Public feed exposes source channel',server.includes('source_channel: studioText'));
check('Public feed exposes source event id',server.includes('source_event_id: studioText'));

const studio=read('public/pages/stream-studio.html');
check('Multi Chat panel exists',studio.includes('MULTI-CHAT & ACTIVITY'));
check('TikTok provider filter exists',studio.includes('value="tiktok"'));
check('Twitch provider filter exists',studio.includes('value="twitch"'));
check('YouTube provider filter exists',studio.includes('value="youtube"'));
check('Kick provider filter exists',studio.includes('value="kick"'));

const failed=checks.filter(x=>!x.ok);
console.log(`\nProvider Adapters Pass 21.10.6: ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length) process.exit(1);
