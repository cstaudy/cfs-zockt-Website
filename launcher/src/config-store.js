const fs = require("node:fs");
const path = require("node:path");

function parseObjectJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Ungültige Einstellungen.");
  return parsed;
}


const STREAM_AUDIO_SOURCE_KEYS = Object.freeze(["mic","game","discord","music","alerts"]);
function normalizeStreamAudioSources(input={},fallback={}) {
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const previous=fallback&&typeof fallback==="object"&&!Array.isArray(fallback)?fallback:{};
  const out={};
  for(const key of STREAM_AUDIO_SOURCE_KEYS){
    const raw=source[key]&&typeof source[key]==="object"&&!Array.isArray(source[key])?source[key]:{};
    const old=previous[key]&&typeof previous[key]==="object"&&!Array.isArray(previous[key])?previous[key]:{};
    const enabled=typeof raw.enabled==="boolean"?raw.enabled:old.enabled===true;
    const volume=Math.max(0,Math.min(2,Number(raw.volume??old.volume??1)));
    const muted=typeof raw.muted==="boolean"?raw.muted:old.muted===true;
    const delayMs=Math.max(0,Math.min(2000,Math.round(Number(raw.delayMs??old.delayMs??0)||0)));
    if(key==="mic")out[key]={enabled,deviceName:String(raw.deviceName??old.deviceName??"").trim().slice(0,220),volume,muted,delayMs};
    else out[key]={enabled,processId:Math.max(0,Math.min(0x7fffffff,Math.round(Number(raw.processId??old.processId??0)||0))),processName:String(raw.processName??old.processName??"").trim().slice(0,160),includeTree:raw.includeTree!==false,volume,muted,delayMs};
  }
  return out;
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
  setupCompletedAt: "",
  streamCaptureType: "screen",
  streamWindowTitle: "",
  streamGameProcessId: 0,
  streamGameProcessName: "",
  streamGameWindowTitle: "",
  streamDisplayId: "",
  streamCropEnabled: false,
  streamCropX: 0,
  streamCropY: 0,
  streamCropWidth: 1920,
  streamCropHeight: 1080,
  streamVideoDevice: "",
  streamAudioDevice: "",
  streamAudioDevice2: "",
  streamAudioVolume: 1,
  streamAudioVolume2: 1,
  streamAudioMute: false,
  streamAudioMute2: false,
  streamAudioDelayMs: 0,
  streamAudioDelayMs2: 0,
  streamAudioSources: normalizeStreamAudioSources({
    mic:{enabled:false},game:{enabled:false},discord:{enabled:false},music:{enabled:false},alerts:{enabled:false}
  }),
  streamWatchdogEnabled: true,
  streamWatchdogTimeoutSec: 18,
  streamDrawMouse: true,
  streamRecordingEnabled: false
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
      setupCompletedAt: String(input.setupCompletedAt ?? current.setupCompletedAt ?? "").slice(0, 60),
      streamCaptureType: ["screen","window","game","camera"].includes(input.streamCaptureType) ? input.streamCaptureType : (["screen","window","game","camera"].includes(current.streamCaptureType) ? current.streamCaptureType : "screen"),
      streamWindowTitle: String(input.streamWindowTitle ?? current.streamWindowTitle ?? "").trim().slice(0, 220),
      streamGameProcessId: Math.max(0, Math.min(0x7fffffff, Math.round(Number(input.streamGameProcessId ?? current.streamGameProcessId ?? 0) || 0))),
      streamGameProcessName: String(input.streamGameProcessName ?? current.streamGameProcessName ?? "").trim().slice(0, 160),
      streamGameWindowTitle: String(input.streamGameWindowTitle ?? current.streamGameWindowTitle ?? "").trim().slice(0, 220),
      streamDisplayId: String(input.streamDisplayId ?? current.streamDisplayId ?? "").trim().slice(0, 80),
      streamCropEnabled: typeof input.streamCropEnabled === "boolean" ? input.streamCropEnabled : current.streamCropEnabled === true,
      streamCropX: Math.max(0, Math.min(10000, Math.round(Number(input.streamCropX ?? current.streamCropX ?? 0) || 0))),
      streamCropY: Math.max(0, Math.min(10000, Math.round(Number(input.streamCropY ?? current.streamCropY ?? 0) || 0))),
      streamCropWidth: Math.max(64, Math.min(7680, Math.round(Number(input.streamCropWidth ?? current.streamCropWidth ?? 1920) || 1920))),
      streamCropHeight: Math.max(64, Math.min(4320, Math.round(Number(input.streamCropHeight ?? current.streamCropHeight ?? 1080) || 1080))),
      streamVideoDevice: String(input.streamVideoDevice ?? current.streamVideoDevice ?? "").trim().slice(0, 220),
      streamAudioDevice: String(input.streamAudioDevice ?? current.streamAudioDevice ?? "").trim().slice(0, 220),
      streamAudioDevice2: String(input.streamAudioDevice2 ?? current.streamAudioDevice2 ?? "").trim().slice(0, 220),
      streamAudioVolume: Math.max(0, Math.min(2, Number(input.streamAudioVolume ?? current.streamAudioVolume ?? 1))),
      streamAudioVolume2: Math.max(0, Math.min(2, Number(input.streamAudioVolume2 ?? current.streamAudioVolume2 ?? 1))),
      streamAudioMute: typeof input.streamAudioMute === "boolean" ? input.streamAudioMute : current.streamAudioMute === true,
      streamAudioMute2: typeof input.streamAudioMute2 === "boolean" ? input.streamAudioMute2 : current.streamAudioMute2 === true,
      streamAudioDelayMs: Math.max(0, Math.min(2000, Math.round(Number(input.streamAudioDelayMs ?? current.streamAudioDelayMs ?? 0) || 0))),
      streamAudioDelayMs2: Math.max(0, Math.min(2000, Math.round(Number(input.streamAudioDelayMs2 ?? current.streamAudioDelayMs2 ?? 0) || 0))),
      streamAudioSources: normalizeStreamAudioSources(input.streamAudioSources ?? current.streamAudioSources ?? {}, current.streamAudioSources ?? {}),
      streamWatchdogEnabled: typeof input.streamWatchdogEnabled === "boolean" ? input.streamWatchdogEnabled : current.streamWatchdogEnabled !== false,
      streamWatchdogTimeoutSec: Math.max(10, Math.min(60, Math.round(Number(input.streamWatchdogTimeoutSec ?? current.streamWatchdogTimeoutSec ?? 18) || 18))),
      streamDrawMouse: typeof input.streamDrawMouse === "boolean" ? input.streamDrawMouse : current.streamDrawMouse !== false,
      streamRecordingEnabled: typeof input.streamRecordingEnabled === "boolean" ? input.streamRecordingEnabled : current.streamRecordingEnabled === true
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

module.exports = { ConfigStore, DEFAULTS, atomicWriteJson, parseObjectJson, normalizeStreamAudioSources, STREAM_AUDIO_SOURCE_KEYS };
