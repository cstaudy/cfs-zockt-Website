import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url); const root=path.resolve(process.argv[2]||".");
const lib=require(path.join(root,"lib/rc-freeze-v195.js")); const result=lib.secretScan(root);
for(const issue of result.issues) console.log(`FAIL ${issue}`);
console.log(`${result.ok?"PASS":"FAIL"} RC Secret/Config Scan v195 · ${result.issues.length} issue(s)`);
if(!result.ok) process.exitCode=2;
