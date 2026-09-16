import fs from "node:fs";import os from "node:os";import path from "node:path";import {createRequire} from "node:module";import {createFakeBridge} from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url),{BridgeClient}=require("../src/bridge-client.js"),{EventSpool}=require("../src/event-spool.js");
const fake=await createFakeBridge(),dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-cut-retry-"));
try{
 const c=new BridgeClient({settings:{backendUrl:fake.url,machineName:"retry-pc",provider:"mock",updateChannel:"beta"},token:fake.token,logger:{info(){},warn(){},error(){}},version:"0.30.0",spool:new EventSpool(path.join(dir,"events.json"),{info(){},warn(){}},100)});
 await c.connect();
 let job=(await c.claimCutJob("job-1")).job;if(job.status!=="claimed")throw new Error("claim");
 job=(await c.failCutJob("job-1","render failed")).job;if(job.status!=="failed")throw new Error("fail");
 job=(await c.retryCutJob("job-1")).job;if(job.status!=="queued"||job.error_message)throw new Error("retry");
 job=(await c.claimCutJob("job-1")).job;if(job.attempts!==2)throw new Error("retry attempt count");
 console.log(JSON.stringify({ok:true,status:job.status,attempts:job.attempts,retry:true}));
}finally{await fake.close()}
