import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createFakeBridge } from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url);
const {BridgeClient}=require("../src/bridge-client.js");
const {EventSpool}=require("../src/event-spool.js");

const fake=await createFakeBridge();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-creator-profile-"));
try{
  fake.state.creator={
    display_name:"Account Name",plan:"pro",status:"active",
    profile:{connected:true,display_name:"Devrimex",avatar_url:"https://example.test/a.jpg",followers:156,likes_total:5000,updated_at:new Date().toISOString()},
    features:{widget_studio:true,launcher:true,games:true,cut_studio:true}
  };
  const client=new BridgeClient({
    settings:{backendUrl:fake.url,machineName:"creator-pc",provider:"mock",updateChannel:"stable"},
    token:fake.token,logger:{info(){},warn(){},error(){}},version:"0.19.0",
    spool:new EventSpool(path.join(dir,"events.json"),{info(){},warn(){}},100)
  });
  await client.connect();
  const creator=client.snapshot().creator;
  if(creator?.profile?.followers!==156||creator?.profile?.likes_total!==5000)throw new Error("Creator profile did not reach launcher");
  if(creator?.profile?.display_name!=="Devrimex"||creator?.plan!=="pro")throw new Error("Creator personalization failed");
  console.log(JSON.stringify({ok:true,name:creator.profile.display_name,followers:creator.profile.followers,likes:creator.profile.likes_total,plan:creator.plan}));
}finally{await fake.close()}
