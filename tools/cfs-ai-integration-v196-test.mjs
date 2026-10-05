import fs from "fs";
import path from "path";
import process from "process";

const root = path.resolve(process.argv[2] || ".");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const must = (value, message) => { if (!value) throw new Error(message); };

const server = read("server.js");
const gateway = read("lib/cfs-ai-gateway.js");
const page = read("public/pages/cfs-ai.html");
const client = read("public/assets/js/page-cfs-ai.js");
const shell = read("public/assets/js/cfs-shell-v3.js");

must(server.includes('require("./lib/cfs-ai-gateway")'), "AI gateway is not wired into server.js");
must(server.includes('/api/creator/cfs-ai/status'), "AI status route missing");
must(server.includes('/api/creator/cfs-ai/templates/harvest'), "AI harvest route missing");
must(server.includes('for(const action of [\"approve\",\"reject\",\"rollback\"])'), "AI approval route group missing");
must(server.includes('pagePath === "/pages/cfs-ai.html"'), "CFS AI HTML admin guard missing");
must(gateway.includes('CFS_AI_ENABLED'), "AI enable gate missing");
must(gateway.includes('CFS_AI_BRIDGE_TOKEN'), "AI bridge token support missing");
must(gateway.includes('url.origin !== c.baseUrl.origin'), "AI origin lock missing");
must(page.includes('CFS AI'), "CFS AI page missing");
must(client.includes('/api/creator/cfs-ai/'), "CFS AI page does not use same-origin gateway");
must(!client.includes('127.0.0.1:8000'), "Browser must not call local AI service directly");
must(shell.includes('/pages/cfs-ai.html'), "Admin navigation integration missing");
console.log("CFS AI integration v196 checks passed.");
