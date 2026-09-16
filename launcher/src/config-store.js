const fs = require("node:fs");
const path = require("node:path");

function parseObjectJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Ungültige Einstellungen.");
  return parsed;
}

function atomicWriteJson(filePath, value) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  const backup = `${filePath}.bak`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  let fd = null;
  try {
    fd = fs.openSync(tmp, "w");
    fs.writeFileSync(fd, payload, "utf8");
    fs.fsyncSync(fd);
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
  try {
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backup);
    fs.renameSync(tmp, filePath);
  } catch (error) {
    try { fs.rmSync(tmp, { force: true }); } catch {}
    throw error;
  }
}

const DEFAULTS = {
  backendUrl: "https://cfs-zockt.de",
  machineName: "",
  autoStart: false,
  startMinimized: false,
  provider: "mock",
  tiktokUsername: "",
  ttsEnabled: true,
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  ttsVoiceName: "",
  autoUpdate: true,
  updateChannel: "stable",
  autoRecoverLive: true,
  setupVersion: 0,
  setupCompletedAt: ""
};

class ConfigStore {
  constructor(filePath, safeStorage, logger) {
    this.filePath = filePath;
    this.safeStorage = safeStorage;
    this.logger = logger;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  readRaw() {
    try {
      return parseObjectJson(fs.readFileSync(this.filePath, "utf8"));
    } catch (error) {
      const backup = `${this.filePath}.bak`;
      try {
        const restored = parseObjectJson(fs.readFileSync(backup, "utf8"));
        this.logger?.warn("Settings file invalid; using last backup", error?.message);
        return restored;
      } catch {
        return {};
      }
    }
  }

  writeRaw(raw) {
    atomicWriteJson(this.filePath, raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
  }

  read() {
    const raw = this.readRaw();
    return {
      ...DEFAULTS,
      ...raw,
      tokenStored: Boolean(raw.bridgeTokenEncrypted),
      tiktoolKeyStored: Boolean(raw.tiktoolApiKeyEncrypted),
      deviceLinkPending: Boolean(raw.deviceLinkId && raw.deviceLinkSecretEncrypted && raw.deviceLinkBridgeTokenEncrypted),
      deviceLink: raw.deviceLinkId ? {
        id: String(raw.deviceLinkId || ""),
        userCode: String(raw.deviceLinkUserCode || ""),
        verificationUrl: String(raw.deviceLinkVerificationUrl || ""),
        expiresAt: String(raw.deviceLinkExpiresAt || ""),
        startedAt: String(raw.deviceLinkStartedAt || "")
      } : null
    };
  }

  publicSettings() {
    const data = this.read();
    delete data.bridgeTokenEncrypted;
    delete data.tiktoolApiKeyEncrypted;
    delete data.deviceLinkSecretEncrypted;
    delete data.deviceLinkBridgeTokenEncrypted;
    return data;
  }

  decrypt(field) {
    const raw = this.readRaw();
    const value = raw[field];
    if (!value) return "";
    try {
      if (!this.safeStorage.isEncryptionAvailable()) return "";
      return this.safeStorage.decryptString(Buffer.from(value, "base64"));
    } catch (error) {
      this.logger?.warn(`Secret ${field} could not be decrypted`, error?.message);
      return "";
    }
  }

  encrypt(value) {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error("Sichere Betriebssystem-Verschlüsselung ist nicht verfügbar.");
    }
    return this.safeStorage.encryptString(String(value)).toString("base64");
  }

  getToken() { return this.decrypt("bridgeTokenEncrypted"); }
  getTikToolKey() { return this.decrypt("tiktoolApiKeyEncrypted"); }

  save(input = {}) {
    const current = this.readRaw();
    const provider = ["mock", "tiktool"].includes(input.provider) ? input.provider : (current.provider || "mock");
    const next = {
      ...DEFAULTS,
      ...current,
      backendUrl: String(input.backendUrl || current.backendUrl || DEFAULTS.backendUrl).trim().replace(/\/+$/, ""),
      machineName: String(input.machineName ?? current.machineName ?? "").trim().slice(0, 120),
      autoStart: typeof input.autoStart === "boolean" ? input.autoStart : Boolean(current.autoStart),
      startMinimized: typeof input.startMinimized === "boolean" ? input.startMinimized : Boolean(current.startMinimized),
      provider,
      tiktokUsername: String(input.tiktokUsername ?? current.tiktokUsername ?? "").trim().replace(/^@/,"").slice(0, 80),
      ttsEnabled: typeof input.ttsEnabled === "boolean" ? input.ttsEnabled : current.ttsEnabled !== false,
      ttsRate: Math.max(0.5, Math.min(2, Number(input.ttsRate ?? current.ttsRate ?? 1))),
      ttsPitch: Math.max(0.5, Math.min(2, Number(input.ttsPitch ?? current.ttsPitch ?? 1))),
      ttsVolume: Math.max(0, Math.min(1, Number(input.ttsVolume ?? current.ttsVolume ?? 1))),
      ttsVoiceName: String(input.ttsVoiceName ?? current.ttsVoiceName ?? "").trim().slice(0, 180),
      autoUpdate: typeof input.autoUpdate === "boolean" ? input.autoUpdate : current.autoUpdate !== false,
      updateChannel: input.updateChannel === "beta" ? "beta" : "stable",
      autoRecoverLive: typeof input.autoRecoverLive === "boolean" ? input.autoRecoverLive : current.autoRecoverLive !== false,
      setupVersion: Math.max(0, Math.min(99, Number(input.setupVersion ?? current.setupVersion ?? 0) || 0)),
      setupCompletedAt: String(input.setupCompletedAt ?? current.setupCompletedAt ?? "").slice(0, 60)
    };

    const bridgeToken = String(input.bridgeToken || "").trim();
    if (bridgeToken) {
      if (!/^cfsb_[A-Za-z0-9_-]{20,}$/.test(bridgeToken)) throw new Error("Der Bridge-Schlüssel hat kein gültiges Format.");
      next.bridgeTokenEncrypted = this.encrypt(bridgeToken);
    }

    const providerKey = String(input.tiktoolApiKey || "").trim();
    if (providerKey) {
      if (providerKey.length < 12 || providerKey.length > 500) throw new Error("Der Provider API-Key hat kein gültiges Format.");
      next.tiktoolApiKeyEncrypted = this.encrypt(providerKey);
    }

    this.writeRaw(next);
    return this.publicSettings();
  }

  markSetupComplete(version = 1) {
    return this.save({
      setupVersion: Math.max(1, Number(version) || 1),
      setupCompletedAt: new Date().toISOString()
    });
  }

  resetSetup() {
    const raw = this.readRaw();
    raw.setupVersion = 0;
    raw.setupCompletedAt = "";
    this.writeRaw(raw);
    return this.publicSettings();
  }

  savePendingDeviceLink(link = {}) {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error("Sichere Betriebssystem-Verschlüsselung ist für den Device-Link erforderlich.");
    }
    const id = String(link.device_link_id || "");
    const secret = String(link.device_secret || "");
    const bridgeToken = String(link.bridge_token || "");
    if (!id || !/^cfsd_[A-Za-z0-9_-]{20,}$/.test(secret) || !/^cfsb_[A-Za-z0-9_-]{20,}$/.test(bridgeToken)) {
      throw new Error("Ungültige Device-Link-Daten.");
    }
    const raw = this.readRaw();
    raw.deviceLinkId = id;
    raw.deviceLinkUserCode = String(link.user_code || "");
    raw.deviceLinkVerificationUrl = String(link.verification_url || "");
    raw.deviceLinkExpiresAt = String(link.expires_at || "");
    raw.deviceLinkStartedAt = new Date().toISOString();
    raw.deviceLinkSecretEncrypted = this.encrypt(secret);
    raw.deviceLinkBridgeTokenEncrypted = this.encrypt(bridgeToken);
    this.writeRaw(raw);
    return this.publicSettings();
  }

  getPendingDeviceLink() {
    const raw = this.readRaw();
    if (!raw.deviceLinkId || !raw.deviceLinkSecretEncrypted || !raw.deviceLinkBridgeTokenEncrypted) return null;
    return {
      deviceLinkId:String(raw.deviceLinkId || ""),
      userCode:String(raw.deviceLinkUserCode || ""),
      verificationUrl:String(raw.deviceLinkVerificationUrl || ""),
      expiresAt:String(raw.deviceLinkExpiresAt || ""),
      startedAt:String(raw.deviceLinkStartedAt || ""),
      deviceSecret:this.decrypt("deviceLinkSecretEncrypted"),
      bridgeToken:this.decrypt("deviceLinkBridgeTokenEncrypted")
    };
  }

  completeDeviceLink() {
    const raw = this.readRaw();
    if (!raw.deviceLinkBridgeTokenEncrypted) {
      throw new Error("Kein bestätigter Device-Link vorhanden.");
    }
    raw.bridgeTokenEncrypted = raw.deviceLinkBridgeTokenEncrypted;
    delete raw.deviceLinkId;
    delete raw.deviceLinkUserCode;
    delete raw.deviceLinkVerificationUrl;
    delete raw.deviceLinkExpiresAt;
    delete raw.deviceLinkStartedAt;
    delete raw.deviceLinkSecretEncrypted;
    delete raw.deviceLinkBridgeTokenEncrypted;
    this.writeRaw(raw);
    return this.publicSettings();
  }

  clearPendingDeviceLink() {
    const raw = this.readRaw();
    delete raw.deviceLinkId;
    delete raw.deviceLinkUserCode;
    delete raw.deviceLinkVerificationUrl;
    delete raw.deviceLinkExpiresAt;
    delete raw.deviceLinkStartedAt;
    delete raw.deviceLinkSecretEncrypted;
    delete raw.deviceLinkBridgeTokenEncrypted;
    this.writeRaw(raw);
    return this.publicSettings();
  }

  clearToken() {
    const raw = this.readRaw();
    delete raw.bridgeTokenEncrypted;
    this.writeRaw(raw);
  }

  clearProviderKey() {
    const raw = this.readRaw();
    delete raw.tiktoolApiKeyEncrypted;
    this.writeRaw(raw);
  }
}

module.exports = { ConfigStore, DEFAULTS, atomicWriteJson, parseObjectJson };
