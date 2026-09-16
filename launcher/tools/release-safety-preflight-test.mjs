import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {runPreflight}=require("../src/preflight.js");

const base={
 settings:{backendUrl:"https://cfs-zockt.de",tokenStored:true,provider:"mock"},
 bridge:{connected:true,latencyMs:20},
 provider:{key:"mock",ready:true},
 encryptionAvailable:true,
 spool:{persistent:true,pending:0}
};

const safe=runPreflight({...base,releasePolicy:{live_allowed:true,update_required:false,version_blocked:false,safety:{maintenance:{active:false}}}});
if(!safe.ok)throw new Error("Safe policy blocked");

const blocked=runPreflight({...base,releasePolicy:{live_allowed:false,update_required:true,version_blocked:true,message:"Version gesperrt",safety:{maintenance:{active:false}}}});
if(blocked.ok||!blocked.blockers.some(x=>x.key==="release_policy"))throw new Error("Blocked version did not block");

const maintenance=runPreflight({...base,releasePolicy:{live_allowed:false,update_required:false,version_blocked:false,safety:{maintenance:{active:true,message:"Wartung"}}}});
if(maintenance.ok||!maintenance.blockers.some(x=>x.key==="release_policy"))throw new Error("Maintenance did not block");

console.log(JSON.stringify({ok:true,safe:safe.ok,blocked:blocked.ok,maintenance:maintenance.ok}));
