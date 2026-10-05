"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const requireHere = createRequire(__filename);
const acceptance190 = requireHere("./rc-acceptance-v190.js");

const VERSION = "v191";
const SCHEMA = 1;
const BACKEND_MIN = "3.20.36";
const LAUNCHER_EXPECTED = "0.47.30";
const EVIDENCE_PREFIX = "evidence-v191/";
const TEXT_EVIDENCE_EXT = new Set([".txt", ".log", ".json", ".md", ".csv"]);
const BINARY_EVIDENCE_EXT = new Set([".png", ".webp", ".jpg", ".jpeg"]);
const EVIDENCE_KINDS = new Set(["log", "report", "screenshot", "video-note", "other"]);

function clean(value, max = 4000) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
function semverParts(value) {
  const match = clean(value, 80).match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}
function semverGte(actual, expected) {
  const a = semverParts(actual), b = semverParts(expected);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}
function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function safeJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function exists(root, rel) { return fs.existsSync(path.join(root, rel)); }
function read(root, rel) { try { return fs.readFileSync(path.join(root, rel), "utf8"); } catch { return ""; } }
function boolEnv(value) { return /^(1|true|yes|on)$/i.test(clean(value, 20)); }

function redactText(value) {
  let out = String(value ?? "");
  out = out.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]");
  out = out.replace(/rtmps?:\/\/[^\s"']+/gi, "[redacted-rtmp-url]");
  out = out.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/gi, "Bearer [redacted]");
  out = out.replace(/\boauth:[^\s"']+/gi, "oauth:[redacted]");
  out = out.replace(/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]+/g, "[redacted-provider-key]");
  out = out.replace(/\bwhsec_[A-Za-z0-9_-]+/g, "[redacted-webhook-secret]");
  out = out.replace(/\b((?:access|refresh)[_-]?token|client[_-]?secret|stream[_ -]?key|password)\s*[:=]\s*([^\s,;]+)/gi, "$1=[redacted]");
  out = out.replace(/\b[A-Za-z]:\\Users\\[^\\\s]+\\[^\s"']+/g, "[redacted-local-path]");
  out = out.replace(/(?:^|\s)\/(?:home|Users)\/[^\s"']+/g, " [redacted-local-path]");
  out = out.replace(/https?:\/\/[^\s"']+/gi, raw => {
    try {
      const u = new URL(raw);
      for (const key of [...u.searchParams.keys()]) {
        if (/token|key|secret|auth|password/i.test(key)) u.searchParams.set(key, "[redacted]");
      }
      return u.toString();
    } catch { return raw; }
  });
  return out;
}
function containsSecretLike(value) {
  const raw = String(value ?? "");
  if (/postgres(?:ql)?:\/\/[^\s]+/i.test(raw)) return true;
  if (/rtmps?:\/\/[^\s]+/i.test(raw)) return true;
  if (/\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/i.test(raw)) return true;
  if (/\boauth:[^\s]+/i.test(raw)) return true;
  if (/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]+/i.test(raw)) return true;
  if (/\bwhsec_[A-Za-z0-9_-]+/i.test(raw)) return true;
  if (/\b(?:access|refresh)[_-]?token\s*[:=]\s*\S+/i.test(raw)) return true;
  if (/\bclient[_-]?secret\s*[:=]\s*\S+/i.test(raw)) return true;
  if (/\bstream[_ -]?key\s*[:=]\s*\S+/i.test(raw)) return true;
  if (/\bpassword\s*[:=]\s*\S+/i.test(raw)) return true;
  return false;
}
function safeRelativeReference(value) {
  const raw = clean(value, 500).replace(/\\/g, "/");
  if (!raw) throw new Error("Relative Evidence-Datei fehlt.");
  if (/^[A-Za-z]:\//.test(raw) || raw.startsWith("/") || raw.includes("://")) throw new Error("Evidence-Dateien müssen repo-relative Pfade verwenden.");
  const norm = path.posix.normalize(raw).replace(/^\.\//, "");
  if (norm.startsWith("../") || norm === "..") throw new Error("Evidence-Pfad darf das Projekt nicht verlassen.");
  if (!norm.startsWith("evidence/")) throw new Error("Evidence-Dateien müssen unter evidence/ liegen.");
  return norm;
}
function safeEvidenceId(value) {
  const id = clean(value, 120).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id) throw new Error("Evidence-ID ist leer.");
  return id;
}
function reportCheck(id, label, ok, { severity = "blocker", detail = "", manual = false } = {}) {
  return { id, label, ok: ok === true, severity, manual, detail: clean(redactText(detail), 1200) };
}
function buildRepositoryPreflight(root, options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const targetWindows = options.targetWindows === true;
  const pkg = safeJson(path.join(root, "package.json"), {});
  const launcherPkg = safeJson(path.join(root, "launcher/package.json"), {});
  const lock = safeJson(path.join(root, "package-lock.json"), {});
  const acceptance = safeJson(path.join(root, "reports/rc-acceptance-v190.json"), null);
  const checks = [];
  const add = (id, label, ok, meta) => checks.push(reportCheck(id, label, ok, meta));

  add("backend.version", "Backend-Version", semverGte(pkg.version, BACKEND_MIN), { detail: `${pkg.version || "missing"} (erwartet ${BACKEND_MIN}+)` });
  add("backend.lock", "package-lock konsistent", String(lock.version || "") === String(pkg.version || "") && String(lock.packages?.[""]?.version || "") === String(pkg.version || ""), { detail: String(lock.version || "missing") });
  add("launcher.version", "Launcher-Version bekannt", String(launcherPkg.version || "") === LAUNCHER_EXPECTED, { detail: launcherPkg.version || "missing" });
  const envExample = read(root, ".env.example");
  const commerceEnv = clean(env.CFS_COMMERCIAL_MODE, 20);
  const commerceDisabled = commerceEnv ? !boolEnv(commerceEnv) : /CFS_COMMERCIAL_MODE=false/i.test(envExample);
  add("commerce.disabled", "Commerce bleibt deaktiviert", commerceDisabled, { detail: commerceEnv ? "Runtime-Flag geprüft." : ".env.example geprüft." });
  add("acceptance.matrix", "v190 Acceptance-Matrix lesbar", Boolean(acceptance && Array.isArray(acceptance.records) && acceptance.records.length >= 45), { detail: acceptance ? `${acceptance.records?.length || 0} Fälle` : "Report fehlt/ungültig" });
  if (acceptance) {
    try {
      const result = acceptance190.evaluate(acceptance);
      add("acceptance.no_false_go", "Acceptance bleibt realitätsgebunden", result.recommendation !== "RC_READY_FOR_GO_NO_GO" || result.resolved === result.total, { detail: `${result.resolved}/${result.total} aufgelöst · ${result.recommendation}` });
    } catch (error) {
      add("acceptance.no_false_go", "Acceptance bleibt realitätsgebunden", false, { detail: error.message });
    }
  }
  for (const [id, label, rel] of [
    ["tool.obs_doctor", "OBS Browser-Source Doctor vorhanden", "launcher/src/obs-doctor.js"],
    ["tool.obs_websocket", "OBS WebSocket Controller vorhanden", "launcher/src/obs-websocket-controller.js"],
    ["tool.support_bundle", "Secret-armer Support Bundle vorhanden", "launcher/src/support-bundle.js"],
    ["tool.runtime_evidence", "Runtime-Evidence Sammler vorhanden", "launcher/src/stream-runtime-evidence.js"],
    ["tool.soak_guard", "Soak-Guard vorhanden", "launcher/src/stream-soak-guard.js"],
    ["tool.acceptance_cli", "Acceptance CLI vorhanden", "tools/rc-acceptance-v190.mjs"],
    ["tool.windows_runner", "Windows Acceptance Runner vorhanden", "RUN-RC-ACCEPTANCE-v190.cmd"]
  ]) add(id, label, exists(root, rel), { detail: rel });
  const obsController = read(root, "launcher/src/obs-websocket-controller.js");
  add("obs.loopback_default", "OBS WebSocket Default ist loopback", /127\.0\.0\.1:4455/.test(obsController), { detail: "ws://127.0.0.1:4455" });
  const support = read(root, "launcher/src/support-bundle.js");
  add("support.no_secret_claim", "Support Bundle deklariert Secret-Ausschluss", /keine Bridge- oder Provider-Schlüssel/i.test(support), { detail: "Support-Bundle README" });
  const major = Number(process.versions.node.split(".")[0] || 0);
  add("runtime.node", "Node.js Runtime", major >= 18, { detail: process.version });
  try { fs.accessSync(path.join(root, "reports"), fs.constants.W_OK); add("reports.writable", "reports/ beschreibbar", true, { detail: "reports/" }); }
  catch { add("reports.writable", "reports/ beschreibbar", false, { detail: "reports/ nicht beschreibbar" }); }
  add("target.windows", "Windows-Zielumgebung", !targetWindows || platform === "win32", { severity: targetWindows ? "blocker" : "info", manual: !targetWindows, detail: targetWindows ? `platform=${platform}` : `Repo-Preflight: platform=${platform}; Realtest später auf win32.` });

  if (options.launcherConfigPath) {
    const configPath = path.resolve(options.launcherConfigPath);
    const cfg = safeJson(configPath, null);
    add("target.launcher_config", "Launcher-Konfiguration lesbar", Boolean(cfg), { detail: cfg ? "Konfiguration geladen (Werte nicht ausgegeben)." : "Konfiguration fehlt/ungültig." });
    if (cfg) {
      const obsUrl = clean(cfg.obsWebSocketUrl || "ws://127.0.0.1:4455", 500);
      let obsLocal = false;
      try { const u = new URL(obsUrl); obsLocal = ["127.0.0.1", "localhost", "::1"].includes(u.hostname) && ["ws:", "wss:"].includes(u.protocol); } catch {}
      add("target.obs_config", "OBS WebSocket bleibt lokal", obsLocal, { detail: obsLocal ? "Lokaler OBS-WebSocket konfiguriert." : "OBS WebSocket ist nicht lokal/ungültig." });
      add("target.obs_password_storage", "OBS Passwort nicht im Public Config-Feld", !Object.prototype.hasOwnProperty.call(cfg, "obsWebSocketPassword"), { detail: "Klartextfeld obsWebSocketPassword darf nicht persistiert sein." });
    }
  } else {
    add("target.launcher_config", "Launcher-Konfiguration für Zieltest", true, { severity: "info", manual: true, detail: "Optional mit --launcher-config prüfen; kein Blocker im Repo-Preflight." });
  }

  const blockers = checks.filter(row => row.severity === "blocker" && !row.ok);
  const warnings = checks.filter(row => row.severity === "warn" && !row.ok);
  return {
    schema: SCHEMA,
    tooling_version: VERSION,
    generated_at: new Date().toISOString(),
    profile: targetWindows ? "target-windows" : "repository",
    backend_version: String(pkg.version || ""),
    launcher_version: String(launcherPkg.version || ""),
    real_acceptance_executed: false,
    ready_for_real_acceptance: blockers.length === 0,
    blockers: blockers.map(row => row.id),
    warnings: warnings.map(row => row.id),
    checks
  };
}
function preflightMarkdown(report) {
  const lines = [
    "# cfs_zockt — RC Preflight v191", "",
    `Status: **${report.ready_for_real_acceptance ? "READY_FOR_REAL_ACCEPTANCE" : "BLOCKED"}**`,
    `Profil: **${report.profile}**`,
    `Backend: **${report.backend_version}** · Launcher: **${report.launcher_version}**`, "",
    "> Dieser Preflight prüft nur Voraussetzungen und Werkzeuge. Er erzeugt keinen realen Acceptance-PASS.", ""
  ];
  for (const row of report.checks) {
    const icon = row.ok ? "PASS" : row.severity === "info" ? "INFO" : "FAIL";
    lines.push(`- **${icon}** \`${row.id}\` — ${row.label}${row.detail ? ` — ${row.detail}` : ""}`);
  }
  lines.push("", `Blocker: **${report.blockers.length}**`, "");
  return lines.join("\n");
}

function createEvidenceManifest(meta = {}) {
  return {
    schema: SCHEMA,
    tooling_version: VERSION,
    backend_version: clean(meta.backend_version || BACKEND_MIN, 80),
    launcher_version: clean(meta.launcher_version || LAUNCHER_EXPECTED, 80),
    created_at: meta.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    artifacts: []
  };
}
function normalizeManifest(input = {}) {
  const out = createEvidenceManifest(input);
  out.created_at = input.created_at || out.created_at;
  out.updated_at = input.updated_at || out.updated_at;
  out.artifacts = Array.isArray(input.artifacts) ? input.artifacts.map(row => ({
    id: safeEvidenceId(row.id), case_id: clean(row.case_id, 120), kind: clean(row.kind, 40), file: safeRelativeReference(row.file),
    sha256: clean(row.sha256, 64).toLowerCase(), size: Math.max(0, Number(row.size) || 0), notes: clean(redactText(row.notes), 800), captured_at: clean(row.captured_at, 80)
  })) : [];
  return out;
}
function addEvidence(root, manifest, input = {}) {
  const caseDef = acceptance190.caseDefinition(input.case_id);
  if (!caseDef) throw new Error(`Unbekannte Acceptance-ID: ${clean(input.case_id, 120)}`);
  const kind = clean(input.kind || "other", 40);
  if (!EVIDENCE_KINDS.has(kind)) throw new Error("Unbekannte Evidence-Art.");
  const rel = safeRelativeReference(input.file);
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root) + path.sep)) throw new Error("Evidence-Datei liegt außerhalb des Projekts.");
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`Evidence-Datei fehlt: ${rel}`);
  const ext = path.extname(rel).toLowerCase();
  if (!TEXT_EVIDENCE_EXT.has(ext) && !BINARY_EVIDENCE_EXT.has(ext)) throw new Error(`Evidence-Dateityp nicht erlaubt: ${ext || "ohne Endung"}`);
  const notes = clean(input.notes, 800);
  if (containsSecretLike(notes)) throw new Error("Evidence-Notiz enthält möglicherweise ein Secret.");
  const stat = fs.statSync(abs);
  if (TEXT_EVIDENCE_EXT.has(ext)) {
    if (stat.size > 5 * 1024 * 1024) throw new Error("Text-Evidence ist größer als 5 MiB.");
    const text = fs.readFileSync(abs, "utf8");
    if (containsSecretLike(text)) throw new Error("Evidence-Datei enthält möglicherweise ein Secret/RTMP-Ziel und wird nicht registriert.");
  }
  const hash = sha256File(abs);
  const id = safeEvidenceId(input.id || `${caseDef.id}-${hash.slice(0, 12)}`);
  const next = normalizeManifest(manifest);
  const row = { id, case_id: caseDef.id, kind, file: rel, sha256: hash, size: stat.size, notes: clean(redactText(notes), 800), captured_at: new Date().toISOString() };
  next.artifacts = next.artifacts.filter(item => item.id !== id);
  next.artifacts.push(row);
  next.artifacts.sort((a, b) => a.id.localeCompare(b.id));
  next.updated_at = new Date().toISOString();
  return { manifest: next, artifact: row, reference: `${EVIDENCE_PREFIX}${id}` };
}
function verifyEvidence(root, manifest) {
  const normalized = normalizeManifest(manifest);
  const rows = normalized.artifacts.map(row => {
    const def = acceptance190.caseDefinition(row.case_id);
    const abs = path.resolve(root, row.file);
    const existsFile = abs.startsWith(path.resolve(root) + path.sep) && fs.existsSync(abs) && fs.statSync(abs).isFile();
    const actual = existsFile ? sha256File(abs) : "";
    const ok = Boolean(def && existsFile && /^[a-f0-9]{64}$/.test(row.sha256) && actual === row.sha256);
    return { ...row, ok, exists: existsFile, case_known: Boolean(def), hash_matches: actual === row.sha256 };
  });
  return { ok: rows.every(row => row.ok), total: rows.length, valid: rows.filter(row => row.ok).length, rows };
}
function evidenceMarkdown(manifest, verification) {
  const lines = ["# cfs_zockt — RC Evidence Index v191", "", `Status: **${verification.ok ? "VALID" : "INVALID"}** · ${verification.valid}/${verification.total}`, "", "> Der Index dokumentiert Artefakte. Er setzt keinen Acceptance-Status automatisch auf PASS.", ""];
  for (const row of verification.rows) lines.push(`- **${row.ok ? "OK" : "FAIL"}** \`${EVIDENCE_PREFIX}${row.id}\` · \`${row.case_id}\` · ${row.kind} · \`${row.file}\` · SHA-256 \`${row.sha256}\``);
  lines.push("");
  return lines.join("\n");
}
function evaluateGoNoGo({ acceptance, evidence, preflight }) {
  const acceptanceResult = acceptance190.evaluate(acceptance || {});
  const manifest = normalizeManifest(evidence || {});
  const refs = new Map(manifest.artifacts.map(row => [`${EVIDENCE_PREFIX}${row.id}`, row]));
  const missingEvidence = [];
  for (const row of acceptanceResult.records.filter(item => item.status === "pass")) {
    const artifact = refs.get(row.reference);
    if (!artifact || artifact.case_id !== row.id) missingEvidence.push(row.id);
  }
  const preflightReady = preflight?.ready_for_real_acceptance === true;
  const ready = acceptanceResult.ready && preflightReady && missingEvidence.length === 0;
  return {
    schema: SCHEMA,
    tooling_version: VERSION,
    generated_at: new Date().toISOString(),
    status: ready ? "READY_FOR_MANUAL_GO_NO_GO" : "HOLD",
    automatic_go: false,
    preflight_ready: preflightReady,
    acceptance_ready: acceptanceResult.ready,
    evidence_ready: missingEvidence.length === 0,
    missing_evidence: missingEvidence,
    acceptance: { resolved: acceptanceResult.resolved, total: acceptanceResult.total, blockers: acceptanceResult.blockers }
  };
}
function goNoGoMarkdown(result) {
  return [
    "# cfs_zockt — RC Go/No-Go Guard v191", "",
    `Status: **${result.status}**`, "",
    `- Preflight: **${result.preflight_ready ? "READY" : "BLOCKED"}**`,
    `- Reale Acceptance: **${result.acceptance_ready ? "READY" : "HOLD"}** (${result.acceptance.resolved}/${result.acceptance.total})`,
    `- Evidence: **${result.evidence_ready ? "READY" : "UNVOLLSTÄNDIG"}**`,
    `- Automatic GO: **NEIN**`, "",
    "> Auch READY_FOR_MANUAL_GO_NO_GO ist keine automatische Produktionsfreigabe. Die finale Entscheidung bleibt explizit/manuell.", ""
  ].join("\n");
}

module.exports = {
  VERSION, SCHEMA, BACKEND_MIN, LAUNCHER_EXPECTED, EVIDENCE_PREFIX,
  clean, semverGte, redactText, containsSecretLike, safeRelativeReference,
  buildRepositoryPreflight, preflightMarkdown,
  createEvidenceManifest, normalizeManifest, addEvidence, verifyEvidence, evidenceMarkdown,
  evaluateGoNoGo, goNoGoMarkdown
};
