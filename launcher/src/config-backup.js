const crypto = require("node:crypto");

const SAFE_FIELDS = [
  "backendUrl",
  "machineName",
  "autoStart",
  "startMinimized",
  "provider",
  "tiktokUsername",
  "ttsEnabled",
  "ttsRate",
  "ttsPitch",
  "ttsVolume",
  "ttsVoiceName",
  "autoUpdate",
  "updateChannel",
  "autoRecoverLive"
];

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksumConfig(config) {
  return crypto.createHash("sha256").update(canonical(config)).digest("hex");
}

function sanitizeConfig(input = {}) {
  const out = {};
  for (const field of SAFE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) out[field] = input[field];
  }

  out.backendUrl = String(out.backendUrl || "https://cfs-zockt.de").trim().replace(/\/+$/,"");
  out.machineName = String(out.machineName || "").trim().slice(0,120);
  out.provider = out.provider === "tiktool" ? "tiktool" : "mock";
  out.tiktokUsername = String(out.tiktokUsername || "").trim().replace(/^@/,"").slice(0,80);
  out.autoStart = Boolean(out.autoStart);
  out.startMinimized = Boolean(out.startMinimized);
  out.ttsEnabled = out.ttsEnabled !== false;
  out.ttsRate = Math.max(.5, Math.min(2, Number(out.ttsRate || 1)));
  out.ttsPitch = Math.max(.5, Math.min(2, Number(out.ttsPitch || 1)));
  out.ttsVolume = Math.max(0, Math.min(1, Number(out.ttsVolume ?? 1)));
  out.ttsVoiceName = String(out.ttsVoiceName || "").trim().slice(0,180);
  out.autoUpdate = out.autoUpdate !== false;
  out.updateChannel = out.updateChannel === "beta" ? "beta" : "stable";
  out.autoRecoverLive = out.autoRecoverLive !== false;

  let url;
  try { url = new URL(out.backendUrl); }
  catch { throw new Error("Backup enthält eine ungültige Backend URL."); }
  const local = ["localhost","127.0.0.1","::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Backup Backend URL muss HTTPS verwenden.");
  }

  return out;
}

function createBackup(settings = {}, appVersion = "") {
  const config = sanitizeConfig(settings);
  return {
    schema: 1,
    product: "cfs_zockt Creator Suite",
    created_at: new Date().toISOString(),
    launcher_version: String(appVersion || ""),
    secrets_included: false,
    config,
    checksum: checksumConfig(config)
  };
}

function parseBackup(value) {
  const backup = typeof value === "string" ? JSON.parse(value) : value;
  if (!backup || backup.schema !== 1 || backup.product !== "cfs_zockt Creator Suite") {
    throw new Error("Diese Datei ist kein gültiges Creator-Suite-Konfigurationsbackup.");
  }
  if (backup.secrets_included === true) {
    throw new Error("Backups mit eingebetteten Secrets werden aus Sicherheitsgründen nicht importiert.");
  }
  const config = sanitizeConfig(backup.config || {});
  if (!/^[a-f0-9]{64}$/i.test(String(backup.checksum || ""))) {
    throw new Error("Backup-Prüfsumme fehlt.");
  }
  if (checksumConfig(config) !== String(backup.checksum).toLowerCase()) {
    throw new Error("Backup-Prüfsumme stimmt nicht. Datei wurde möglicherweise verändert.");
  }
  return { ...backup, config, checksum: String(backup.checksum).toLowerCase() };
}

module.exports = { SAFE_FIELDS, createBackup, parseBackup, sanitizeConfig, checksumConfig };
