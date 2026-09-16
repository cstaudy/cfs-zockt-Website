import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(process.argv[2] || ".");
const must = p => {
  const full = path.join(root,p);
  if (!fs.existsSync(full)) throw new Error(`Missing ${p}`);
  return fs.readFileSync(full,"utf8");
};

for (const rel of [
  "launcher/main.js","launcher/preload.js","launcher/src/bridge-client.js",
  "launcher/src/config-store.js","launcher/src/provider-manager.js",
  "launcher/src/providers/mock-provider.js","launcher/src/providers/tiktok-provider.js",
  "launcher/renderer/app.js","launcher/tools/static-check.mjs"
]) {
  execFileSync(process.execPath,["--check",path.join(root,rel)],{stdio:"inherit"});
}

const pkg=JSON.parse(must("launcher/package.json"));
if(!pkg.build?.win) throw new Error("Windows build config missing");
if(!pkg.devDependencies?.electron) throw new Error("Electron dependency missing");

const bridge=must("launcher/src/bridge-client.js");
for(const p of ["heartbeat","session/start","session/end","events","actions"]){
  if(!bridge.includes(p)) throw new Error(`Bridge client contract missing ${p}`);
}

const main=must("launcher/main.js");
for(const f of ["safeStorage","Tray","setLoginItemSettings","launcher:action-ack"]){
  if(!main.includes(f)) throw new Error(`Launcher main feature missing ${f}`);
}

const provider=must("launcher/src/providers/tiktok-provider.js");
if(!provider.includes("ready: false")) throw new Error("TikTok provider must not fake readiness");

const page=must("public/pages/launcher.html");
if(!page.includes("/api/creator/widget-studio/bridge")) throw new Error("Website launcher bridge status missing");

console.log("Milestone V9 static QA passed.");
