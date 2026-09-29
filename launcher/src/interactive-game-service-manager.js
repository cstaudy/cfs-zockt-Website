"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const http = require("node:http");

function text(value, max = 120) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function safeId(value) {
  return text(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
}
function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
function canonicalCatalog(rows = []) {
  return JSON.stringify((Array.isArray(rows) ? rows : []).map(row => ({
    id: row.id,
    name: row.name,
    version: row.version,
    category: row.category,
    events: row.events
  })).sort((a, b) => a.id.localeCompare(b.id)));
}

class InteractiveGameServiceManager {
  constructor({ logger = null, serviceRoot, userDataPath, port = 8787 } = {}) {
    this.logger = logger;
    this.serviceRoot = path.resolve(String(serviceRoot || "."));
    this.userDataPath = path.resolve(String(userDataPath || "."));
    this.port = Math.max(1024, Math.min(65535, Number(port) || 8787));
    this.child = null;
    this.activeGame = "";
    this.terminalId = "";
    this.token = crypto.randomBytes(32).toString("hex");
    this.lastError = "";
    this.startedAt = null;
    this.lastCatalogAt = null;
    this.forwarded = 0;
    this.failed = 0;
  }

  serverPath() { return path.join(this.serviceRoot, "server.js"); }
  available() {
    try { return fs.existsSync(this.serverPath()) && fs.statSync(this.serverPath()).isFile(); }
    catch { return false; }
  }

  catalogSnapshot() {
    const roots = [path.join(this.serviceRoot, "games"), path.join(this.serviceRoot, "public", "games")];
    const out = [];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      let entries = [];
      try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const manifest = path.join(root, entry.name, "game.json");
        try {
          const raw = JSON.parse(fs.readFileSync(manifest, "utf8"));
          const id = safeId(raw.id || entry.name);
          if (!id || out.some(item => item.id === id)) continue;
          const events = Array.isArray(raw.events) ? raw.events.slice(0, 20).map(safeId).filter(Boolean) : [];
          out.push({
            id,
            name: text(raw.name || raw.label || id, 80),
            label: text(raw.label || raw.name || id, 80),
            version: text(raw.version || "1.0.0", 30),
            category: safeId(raw.category || "community") || "community",
            events,
            runtime: "local",
            secrets_required: false
          });
        } catch {}
      }
    }
    this.lastCatalogAt = new Date().toISOString();
    return out.sort((a, b) => a.id.localeCompare(b.id)).slice(0, 100);
  }

  catalog() { return this.catalogSnapshot(); }
  catalogHash() { return sha256(canonicalCatalog(this.catalogSnapshot())); }
  activeManifest(catalog = null) {
    const rows = Array.isArray(catalog) ? catalog : this.catalogSnapshot();
    return rows.find(item => item.id === this.activeGame) || null;
  }

  snapshot() {
    const modules = this.catalogSnapshot();
    const available = this.available();
    const running = Boolean(this.child && !this.child.killed && this.child.exitCode === null);
    const activeManifest = this.activeManifest(modules);
    return {
      available,
      ready: available && modules.length > 0,
      running,
      status: !available ? "not_installed" : running ? "running" : "ready",
      port: this.port,
      baseUrl: `http://127.0.0.1:${this.port}`,
      overlayUrl: `http://127.0.0.1:${this.port}/overlay.html`,
      activeGame: this.activeGame,
      activeManifest,
      terminalId: this.terminalId,
      managed: true,
      catalogHash: sha256(canonicalCatalog(modules)),
      modules,
      catalog: modules,
      lastCatalogAt: this.lastCatalogAt,
      lastError: this.lastError,
      startedAt: this.startedAt,
      forwarded: this.forwarded,
      failed: this.failed,
      secrets_exposed: false,
      service_token_exposed: false,
      raw_provider_credentials_exposed: false,
      bind_address: "127.0.0.1"
    };
  }

  request(method, route, payload = {}, { timeoutMs = 3000 } = {}) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload || {});
      const req = http.request({
        hostname: "127.0.0.1",
        port: this.port,
        path: route,
        method,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "x-cfs-local-token": this.token
        },
        timeout: Math.max(500, Math.min(10000, Number(timeoutMs) || 3000))
      }, res => {
        let data = "";
        res.on("data", chunk => { if (data.length < 100000) data += chunk; });
        res.on("end", () => {
          let parsed = {};
          try { parsed = JSON.parse(data || "{}"); } catch {}
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
          reject(new Error(text(parsed?.error || `Interactive Games HTTP ${res.statusCode}`, 300)));
        });
      });
      req.on("timeout", () => req.destroy(new Error("Interactive Games Timeout")));
      req.on("error", reject);
      req.end(body);
    });
  }

  async waitUntilReady(timeoutMs = 3000) {
    const deadline = Date.now() + Math.max(500, timeoutMs);
    let lastError = null;
    while (Date.now() < deadline) {
      try {
        const result = await this.request("GET", "/api/status", {}, { timeoutMs: 700 });
        if (result?.ok === true && result?.ready === true) return result;
      } catch (error) { lastError = error; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw lastError || new Error("Interactive Games Runtime wurde nicht rechtzeitig bereit.");
  }

  async ensureStarted() {
    if (this.child && !this.child.killed && this.child.exitCode === null) return;
    if (!this.available()) throw new Error("Interactive-Games Runtime ist in diesem Launcher-Build nicht enthalten.");
    const modules = this.catalogSnapshot();
    if (!modules.length) throw new Error("Interactive-Games Runtime enthält keine gültigen Module.");

    const dataDir = path.join(this.userDataPath, "interactive-games");
    fs.mkdirSync(dataDir, { recursive: true });
    const child = spawn(process.execPath, [this.serverPath()], {
      cwd: this.serviceRoot,
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        CFS_INTERACTIVE_GAME_HOST: "127.0.0.1",
        CFS_INTERACTIVE_GAME_PORT: String(this.port),
        CFS_INTERACTIVE_GAME_TOKEN: this.token,
        CFS_INTERACTIVE_GAME_DATA_DIR: dataDir
      }
    });
    this.child = child;
    this.startedAt = new Date().toISOString();
    this.lastError = "";
    child.once("exit", code => {
      if (this.child !== child) return;
      this.lastError = code === 0 || code === null ? "" : `Interactive Games Prozess beendet (${code}).`;
      this.child = null;
      this.activeGame = "";
      this.terminalId = "";
    });
    child.once("error", error => { this.lastError = text(error?.message || error, 300); });
    try {
      await this.waitUntilReady(3500);
    } catch (error) {
      this.lastError = text(error?.message || error, 300);
      try { child.kill(); } catch {}
      if (this.child === child) this.child = null;
      throw error;
    }
  }

  async selectGame(gameType, terminalId = "") {
    const requested = safeId(gameType);
    const requestedTerminal = safeId(terminalId);
    if (!requested && !requestedTerminal) throw new Error("Game-Typ fehlt.");
    const catalog = this.catalogSnapshot();
    const aliases = [requestedTerminal, requested, requested.replace(/_/g,"-")].filter(Boolean);
    const game = aliases.find(value => catalog.some(item => item.id === value)) || "";
    if (!game) throw new Error("Dieses Interactive Game ist nicht im lokalen Katalog enthalten.");
    await this.ensureStarted();
    const result = await this.request("POST", "/api/game/select", { game_type: game, terminal_id: requestedTerminal || game });
    this.activeGame = game;
    this.terminalId = requestedTerminal || game;
    this.lastError = "";
    return { ...this.snapshot(), result };
  }

  async pushEvent(event = {}) {
    if (!this.child || this.child.killed || this.child.exitCode !== null || !this.activeGame) return { ok: false, skipped: true };
    const safe = {
      type: safeId(event.type),
      provider: safeId(event.provider || event.source_provider),
      username: text(event.username || event.user?.uniqueId || event.user?.nickname, 80),
      gift_name: text(event.gift_name || event.giftName, 80),
      gift_count: Math.max(0, Math.min(100000, Number(event.gift_count || event.repeatCount || 0) || 0)),
      like_count: Math.max(0, Math.min(10000000, Number(event.like_count || event.likeCount || 0) || 0)),
      text: text(event.text || event.comment, 300),
      received_at: new Date().toISOString()
    };
    if (!safe.type) return { ok: false, skipped: true };
    try {
      const result = await this.request("POST", "/api/events", safe);
      this.forwarded += 1;
      this.lastError = "";
      return result;
    } catch (error) {
      this.failed += 1;
      this.lastError = text(error?.message || error, 300);
      this.logger?.warn?.("Interactive Game event delivery failed", this.lastError);
      return { ok: false, error: this.lastError };
    }
  }

  async stop() {
    const child = this.child;
    if (child && !child.killed) {
      try { await this.request("POST", "/api/shutdown", {}, { timeoutMs: 1200 }); } catch {}
      try { child.kill(); } catch {}
    }
    this.child = null;
    this.activeGame = "";
    this.terminalId = "";
    this.startedAt = null;
    return this.snapshot();
  }
}

module.exports = { InteractiveGameServiceManager };
