import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = path.resolve(".");
const lib = require(path.join(root, "lib/rc-tooling-v191.js"));
const args = process.argv.slice(2), command = args[0] || "status";
const value = name => { const i=args.indexOf(name); return i>=0 ? args[i+1]||"" : ""; };
const file = path.join(root, "evidence/rc-v191/diagnostics.jsonl");
fs.mkdirSync(path.dirname(file), { recursive:true });
if (command === "append") {
  const status = (value("--status")||"info").toLowerCase(); if (!new Set(["info","pass","warn","fail"]).has(status)) throw new Error("Status muss info/pass/warn/fail sein.");
  const row = { schema:1, tooling_version:"v191", at:new Date().toISOString(), category:lib.clean(value("--category")||"general",40), event:lib.clean(value("--event")||"diagnostic",100), status, detail:lib.clean(lib.redactText(value("--detail")),1000) };
  fs.appendFileSync(file, JSON.stringify(row)+"\n", {encoding:"utf8",mode:0o600}); console.log(JSON.stringify({ok:true,file:path.relative(root,file),event:row.event,status:row.status}));
} else if (command === "status") {
  const rows = fs.existsSync(file) ? fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(Boolean) : [];
  const counts = Object.fromEntries(["info","pass","warn","fail"].map(s=>[s,rows.filter(r=>r.status===s).length]));
  console.log(JSON.stringify({ok:counts.fail===0,total:rows.length,counts,file:path.relative(root,file)}));
} else throw new Error(`Unbekannter Befehl: ${command}`);
