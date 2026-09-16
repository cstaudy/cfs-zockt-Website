import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {buildManifest,verifyManifest}=require("../src/release-manifest.js");

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-manifest-"));
fs.writeFileSync(path.join(dir,"cfs_zockt-Creator-Suite-Setup-0.16.0-x64.exe"),"fake-binary");
fs.writeFileSync(path.join(dir,"latest.yml"),"version: 0.16.0");
fs.writeFileSync(path.join(dir,"SHA256SUMS.txt"),"placeholder");
const manifest=buildManifest(dir,"0.16.0");
if(manifest.files.length!==3)throw new Error("Manifest file count wrong");
if(!verifyManifest(manifest,dir).ok)throw new Error("Manifest verification failed");
fs.appendFileSync(path.join(dir,"latest.yml"),"\ntampered");
if(verifyManifest(manifest,dir).ok)throw new Error("Tampered manifest unexpectedly verified");

console.log(JSON.stringify({ok:true,files:manifest.files.length,version:manifest.version}));
