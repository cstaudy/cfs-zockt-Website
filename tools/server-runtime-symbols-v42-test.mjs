import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, ".."));
const serverPath = path.join(root, "server.js");
if (!fs.existsSync(serverPath)) throw new Error("server.js missing");

const syntax = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout || "server.js syntax failed");

const source = fs.readFileSync(serverPath, "utf8");
const mustContain = [
  '"3.12.0"',
  "async function startServer()",
  "startServer();",
  'app.get("/.well-known/security.txt"',
  '"/api/public/status"',
  '"/api/health"',
  '"/api/account/login"',
  '"/api/account/me"',
  '"/api/account/sessions"',
  '"/api/account/password"',
  '"/api/account/mfa/login"',
  '"/api/account/mfa/passkey/options"',
  '"/api/account/mfa/passkey/verify"',
  '"/api/account/export"',
  "/api/creator/",
  "/api/bridge/",
  "/api/launcher/",
  "/api/public/support",
  "/api/public/reviews"
];

const missing = mustContain.filter((needle) => !source.includes(needle));
if (missing.length) throw new Error(`server runtime symbols missing: ${missing.join(", ")}`);

console.log(JSON.stringify({ ok: true, syntax: true, symbols: mustContain.length, backend: "3.12.0" }));
