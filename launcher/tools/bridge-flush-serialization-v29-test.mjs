import fs from "node:fs";import os from "node:os";import path from "node:path";import {createRequire} from "node:module";import {createFakeBridge} from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url),{BridgeClient}=require("../src/bridge-client.js"),{EventSpool}=require("../src/event-spool.js");
const fake=await createFakeBridge({latencyMs:120}),dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-flush-v29-"));
try{
 const c=new BridgeClient({settings:{backendUrl:fake.url,machineName:"flush-pc",provider:"mock"},token:fake.token,logger:{info(){},warn(){},error(){}},version:"0.29.0",spool:new EventSpool(path.join(dir,"events.json"),{info(){},warn(){}},100)});
 c.start();await c.connect();await c.startSession({provider:"mock"});
 for(let i=0;i<5;i++)c.enqueueEvent({event_key:`serial-${i}`,event_type:i%2?"like":"follow",amount:i+1});
 await Promise.all([c.flushEvents(),c.flushEvents(),c.flushEvents()]);
 if(fake.state.eventBatchCount!==1)throw new Error(`expected 1 batch, got ${fake.state.eventBatchCount}`);
 if(fake.state.duplicateKeys.length)throw new Error("duplicate backend delivery");
 if(c.eventQueue.length!==0)throw new Error("queue not drained");
 c.stop();
 console.log(JSON.stringify({ok:true,batches:fake.state.eventBatchCount,duplicates:0,queue:0}));
}finally{await fake.close()}