import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createFakeBridge } from "./support/fake-bridge.mjs";
const require = createRequire(import.meta.url);
const { BridgeClient } = require("../src/bridge-client.js");
const { EventSpool } = require("../src/event-spool.js");

const sleep = ms => new Promise(r => setTimeout(r,ms));
const logger = {info(){},warn(){},error(){}};
const dir = fs.mkdtempSync(path.join(os.tmpdir(),"cfs-e2e-"));
const spoolPath = path.join(dir,"events.json");

const fake = await createFakeBridge({failEventBatches:2});
try {
  const settings = {backendUrl:fake.url,machineName:"E2E-PC",provider:"mock"};
  const spool = new EventSpool(spoolPath,logger,1000);
  let client = new BridgeClient({settings,token:fake.token,logger,version:"0.13.0",spool});
  client.start();
  await client.connect();
  await client.startSession({provider:"mock"});

  const seed = [
    ["follow",1],["like",25],["gift",3],["share",1],["viewer_update",137]
  ];
  seed.forEach(([type,amount],i) => client.enqueueEvent({
    event_key:`e2e-${type}-${i}`,event_type:type,actor_name:"TestCreator",
    amount,value:type==="gift"?3:0,payload:type==="gift"?{gift_name:"Rose",repeat_count:3}:{}
  }));

  await sleep(900);
  if (spool.all().length === 0 && fake.state.receivedEvents.length !== seed.length) {
    throw new Error("Events disappeared before backend accepted them.");
  }

  // Simulate a controlled launcher restart while the same cloud session is active.
  // First let any currently running HTTP flush settle. This prevents the old
  // process from completing a successful request after the new process has
  // already reloaded the same spool file.
  await client.waitForFlushIdle(2500);
  client.stop();
  client = new BridgeClient({
    settings,token:fake.token,logger,version:"0.13.0",
    spool:new EventSpool(spoolPath,logger,1000)
  });
  client.start();
  await client.connect();
  await client.resumeSession();

  const deadline = Date.now()+5000;
  while (client.eventQueue.length && Date.now()<deadline) {
    await client.flushEvents();
    await sleep(80);
  }
  if (client.eventQueue.length) throw new Error(`Queue not drained: ${client.eventQueue.length}`);
  if (fake.state.receivedEvents.length !== seed.length) throw new Error(`Expected ${seed.length} unique events, got ${fake.state.receivedEvents.length}`);
  if (fake.state.duplicateKeys.length) throw new Error(`Duplicate events received: ${fake.state.duplicateKeys.join(",")}`);

  fake.pushAction({id:"action-1",type:"tts",text:"Danke für deinen Support!"});
  const actions = [];
  client.on("action", a => actions.push(a));
  await client.pollActions();
  if (actions.length !== 1) throw new Error("Action queue poll failed.");
  await client.ackActions([actions[0].id]);
  if (!fake.state.ackedActions.includes("action-1")) throw new Error("Action ACK failed.");

  await client.endSession({reason:"e2e_complete"});
  client.stop();

  console.log(JSON.stringify({
    ok:true,
    events:fake.state.receivedEvents.length,
    batches:fake.state.eventBatchCount,
    sessionStarts:fake.state.startCount,
    sessionEnds:fake.state.endCount,
    duplicateKeys:fake.state.duplicateKeys.length,
    actionAcked:fake.state.ackedActions.length
  }));
} finally {
  await fake.close();
}
