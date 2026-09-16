import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {buildManifest,verifyManifest}=require("../src/release-manifest.js");

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const dist=path.join(root,"dist");
const manifest=buildManifest(dist,pkg.version);
const file=path.join(dist,"release-manifest.json");
fs.writeFileSync(file,JSON.stringify(manifest,null,2),"utf8");
const verified=verifyManifest(manifest,dist);
if(!verified.ok)throw new Error("Generated Release Manifest verification failed");
console.log(`Release manifest ${pkg.version}: ${manifest.files.length} files`);
