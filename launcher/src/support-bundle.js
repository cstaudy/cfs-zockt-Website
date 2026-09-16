const fs = require("node:fs");
const path = require("node:path");

function safeName(value) {
  return String(value || "support")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "support";
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function createSupportBundle({
  directory,
  appVersion,
  settings,
  diagnostics,
  fieldTest,
  releaseGate,
  logText
}) {
  if (!directory) throw new Error("Support-Zielordner fehlt.");
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const folder = path.join(directory, `cfs_creator_suite_support_${safeName(appVersion)}_${stamp}`);
  fs.mkdirSync(folder, { recursive:true });

  const sanitizedSettings = {
    backendUrl:settings?.backendUrl || "",
    machineName:settings?.machineName || "",
    provider:settings?.provider || "",
    tiktokUsername:settings?.tiktokUsername || "",
    tokenStored:Boolean(settings?.tokenStored),
    tiktoolKeyStored:Boolean(settings?.tiktoolKeyStored),
    autoStart:Boolean(settings?.autoStart),
    startMinimized:Boolean(settings?.startMinimized),
    autoUpdate:settings?.autoUpdate !== false,
    autoRecoverLive:settings?.autoRecoverLive !== false,
    updateChannel:settings?.updateChannel || "stable",
    setupVersion:Number(settings?.setupVersion || 0),
    setupCompletedAt:settings?.setupCompletedAt || ""
  };

  writeJson(path.join(folder,"diagnostics.json"), diagnostics || {});
  writeJson(path.join(folder,"field-test.json"), fieldTest || {});
  writeJson(path.join(folder,"settings-sanitized.json"), sanitizedSettings);
  writeJson(path.join(folder,"release-gate.json"), releaseGate || {});
  fs.writeFileSync(path.join(folder,"recent-launcher.log"), String(logText || ""), "utf8");
  fs.writeFileSync(path.join(folder,"README.txt"),
`cfs_zockt Creator Suite Support Bundle
Version: ${appVersion}
Generated: ${new Date().toISOString()}

Dieses Paket enthält keine Bridge- oder Provider-Schlüssel.
Nutzernamen in Field-Test-Daten werden pseudonymisiert.
`, "utf8");

  return {
    ok:true,
    folder,
    files:[
      "diagnostics.json",
      "field-test.json",
      "settings-sanitized.json",
      "release-gate.json",
      "recent-launcher.log",
      "README.txt"
    ]
  };
}

module.exports = { createSupportBundle };
