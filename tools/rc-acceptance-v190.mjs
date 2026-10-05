import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const contract = require("../lib/rc-acceptance-v190.js");

const root = path.resolve(process.cwd());
const args = process.argv.slice(2);
const command = args[0] || "status";
const value = name => { const i = args.indexOf(name); return i >= 0 ? String(args[i + 1] || "") : ""; };
const flag = name => args.includes(name);
const reportPath = path.resolve(value("--file") || path.join(root, "reports", "rc-acceptance-v190.json"));
const mdPath = path.resolve(value("--markdown") || path.join(root, "reports", "rc-acceptance-v190.md"));

function load() {
  if (!fs.existsSync(reportPath)) throw new Error(`Acceptance-Datei fehlt: ${reportPath}`);
  return contract.normalizePlan(JSON.parse(fs.readFileSync(reportPath, "utf8")));
}
function save(plan) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(plan, null, 2) + "\n", "utf8");
  fs.writeFileSync(mdPath, contract.markdown(plan) + "\n", "utf8");
}
function printStatus(plan) {
  const result = contract.evaluate(plan);
  console.log(`RC Acceptance v190: ${result.resolved}/${result.total} resolved · ${result.recommendation}`);
  for (const group of result.groups) console.log(`${group.ready ? "READY" : "HOLD "} ${group.id.padEnd(12)} ${group.passed}/${group.total} PASS · ${group.blockers} blocker`);
  if (result.blockers.length) console.log(`Blocker: ${result.blockers.join(", ")}`);
  return result;
}

if (command === "init") {
  if (fs.existsSync(reportPath) && !flag("--force")) throw new Error("Acceptance-Datei existiert bereits. --force nur für bewusstes Zurücksetzen verwenden.");
  const plan = contract.baseline();
  save(plan);
  console.log(`Initialisiert: ${reportPath}`);
} else if (command === "record") {
  const plan = load();
  const id = value("--id"), status = value("--status");
  if (!id || !status) throw new Error("record braucht --id und --status.");
  const index = plan.records.findIndex(record => record.id === id);
  if (index < 0) throw new Error(`Unbekannte Acceptance-ID: ${id}`);
  plan.records[index] = contract.normalizeRecord({
    ...plan.records[index], id, status,
    notes: value("--notes"), reference: value("--reference"), tested_at: new Date().toISOString()
  }, plan.records[index]);
  plan.updated_at = new Date().toISOString();
  save(plan);
  console.log(`Gespeichert: ${id} = ${status}`);
  printStatus(plan);
} else if (command === "reset") {
  const plan = load(), id = value("--id");
  if (!id) throw new Error("reset braucht --id.");
  const index = plan.records.findIndex(record => record.id === id);
  if (index < 0) throw new Error(`Unbekannte Acceptance-ID: ${id}`);
  plan.records[index] = contract.normalizeRecord({ id, status: "pending", notes: "", reference: "", tested_at: null }, plan.records[index]);
  plan.updated_at = new Date().toISOString();
  save(plan);
  console.log(`Zurückgesetzt: ${id}`);
} else if (command === "render") {
  const plan = load();
  fs.writeFileSync(mdPath, contract.markdown(plan) + "\n", "utf8");
  console.log(`Gerendert: ${mdPath}`);
} else if (command === "status") {
  const result = printStatus(load());
  if (flag("--strict") && !result.ready) process.exitCode = 2;
} else {
  throw new Error(`Unbekannter Befehl: ${command}`);
}
