import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createFakeBridge } from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url);
const {BridgeClient}=require("../src/bridge-client.js");
const {EventSpool}=require("../src/event-spool.js");
const fake=await createFakeBridge();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-action-client-"));
try{
  const client=new BridgeClient({settings:{backendUrl:fake.url,machineName:"pc",provider:"mock"},token:fake.token,logger:{info(){},warn(){},error(){}},version:"0.22.0",spool:new EventSpool(path.join(dir,"events.json"),{info(){},warn(){}},100)});
  const id="11111111-1111-4111-8111-111111111111";
  await client.nackActions([id],"speech_error");
  if(fake.state.nackedActions.length!==1||fake.state.nackedActions[0].error!=="speech_error")throw new Error("NACK not delivered");
  await client.ackActions([id]);
  if(fake.state.ackedActions.length!==1)throw new Error("ACK not delivered");
  if(client.metrics.actionsNacked!==1||client.metrics.actionsAcked!==1)throw new Error("action metrics wrong");
  console.log(JSON.stringify({ok:true,nacked:1,acked:1}));
}finally{await fake.close()}
