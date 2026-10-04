import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]&&!process.argv[2].startsWith("--")?process.argv[2]:".");
const lib=require(path.join(root,"lib/rc-freeze-v195.js"));
const out=path.join(root,"reports/rc-freeze-v195.json");
const command=process.argv.includes("--create")?"create":"verify";
if(command==="create"){
  const manifest=lib.buildManifest(root); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify({ok:true,status:"FROZEN",files:manifest.file_count,tree_sha256:manifest.tree_sha256,manifest:path.relative(root,out)}));
}else{
  if(!fs.existsSync(out)) throw new Error("Freeze-Manifest fehlt. Zuerst --create ausführen.");
  const manifest=JSON.parse(fs.readFileSync(out,"utf8")); const result=lib.verifyManifest(root,manifest);
  console.log(JSON.stringify({ok:result.ok,status:result.ok?"FROZEN_INTACT":"DRIFT",missing:result.missing,extra:result.extra,changed:result.changed,versions_ok:result.versions_ok,tree_ok:result.tree_ok}));
  if(!result.ok) process.exitCode=2;
}
