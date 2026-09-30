import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root=process.cwd();
const require=createRequire(import.meta.url);
const { buildCreatorTechnicalState }=require(path.join(root,'lib/creator-state-snapshot.js'));
const { BridgeClient }=require(path.join(root,'launcher/src/bridge-client.js'));
const serverSource=fs.readFileSync(path.join(root,'server.js'),'utf8');
const launcherPkg=JSON.parse(fs.readFileSync(path.join(root,'launcher/package.json'),'utf8'));

const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};

check('launcher baseline version >= 0.47.17',()=>{const p=String(launcherPkg.version).split('.').map(Number);assert.ok(p[0]>0||p[1]>47||(p[1]===47&&p[2]>=17));});
check('server protocol v3',()=>assert.match(serverSource,/protocol:\s*3/));
check('server replay nonce table',()=>assert.match(serverSource,/creator_bridge_request_nonces/));
check('server HMAC verification',()=>assert.match(serverSource,/createHmac\("sha256", String\(rawToken\)\)/));
check('server timestamp skew guard',()=>assert.match(serverSource,/BRIDGE_SIGNED_REQUEST_MAX_SKEW_MS/));
check('security readiness route',()=>assert.match(serverSource,/\/api\/creator\/security-readiness/));

const requests=[];
const server=http.createServer(async(req,res)=>{
  let raw='';
  for await (const chunk of req) raw+=chunk;
  requests.push({method:req.method,url:req.url,headers:req.headers,raw});
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({ok:true,protocol:3,security:{signed_requests:true,replay_guard:true},bridge:{},live:{},creator:{},heartbeat_after_ms:10000,heartbeat_grace_ms:90000}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const token='cfsb_test_token_for_v137_signing_0123456789';
const client=new BridgeClient({settings:{backendUrl:`http://127.0.0.1:${port}`,machineName:'QA-PC'},token,logger:{warn(){},info(){}},version:'0.47.17'});
await client.heartbeat();
await client.status();
server.close();

const post=requests.find(r=>r.method==='POST');
check('launcher signs mutating request',()=>{
  assert.ok(post);
  assert.equal(post.headers['x-cfs-bridge-protocol'],'3');
  assert.ok(post.headers['x-cfs-timestamp']);
  assert.ok(post.headers['x-cfs-nonce']);
  assert.match(String(post.headers['x-cfs-signature']||''),/^v1=/);
});
check('launcher signature verifies',()=>{
  const timestamp=String(post.headers['x-cfs-timestamp']);
  const nonce=String(post.headers['x-cfs-nonce']);
  const bodyHash=crypto.createHash('sha256').update(post.raw).digest('hex');
  const canonical=['POST',post.url,timestamp,nonce,bodyHash].join('\n');
  const expected=crypto.createHmac('sha256',token).update(canonical).digest('base64url');
  assert.equal(post.headers['x-cfs-signature'],`v1=${expected}`);
});
const get=requests.find(r=>r.method==='GET');
check('GET remains bearer-only',()=>{
  assert.ok(get);
  assert.equal(get.headers['x-cfs-signature'],undefined);
});

const technical=buildCreatorTechnicalState({
  database:{ok:true},website:{ok:true,status:'online'},tiktok:{connected:true},
  launcher:{configured:true,online:true,connection_state:'online',protocol:3},live:{status:'live'},game:{active:true},playstation:{available:true},discord:{available:true},
  security:{ready:true,passed:12,total:12,launcher_signed_requests:true,launcher_replay_guard:true,widget_conflict_guard:true,detail:'OK'}
});
check('technical state exposes security component',()=>{
  assert.equal(technical.components.security.ready,true);
  assert.equal(technical.components.security.launcher_signed_requests,true);
  assert.equal(technical.components.security.launcher_replay_guard,true);
});

console.log(`SECURITY RELEASE v137: ${checks.length}/${checks.length} PASS`);
for(const name of checks) console.log(`✓ ${name}`);
