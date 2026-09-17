const fs = require("node:fs");
const path = require("node:path");

const MAX_TARGETS = 8;
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  let fd = null;
  try {
    fd = fs.openSync(temp, "w", 0o600);
    fs.writeFileSync(fd, payload, "utf8");
    fs.fsyncSync(fd);
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
  try { fs.chmodSync(temp, 0o600); } catch {}
  fs.renameSync(temp, filePath);
  try { fs.chmodSync(filePath, 0o600); } catch {}
}

function normalizeTargetId(value) {
  const id = String(value || "").trim();
  if (!ID_RE.test(id)) throw new Error("Ungültige Streaming-Ziel-ID.");
  return id;
}

function normalizeServerUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 800) throw new Error("RTMP/RTMPS Server-URL fehlt oder ist zu lang.");
  let url;
  try { url = new URL(raw); } catch { throw new Error("Ungültige RTMP/RTMPS Server-URL."); }
  if (!["rtmp:", "rtmps:"].includes(url.protocol)) throw new Error("Nur RTMP oder RTMPS ist als Streaming-Protokoll erlaubt.");
  if (!url.hostname) throw new Error("Streaming-Server Host fehlt.");
  if (url.username || url.password) throw new Error("Benutzername/Passwort gehören nicht in die Streaming-Server-URL.");
  if (url.hash || url.search) throw new Error("Query-Parameter und Fragmente gehören nicht in die Streaming-Server-URL.");
  return raw.replace(/\/+$/, "");
}

function normalizeStreamKey(value) {
  const key = String(value || "").trim();
  if (!key || key.length < 4 || key.length > 600) throw new Error("Stream-Key fehlt oder hat eine ungültige Länge.");
  if(/[\u0000-\u001f\u007f\s]/.test(key)) throw new Error("Stream-Key enthält unzulässige Leer- oder Steuerzeichen.");
  return key;
}

function serverLabel(serverUrl) {
  try {
    const url = new URL(serverUrl);
    return `${url.protocol}//${url.host}`;
  } catch { return ""; }
}

class StreamCredentialStore {
  constructor(filePath, safeStorage, logger) {
    this.filePath = filePath;
    this.safeStorage = safeStorage;
    this.logger = logger;
  }

  encryptionAvailable() {
    return Boolean(this.safeStorage?.isEncryptionAvailable?.());
  }

  readRaw() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      if (!parsed || parsed.schema !== 1 || typeof parsed.targets !== "object" || Array.isArray(parsed.targets)) return { schema:1, targets:{} };
      return parsed;
    } catch { return { schema:1, targets:{} }; }
  }

  writeRaw(raw) {
    atomicWriteJson(this.filePath, { schema:1, targets:raw?.targets || {} });
  }

  encrypt(value) {
    if (!this.encryptionAvailable()) throw new Error("Sichere Betriebssystem-Verschlüsselung ist für Stream-Keys erforderlich.");
    return this.safeStorage.encryptString(String(value)).toString("base64");
  }

  decrypt(value) {
    if (!value || !this.encryptionAvailable()) return "";
    try { return this.safeStorage.decryptString(Buffer.from(value, "base64")); }
    catch (error) {
      this.logger?.warn?.("Stream credential could not be decrypted", error?.message);
      return "";
    }
  }

  set(targetId, input = {}) {
    const id = normalizeTargetId(targetId);
    const serverUrl = normalizeServerUrl(input.serverUrl);
    const streamKey = normalizeStreamKey(input.streamKey);
    const raw = this.readRaw();
    if (!Object.prototype.hasOwnProperty.call(raw.targets, id) && Object.keys(raw.targets).length >= MAX_TARGETS) {
      throw new Error(`Maximal ${MAX_TARGETS} lokale Streaming-Ziele können gespeichert werden.`);
    }
    raw.targets[id] = {
      serverUrlEncrypted:this.encrypt(serverUrl),
      streamKeyEncrypted:this.encrypt(streamKey),
      serverLabel:serverLabel(serverUrl),
      updatedAt:new Date().toISOString()
    };
    this.writeRaw(raw);
    return this.publicEntry(id);
  }

  remove(targetId) {
    const id = normalizeTargetId(targetId);
    const raw = this.readRaw();
    const existed = Boolean(raw.targets[id]);
    delete raw.targets[id];
    this.writeRaw(raw);
    return existed;
  }

  get(targetId) {
    const id = normalizeTargetId(targetId);
    const raw = this.readRaw();
    const entry = raw.targets[id];
    if (!entry) return null;
    const serverUrl = this.decrypt(entry.serverUrlEncrypted);
    const streamKey = this.decrypt(entry.streamKeyEncrypted);
    if (!serverUrl || !streamKey) return null;
    return { id, serverUrl, streamKey, updatedAt:String(entry.updatedAt || "") };
  }

  publicEntry(targetId) {
    const id = normalizeTargetId(targetId);
    const entry = this.readRaw().targets[id];
    return {
      id,
      configured:Boolean(entry?.serverUrlEncrypted && entry?.streamKeyEncrypted),
      server:String(entry?.serverLabel || ""),
      updatedAt:String(entry?.updatedAt || "")
    };
  }

  snapshot(targetIds = []) {
    const raw = this.readRaw();
    const ids = Array.isArray(targetIds) && targetIds.length ? targetIds.map(String) : Object.keys(raw.targets);
    const targets = {};
    for (const candidate of ids.slice(0, MAX_TARGETS)) {
      if (!ID_RE.test(candidate)) continue;
      const entry = raw.targets[candidate];
      targets[candidate] = {
        id:candidate,
        configured:Boolean(entry?.serverUrlEncrypted && entry?.streamKeyEncrypted),
        server:String(entry?.serverLabel || ""),
        updatedAt:String(entry?.updatedAt || "")
      };
    }
    return { encryptionAvailable:this.encryptionAvailable(), targets };
  }

  clear() {
    this.writeRaw({schema:1,targets:{}});
  }
}

module.exports = {
  StreamCredentialStore,
  normalizeTargetId,
  normalizeServerUrl,
  normalizeStreamKey,
  serverLabel,
  MAX_TARGETS
};
