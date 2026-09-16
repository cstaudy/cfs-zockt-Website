import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createFakeBridge } from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url);
const {BridgeClient}=require("../src/bridge-client.js");
const {EventSpool}=require("../src/event-spool.js");

const fake=await createFakeBridge();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-policy-client-"));
try{
 fake.state.releasePolicy={
  channel:"stable",current_version:"0.18.0",minimum_version:"0.15.0",
  recommended_version:"0.18.0",target_version:"0.18.0",build_target_version:"0.18.0",
  compatible:true,update_required:false,update_available:false,rollback_recommended:false,
  version_blocked:false,live_allowed:true,status:"compatible",action:"none",
  rollout:{percent:25,bucket:12,eligible:true,target_version:"0.18.0",assigned_version:"0.18.0",stage:"staged"},
  safety:{revision:"v18-test",maintenance:{active:false,message:""},blocked_current_version:false,pin:{version:"",missing:false}}
 };
 const client=new BridgeClient({
  settings:{backendUrl:fake.url,machineName:"policy-pc",provider:"mock",updateChannel:"stable"},
  token:fake.token,logger:{info(){},warn(){},error(){}},version:"0.18.0",
  spool:new EventSpool(path.join(dir,"events.json"),{info(){},warn(){}},100)
 });
 await client.connect();
 const snap=client.snapshot();
 if(!snap.releasePolicy?.compatible||!snap.releasePolicy.live_allowed)throw new Error("Safety policy not stored");
 if(snap.releasePolicy.rollout?.percent!==25)throw new Error("Rollout not stored");
 const payload=client.heartbeatPayload();
 if(payload.update_channel!=="stable")throw new Error("Update channel missing");
 console.log(JSON.stringify({ok:true,status:snap.releasePolicy.status,rollout:snap.releasePolicy.rollout.percent,live:snap.releasePolicy.live_allowed}));
}finally{await fake.close()}
