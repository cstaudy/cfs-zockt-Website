import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createFakeBridge } from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url);
const { BridgeClient }=require("../src/bridge-client.js");
const { EventSpool }=require("../src/event-spool.js");

const logger={info(){},warn(){},error(){}};
const fake=await createFakeBridge({failEventBatches:1});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-shutdown-"));
try{
  const spool=new EventSpool(path.join(dir,"events.json"),logger,1000);
  const client=new BridgeClient({
    settings:{backendUrl:fake.url,machineName:"shutdown-test",provider:"mock"},
    token:fake.token,logger,version:"0.15.0",spool
  });
  client.running=true;
  await client.connect();
  await client.startSession({provider:"mock"});
  for(let i=0;i<17;i++)client.enqueueEvent({event_key:`shutdown-${i}`,event_type:"like",amount:1,payload:{}});
  const drain=await client.drainEvents(5000);
  if(!drain.ok||drain.remaining!==0)throw new Error(`Drain failed: ${JSON.stringify(drain)}`);
  if(fake.state.receivedEvents.length!==17)throw new Error(`Expected 17 events, got ${fake.state.receivedEvents.length}`);
  if(spool.all().length!==0)throw new Error("Persistent spool not empty after successful drain");
  console.log(JSON.stringify({ok:true,drain,batches:fake.state.eventBatchCount}));
}finally{await fake.close()}
