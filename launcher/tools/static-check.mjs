import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// fileURLToPath is required here for Windows compatibility.
// Using URL.pathname directly turns file:///D:/... into /D:/..., which
// path.resolve() can then incorrectly expand to D:\\D:\\... on GitHub runners.
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const files = [
  "main.js",
  "preload.js",
  "src/config-store.js",
  "src/logger.js",
  "src/bridge-client.js",
  "src/provider-manager.js",
  "src/providers/mock-provider.js",
  "src/providers/tiktool-provider.js",
  "renderer/app.js"
];

for (const rel of files) {
  const target = path.join(root, rel);
  if (!fs.existsSync(target)) throw new Error(`Launcher file missing: ${target}`);
  execFileSync(process.execPath, ["--check", target], { stdio: "inherit" });
}

const pkg = JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if (!pkg.dependencies?.["tiktok-live-api"]) throw new Error("tiktok-live-api dependency missing");
const html = fs.readFileSync(path.join(root, "renderer/index.html"), "utf8");
for (const id of ["startLive","endLive","backendUrl","bridgeToken","actionLog","diag"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Renderer ID missing: ${id}`);
}

const bridge = fs.readFileSync(path.join(root, "src/bridge-client.js"), "utf8");
for (const route of [
  "/api/bridge/widget-studio/status",
  "/api/bridge/widget-studio/heartbeat",
  "/api/bridge/widget-studio/session/start",
  "/api/bridge/widget-studio/session/end",
  "/api/bridge/widget-studio/events",
  "/api/bridge/widget-studio/actions"
]) {
  if (!bridge.includes(route)) throw new Error(`Bridge route missing: ${route}`);
}

console.log("Launcher static check passed (Windows-safe path resolution).");
