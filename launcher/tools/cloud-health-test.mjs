import http from "node:http";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {checkCloudHealth,creatorReady}=require("../src/cloud-health.js");

const server=http.createServer((_req,res)=>{
  res.writeHead(200,{"content-type":"application/json"});
  res.end(JSON.stringify({ok:true,status:"online",database:"connected",version:"16",service:"CFS",modules:{widget_studio:"online",launcher:"online"}}));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try{
  const health=await checkCloudHealth(`http://127.0.0.1:${server.address().port}`);
  if(!health.ok||!health.database)throw new Error("Healthcheck failed");
  const ready=creatorReady({
    settings:{setupVersion:1,tokenStored:true,provider:"mock"},
    health,
    preflight:{checks:[{key:"simulator",ok:true}]},
    bridge:{connected:true,latencyMs:4},
    spool:{persistent:true,pending:0},
    encryptionAvailable:true
  });
  if(!ready.ready||ready.score!==100)throw new Error(`Creator Ready failed: ${JSON.stringify(ready)}`);
  console.log(JSON.stringify({ok:true,latency:health.latencyMs,score:ready.score}));
}finally{await new Promise(resolve=>server.close(resolve))}
