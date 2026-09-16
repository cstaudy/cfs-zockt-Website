import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createFakeBridge } from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url);
const {BridgeClient}=require("../src/bridge-client.js");
const {EventSpool}=require("../src/event-spool.js");
const fake=await createFakeBridge();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-resume-"));
try{
  const id="11111111-1111-4111-8111-111111111111";
  fake.state.session={connected:false,session_id:id,likes:77,viewers:9,provider:"launcher_bridge",started_at:new Date().toISOString()};
  const client=new BridgeClient({settings:{backendUrl:fake.url,machineName:"pc",provider:"mock",updateChannel:"stable"},token:fake.token,logger:{info(){},warn(){},error(){}},version:"0.22.0",spool:new EventSpool(path.join(dir,"events.json"),{info(){},warn(){}},100)});
  client.start({deferHeartbeat:true});
  if(fake.state.heartbeatCount!==0)throw new Error("heartbeat happened before recovery probe");
  const probe=await client.resumeSession(id,{dryRun:true});
  if(!probe.allowed||client.liveActive)throw new Error("dry-run resume state wrong");
  if(fake.state.heartbeatCount!==0)throw new Error("recovery probe mutated heartbeat");
  const commit=await client.resumeSession(id,{dryRun:false});
  if(!commit.recovered||!client.liveActive||client.snapshot().live.likes!==77)throw new Error("resume commit failed");
  client.enableHeartbeat();
  await new Promise(r=>setTimeout(r,60));
  if(fake.state.heartbeatCount<1)throw new Error("heartbeat was not enabled after recovery");
  client.stop();
  console.log(JSON.stringify({ok:true,probe:fake.state.resumeProbeCount,commit:fake.state.resumeCommitCount,likes:client.snapshot().live.likes}));
}finally{await fake.close()}
