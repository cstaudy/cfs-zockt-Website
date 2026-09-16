import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { runPreflight } = require("../src/preflight.js");

const ready = runPreflight({
  settings:{backendUrl:"https://cfs-zockt.de",tokenStored:true,provider:"mock"},
  bridge:{connected:true,latencyMs:42},
  provider:{key:"mock",ready:true},
  encryptionAvailable:true,
  spool:{persistent:true,pending:2,dropped:0}
});
if (!ready.ok) throw new Error("Ready preflight unexpectedly failed");

const broken = runPreflight({
  settings:{backendUrl:"http://example.com",tokenStored:false,provider:"tiktool",tiktokUsername:"",tiktoolKeyStored:false},
  bridge:{connected:false,lastError:"offline"},
  encryptionAvailable:false,
  spool:{persistent:false}
});
if (broken.ok || broken.blockers.length < 5) throw new Error("Broken preflight unexpectedly passed");

console.log("Preflight test passed.");
