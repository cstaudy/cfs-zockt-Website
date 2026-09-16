import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const qa=spawnSync(process.execPath,[path.join(root,"tools/creator-isolation-v21-qa.mjs"),root],{cwd:root,encoding:"utf8",timeout:30000});
if(qa.status!==0)throw new Error(qa.stderr||qa.stdout||"creator isolation QA failed");
const source=fs.readFileSync(path.join(root,"server.js"),"utf8");
const creatorRoutes=[
  "/api/creator/widget-studio/widgets",
  "/api/creator/widget-studio/scenes",
  "/api/creator/widget-studio/live",
  "/api/creator/widget-studio/bridge"
];
for(const route of creatorRoutes){if(!source.includes(route))throw new Error(`creator route missing: ${route}`);}
for(const route of [
  "/api/bridge/widget-studio/library",
  "/api/bridge/widget-studio/widgets/:id/control",
  "/api/bridge/widget-studio/stream-bot",
  "/api/bridge/widget-studio/session/start"
]){if(!source.includes(route))throw new Error(`bridge route missing: ${route}`);}
if(!source.includes("requireCreatorAccount")||!source.includes("requireStudioBridge"))throw new Error("creator/bridge auth middleware missing");
console.log(JSON.stringify({ok:true,creator_routes:creatorRoutes.length,bridge_auth:true,creator_auth:true}));
