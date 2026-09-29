import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok:Boolean(ok), detail });

const server = read("server.js");
const bridge = read("launcher/src/bridge-client.js");
const widget = read("public/assets/js/widget-studio.js");
const tech = read("public/pages/technical-status.html");
const pkg = JSON.parse(read("package.json"));
const launcherPkg = JSON.parse(read("launcher/package.json"));

check("brand canonical", !/\bCFS ZOCKT\b/.test(tech) && tech.includes("cfs_zockt"), "Visible technical page uses cfs_zockt.");
check("security readiness endpoint", server.includes('"/api/creator/security-readiness"'));
check("release readiness endpoint", server.includes('"/api/creator/release-readiness"'));
check("launcher signed requests", server.includes("signed_requests_v1") && bridge.includes("signed_requests_v1"));
check("launcher replay guard", server.includes("creator_bridge_request_nonces") && server.includes("replay_guard_v1"));
check("launcher protocol 3", /protocol[^\n]{0,120}3/i.test(bridge) || bridge.includes("protocol: 3") || bridge.includes("protocol:3"));
check("launcher current version", String(launcherPkg.version || "") === "0.47.17", `launcher=${launcherPkg.version}`);
check("widget optimistic locking", server.includes("widget_version_conflict"));
check("widget studio client optimistic version", widget.includes("expected_version"));
check("technical release card", tech.includes('data-tech-card="release"'));
check("release workflow", exists(".github/workflows/creator-suite-release-gate.yml"));
check("security baseline", exists("SECURITY-BASELINE-v137.md"));
check("cumulative legacy docs", ["PLAYSTATION-SETUP.txt","RENDER-ENV.txt","RENDER-TIKTOK-SETUP.txt","UPDATE-INHALT.txt"].every(exists));
check("package release script", pkg?.scripts?.["release:v138"] === "node tools/creator-suite-release-gate-v138.mjs .");

const failed = checks.filter(row => !row.ok);
for (const row of checks) console.log(`${row.ok ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
