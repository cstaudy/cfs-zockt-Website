import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createFakeBridge } from "./support/fake-bridge.mjs";
const require = createRequire(import.meta.url);
const { BridgeClient } = require("../src/bridge-client.js");
const { EventSpool } = require("../src/event-spool.js");

const logger={info(){},warn(){},error(){}};
const fake=await createFakeBridge();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-stress-"));
try{
  const settings={backendUrl:fake.url,machineName:"STRESS-PC",provider:"mock"};
  const spool=new EventSpool(path.join(dir,"events.json"),logger,1000);
  const client=new BridgeClient({settings,token:fake.token,logger,version:"0.13.0",spool});
  client.running=true;
  await client.connect();
  await client.startSession({provider:"mock"});

  const types=["follow","like","gift","share","viewer_update"];
  const TOTAL=900;
  const started=Date.now();
  for(let i=0;i<TOTAL;i++){
    const type=types[i%types.length];
    client.enqueueEvent({
      event_key:`stress-${i}`,
      event_type:type,
      actor_name:`user_${i%75}`,
      amount:type==="like"?(i%25)+1:type==="viewer_update"?50+(i%300):1,
      value:type==="gift"?(i%10)+1:0,
      payload:type==="gift"?{gift_name:"Rose",repeat_count:1}:{}
    });
  }
  if(client.eventQueue.length!==TOTAL)throw new Error(`Enqueue mismatch ${client.eventQueue.length}/${TOTAL}`);

  const deadline=Date.now()+15000;
  while(client.eventQueue.length&&Date.now()<deadline){
    await client.flushEvents();
  }
  const elapsed=Date.now()-started;
  if(client.eventQueue.length)throw new Error(`Stress queue not drained: ${client.eventQueue.length}`);
  if(fake.state.receivedEvents.length!==TOTAL)throw new Error(`Backend unique events ${fake.state.receivedEvents.length}/${TOTAL}`);
  if(fake.state.duplicateKeys.length)throw new Error(`Backend saw ${fake.state.duplicateKeys.length} duplicates`);
  if(spool.snapshot().dropped!==0)throw new Error(`Spool dropped ${spool.snapshot().dropped} events`);

  const counts=Object.fromEntries(types.map(t=>[t,fake.state.receivedEvents.filter(e=>e.event_type===t).length]));
  console.log(JSON.stringify({ok:true,total:TOTAL,batches:fake.state.eventBatchCount,elapsed_ms:elapsed,counts,metrics:client.snapshot().metrics}));
}finally{await fake.close()}
