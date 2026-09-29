import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { BridgeClient }=require('../src/bridge-client.js');

let heartbeatCount=0;
let presencePayload=null;
const server=http.createServer(async(req,res)=>{
  let body=''; for await (const c of req) body+=c;
  const json=body?JSON.parse(body):{};
  res.setHeader('Content-Type','application/json');
  if(req.headers.authorization!=='Bearer test-token'){res.statusCode=401;return res.end(JSON.stringify({ok:false,error:'auth'}));}
  if(req.url==='/api/bridge/widget-studio/heartbeat'){
    heartbeatCount+=1;
    return res.end(JSON.stringify({
      ok:true,
      bridge:{online:true,connection_state:'online'},
      live:{connected:false},
      heartbeat_after_ms:12000,
      heartbeat_grace_ms:90000,
      protocol:1
    }));
  }
  if(req.url==='/api/bridge/community/game-activity/state'){
    presencePayload=json;
    return res.end(JSON.stringify({ok:true,accepted:true,presence:json}));
  }
  res.statusCode=404; return res.end(JSON.stringify({ok:false,error:'not found'}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const client=new BridgeClient({settings:{backendUrl:`http://127.0.0.1:${port}`,machineName:'QA-PC'},token:'test-token',logger:{warn(){},info(){}},version:'0.47.17'});
await client.heartbeat();
assert.equal(heartbeatCount,1);
assert.equal(client.snapshot().connectionState,'online');
assert.equal(client.snapshot().heartbeat.after_ms,12000);
assert.equal(client.snapshot().heartbeat.grace_ms,90000);
assert.equal(client.capabilities.game_activity_presence_v1,true);
await client.publishGameActivityState({active:true,game_name:'Test Game',source:'launcher_manual',platform:'pc',state_changed_at:new Date().toISOString(),transition_id:'cfsgp_0123456789abcdef0123456789abcdef'});
assert.equal(presencePayload?.game_name,'Test Game');
client.lastSuccessfulHeartbeatMs=Date.now();
client.markOffline(new Error('temporary network issue'));
assert.equal(client.snapshot().connected,true);
assert.equal(client.snapshot().connectionState,'degraded');
client.lastSuccessfulHeartbeatMs=Date.now()-120000;
client.markOffline(new Error('network down'));
assert.equal(client.snapshot().connected,false);
assert.equal(client.snapshot().connectionState,'offline');
server.close();
console.log('bridge resilience v135: 10/10');
