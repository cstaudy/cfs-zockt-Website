import {createRequire} from "node:module";const require=createRequire(import.meta.url);const {runPreflight}=require("../src/preflight.js");
const base={settings:{backendUrl:"https://example.test",tokenStored:true,provider:"mock"},bridge:{connected:true},provider:{},encryptionAvailable:true,spool:{persistent:true,pending:0,dropped:0},releasePolicy:null};
const free=runPreflight({...base,creatorFeatures:{live_bridge:false}}),creator=runPreflight({...base,creatorFeatures:{live_bridge:true}});
if(free.ok||!free.blockers.some(x=>x.key==="creator_live_access"))throw new Error("FREE live should block");
if(!creator.ok)throw new Error("CREATOR live should pass");
console.log(JSON.stringify({ok:true,free_blocked:true,creator_pass:true}));
