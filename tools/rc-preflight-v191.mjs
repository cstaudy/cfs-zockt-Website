import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = path.resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".");
const lib = require(path.join(root, "lib/rc-tooling-v191.js"));
const args = process.argv.slice(2);
const value = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] || "" : ""; };
const flag = name => args.includes(name);
const outJson = path.join(root, "reports/rc-preflight-v191.json");
const outMd = path.join(root, "reports/rc-preflight-v191.md");
const launcherConfig = value("--launcher-config") || process.env.CFS_RC_LAUNCHER_CONFIG || "";
const report = lib.buildRepositoryPreflight(root, { targetWindows: flag("--target-windows"), launcherConfigPath: launcherConfig || undefined });
async function probe(host, port, timeoutMs = 1200) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port }); let done = false;
    const finish = ok => { if (done) return; done = true; socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs); socket.once("connect", () => finish(true)); socket.once("timeout", () => finish(false)); socket.once("error", () => finish(false));
  });
}
if (flag("--probe-obs")) {
  const ok = await probe("127.0.0.1", 4455);
  report.checks.push({ id:"probe.obs_4455", label:"OBS WebSocket Port 4455 erreichbar", ok, severity:flag("--target-windows")?"blocker":"warn", manual:false, detail: ok ? "TCP connect erfolgreich." : "Kein TCP connect auf 127.0.0.1:4455." });
  if (!ok && flag("--target-windows")) report.blockers.push("probe.obs_4455");
  else if (!ok) report.warnings.push("probe.obs_4455");
  report.ready_for_real_acceptance = report.blockers.length === 0;
}
fs.mkdirSync(path.join(root, "reports"), { recursive:true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + "\n", "utf8");
fs.writeFileSync(outMd, lib.preflightMarkdown(report) + "\n", "utf8");
console.log(JSON.stringify({ ok:report.ready_for_real_acceptance, profile:report.profile, blockers:report.blockers, warnings:report.warnings, json:path.relative(root,outJson), markdown:path.relative(root,outMd) }));
if (flag("--strict") && !report.ready_for_real_acceptance) process.exitCode = 2;
