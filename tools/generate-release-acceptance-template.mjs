import fs from "node:fs";import path from "node:path";import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {protocolDefinition,sanitizeStepResults}=require("../lib/release-acceptance.js");
const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]||"":""};
const protocol=value("--protocol")||"windows_install",releaseVersion=value("--release-version")||process.env.CFS_RELEASE_VERSION||"0.39.0",out=value("--out")||path.resolve("reports",`${protocol}-acceptance-template.json`);
const def=protocolDefinition(protocol);if(!def)throw new Error(`Unknown protocol: ${protocol}`);
const payload={
  schema:1,
  protocol,
  label:def.label,
  release_version:releaseVersion,
  environment:"production",
  target:"",
  reference:"",
  notes:"",
  status:"draft",
  step_results:sanitizeStepResults(protocol,[])
};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(payload,null,2),"utf8");
console.log(JSON.stringify({ok:true,protocol,steps:payload.step_results.length,out}));
