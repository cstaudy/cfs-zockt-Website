import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {BridgeClient}=require('../src/bridge-client.js');

let live=false;
let events=[];
let acked=[];
const actions=[{id:'11111111-1111-4111-8111-111111111111',action_type:'launcher_tts',action_text:'Danke Test'}];
const server=http.createServer(async(req,res)=>{
  let body='';for await(const c of req)body+=c;
  const json=body?JSON.parse(body):{};
  res.setHeader('Content-Type','application/json');
  if(req.headers.authorization!=='Bearer cfsb_test_token_abcdefghijklmnopqrstuvwxyz'){res.statusCode=401;return res.end(JSON.stringify({ok:false,error:'auth'}));}
  if(req.url==='/api/bridge/widget-studio/status')return res.end(JSON.stringify({ok:true,bridge:{online:true},live:{connected:live,session_id:live?'s1':null}}));
  if(req.url==='/api/bridge/widget-studio/heartbeat')return res.end(JSON.stringify({ok:true,bridge:{online:true},live:{connected:live,session_id:live?'s1':null}}));
  if(req.url==='/api/bridge/widget-studio/session/start'){live=true;return res.end(JSON.stringify({ok:true,live:{connected:true,session_id:'s1'},session_id:'s1'}));}
  if(req.url==='/api/bridge/widget-studio/session/end'){live=false;return res.end(JSON.stringify({ok:true,live:{connected:false,session_id:null}}));}
  if(req.url==='/api/bridge/widget-studio/events'){events.push(...(json.events||[]));return res.end(JSON.stringify({ok:true,accepted:(json.events||[]).length,live:{connected:true,session_id:'s1'},bridge:{online:true}}));}
  if(req.url?.startsWith('/api/bridge/widget-studio/actions?'))return res.end(JSON.stringify({ok:true,actions}));
  if(req.url==='/api/bridge/widget-studio/actions/ack'){acked.push(...(json.ids||[]));return res.end(JSON.stringify({ok:true,acked:(json.ids||[]).length}));}
  res.statusCode=404;res.end(JSON.stringify({ok:false,error:'not found'}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const logger={warn(){},info(){},error(){}};
const client=new BridgeClient({settings:{backendUrl:`http://127.0.0.1:${port}`,machineName:'QA-PC',provider:'mock'},token:'cfsb_test_token_abcdefghijklmnopqrstuvwxyz',logger,version:'0.9.0'});
await client.connect();
assert.equal(client.snapshot().connected,true);
await client.startSession();
assert.equal(client.liveActive,true);
client.running=true;
client.enqueueEvent({event_type:'follow',actor_name:'QA',amount:1});
await client.flushEvents();
assert.equal(events.length,1);
let actionSeen=null;client.once('action',a=>actionSeen=a);
await client.pollActions();assert.equal(actionSeen?.action_text,'Danke Test');
await client.ackActions([actions[0].id]);assert.deepEqual(acked,[actions[0].id]);
await client.endSession();assert.equal(client.liveActive,false);
client.stop();server.close();
console.log('BridgeClient integration test passed.');
