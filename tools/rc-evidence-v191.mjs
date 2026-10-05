import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = path.resolve(".");
const lib = require(path.join(root, "lib/rc-tooling-v191.js"));
const args = process.argv.slice(2), command = args[0] || "status";
const value = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] || "" : ""; };
const manifestPath = path.join(root, "reports/rc-evidence-v191.json");
const mdPath = path.join(root, "reports/rc-evidence-v191.md");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const launcher = JSON.parse(fs.readFileSync(path.join(root, "launcher/package.json"), "utf8"));
function load() { return fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : lib.createEvidenceManifest({ backend_version:pkg.version, launcher_version:launcher.version }); }
function save(manifest) { const verify = lib.verifyEvidence(root, manifest); fs.mkdirSync(path.dirname(manifestPath), { recursive:true }); fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2)+"\n", "utf8"); fs.writeFileSync(mdPath, lib.evidenceMarkdown(manifest, verify)+"\n", "utf8"); return verify; }
if (command === "init") {
  const manifest = lib.createEvidenceManifest({ backend_version:pkg.version, launcher_version:launcher.version });
  const verify = save(manifest); console.log(JSON.stringify({ok:true,total:verify.total,manifest:path.relative(root,manifestPath)}));
} else if (command === "add") {
  const result = lib.addEvidence(root, load(), { id:value("--id"), case_id:value("--case"), kind:value("--kind")||"other", file:value("--file"), notes:value("--notes") });
  const verify = save(result.manifest); console.log(JSON.stringify({ok:verify.ok,reference:result.reference,file:result.artifact.file,sha256:result.artifact.sha256}));
} else if (command === "verify" || command === "status") {
  const manifest = load(), verify = lib.verifyEvidence(root, manifest); save(manifest); console.log(JSON.stringify({ok:verify.ok,total:verify.total,valid:verify.valid,manifest:path.relative(root,manifestPath)})); if (command === "verify" && !verify.ok) process.exitCode=2;
} else throw new Error(`Unbekannter Befehl: ${command}`);
