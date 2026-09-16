import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root=path.resolve(process.argv[2]||".");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
for(const rel of [
 "launcher/main.js","launcher/preload.js","launcher/src/config-store.js",
 "launcher/src/provider-manager.js","launcher/src/providers/tiktool-provider.js",
 "launcher/renderer/app.js"
]) execFileSync(process.execPath,["--check",path.join(root,rel)],{stdio:"inherit"});
const pkg=JSON.parse(read("launcher/package.json"));
if(pkg.dependencies?.["tiktok-live-api"]!=="1.4.9") throw new Error("Unexpected tiktok-live-api version; dependency must remain exactly pinned");
const provider=read("launcher/src/providers/tiktool-provider.js");
for(const event of ['"follow"','"like"','"gift"','"share"','"roomUserSeq"']) if(!provider.includes(event)) throw new Error(`Provider event missing ${event}`);
if(provider.includes("tiktok-live-connector")) throw new Error("AGPL connector must not be bundled by default");
const store=read("launcher/src/config-store.js");
for(const feature of ["tiktoolApiKeyEncrypted","safeStorage","tiktokUsername"]) if(!store.includes(feature)) throw new Error(`Secret/config feature missing ${feature}`);
console.log("Milestone V10 static QA passed.");
