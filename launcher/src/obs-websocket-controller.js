"use strict";

const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");
const { cleanUrl: cleanBrowserSourceUrl, redactUrl } = require("./obs-doctor");

const DEFAULT_OBS_WEBSOCKET_URL = "ws://127.0.0.1:4455";
const EVENT_SUBSCRIPTIONS = 1 | 4; // General + Scenes only.
const ALLOWED_REQUESTS = new Set([
  "GetVersion",
  "GetSceneList",
  "GetCurrentProgramScene",
  "SetCurrentProgramScene",
  "GetInputList",
  "GetInputSettings",
  "SetInputSettings",
  "CreateInput"
]);

function localHost(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function normalizeObsWebSocketUrl(raw = DEFAULT_OBS_WEBSOCKET_URL) {
  const value = String(raw || DEFAULT_OBS_WEBSOCKET_URL).trim();
  let url;
  try { url = new URL(value); }
  catch { throw new Error("Die OBS WebSocket-Adresse ist ungültig."); }
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error("OBS WebSocket muss ws:// oder wss:// verwenden.");
  if (url.username || url.password) throw new Error("OBS Zugangsdaten dürfen nicht in der WebSocket-URL stehen.");
  if (url.search || url.hash) throw new Error("OBS WebSocket-URLs dürfen keine Query- oder Fragment-Daten enthalten.");
  if (url.protocol === 'ws:' && !localHost(url.hostname)) {
    throw new Error("Unverschlüsseltes OBS WebSocket (ws://) ist nur auf localhost erlaubt. Für entfernte Hosts ist wss:// erforderlich.");
  }
  if (!url.port) url.port = "4455";
  return url.toString().replace(/\/$/, "");
}

function sha256Base64(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("base64");
}

function computeObsAuthentication(password, salt, challenge) {
  const secret = sha256Base64(`${String(password || "")}${String(salt || "")}`);
  return sha256Base64(`${secret}${String(challenge || "")}`);
}

function cleanText(value, max = 180) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

class ObsWebSocketController extends EventEmitter {
  constructor({ logger = null, WebSocketImpl = globalThis.WebSocket, reconnect = true } = {}) {
    super();
    this.logger = logger;
    this.WebSocketImpl = WebSocketImpl;
    this.reconnectEnabled = reconnect !== false;
    this.socket = null;
    this.status = "idle";
    this.url = DEFAULT_OBS_WEBSOCKET_URL;
    this.password = "";
    this.desiredConnected = false;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.connectTimer = null;
    this.pending = new Map();
    this.connectWaiters = [];
    this.obsVersion = "";
    this.websocketVersion = "";
    this.currentScene = "";
    this.scenes = [];
    this.browserSources = [];
    this.lastConnectedAt = null;
    this.lastDisconnectedAt = null;
    this.lastError = "";
  }

  snapshot() {
    return {
      available: typeof this.WebSocketImpl === "function",
      status: this.status,
      connected: this.status === "connected",
      desiredConnected: this.desiredConnected,
      url: this.url,
      obsVersion: this.obsVersion,
      websocketVersion: this.websocketVersion,
      currentScene: this.currentScene,
      scenes: this.scenes.map(item => ({ sceneName:item.sceneName, sceneUuid:item.sceneUuid || "" })),
      browserSources: this.browserSources.map(item => ({ inputName:item.inputName, inputUuid:item.inputUuid || "", inputKind:item.inputKind || "browser_source" })),
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastError: this.lastError,
      reconnectAttempt: this.reconnectAttempt,
      passwordExposed: false,
      requestPolicy: "allowlist",
      allowedRequests: [...ALLOWED_REQUESTS]
    };
  }

  notify() { this.emit("state", this.snapshot()); }

  async connect({ url = DEFAULT_OBS_WEBSOCKET_URL, password = "", timeoutMs = 8000 } = {}) {
    if (typeof this.WebSocketImpl !== "function") throw new Error("WebSocket ist in dieser Launcher-Runtime nicht verfügbar.");
    const normalized = normalizeObsWebSocketUrl(url);
    this.desiredConnected = true;
    this.url = normalized;
    this.password = String(password || "");
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;

    if (this.status === "connected" && this.socket) return this.snapshot();
    if (this.status === "connecting") return this.waitForConnect(timeoutMs);

    this.status = "connecting";
    this.lastError = "";
    this.notify();
    const socket = new this.WebSocketImpl(normalized);
    this.socket = socket;
    this.bindSocket(socket);
    this.connectTimer = setTimeout(() => {
      if (this.socket === socket && this.status === "connecting") {
        this.lastError = "OBS WebSocket-Verbindung hat das Zeitlimit überschritten.";
        try { socket.close(4000, "connect_timeout"); } catch {}
      }
    }, Math.max(1500, Math.min(20000, Number(timeoutMs) || 8000)));
    this.connectTimer.unref?.();
    return this.waitForConnect(timeoutMs + 500);
  }

  waitForConnect(timeoutMs = 8500) {
    if (this.status === "connected") return Promise.resolve(this.snapshot());
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject, timer:null };
      waiter.timer = setTimeout(() => {
        this.connectWaiters = this.connectWaiters.filter(item => item !== waiter);
        reject(new Error(this.lastError || "OBS WebSocket konnte nicht verbunden werden."));
      }, Math.max(1000, Number(timeoutMs) || 8500));
      waiter.timer.unref?.();
      this.connectWaiters.push(waiter);
    });
  }

  resolveConnectWaiters(error = null) {
    const waiters = this.connectWaiters.splice(0);
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      if (error) waiter.reject(error);
      else waiter.resolve(this.snapshot());
    }
  }

  bindSocket(socket) {
    const on = (name, fn) => {
      if (typeof socket.addEventListener === "function") socket.addEventListener(name, fn);
      else if (typeof socket.on === "function") socket.on(name, fn);
    };
    on("message", event => this.handleMessage(event?.data ?? event, socket));
    on("close", event => this.handleClose(event, socket));
    on("error", event => {
      if (socket !== this.socket) return;
      const message = cleanText(event?.message || "OBS WebSocket Netzwerkfehler.", 400);
      this.lastError = message || "OBS WebSocket Netzwerkfehler.";
      this.notify();
    });
  }

  send(payload) {
    if (!this.socket || typeof this.socket.send !== "function") throw new Error("OBS WebSocket ist nicht verbunden.");
    this.socket.send(JSON.stringify(payload));
  }

  async handleMessage(raw, socket) {
    if (socket !== this.socket) return;
    let message;
    try { message = JSON.parse(typeof raw === "string" ? raw : Buffer.from(raw).toString("utf8")); }
    catch { return; }
    const op = Number(message?.op);
    const data = message?.d || {};

    if (op === 0) {
      const identify = { rpcVersion:Math.min(1, Math.max(1, Number(data.rpcVersion) || 1)), eventSubscriptions:EVENT_SUBSCRIPTIONS };
      if (data.authentication) {
        if (!this.password) {
          this.lastError = "OBS verlangt ein WebSocket-Passwort.";
          try { socket.close(4001, "authentication_required"); } catch {}
          return;
        }
        identify.authentication = computeObsAuthentication(this.password, data.authentication.salt, data.authentication.challenge);
      }
      this.send({ op:1, d:identify });
      return;
    }

    if (op === 2) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
      this.status = "connected";
      this.reconnectAttempt = 0;
      this.lastConnectedAt = new Date().toISOString();
      this.lastError = "";
      this.resolveConnectWaiters();
      this.notify();
      this.refresh().catch(error => {
        this.lastError = cleanText(error?.message || error, 400);
        this.notify();
      });
      return;
    }

    if (op === 5) {
      const type = String(data.eventType || "");
      if (type === "CurrentProgramSceneChanged") {
        this.currentScene = cleanText(data.eventData?.sceneName || data.eventData?.sceneUuid || "", 180);
        this.notify();
      } else if (["SceneCreated","SceneRemoved","SceneNameChanged","SceneListChanged"].includes(type)) {
        this.refreshScenes().catch(() => {});
      }
      return;
    }

    if (op === 7) {
      const requestId = String(data.requestId || "");
      const pending = this.pending.get(requestId);
      if (!pending) return;
      this.pending.delete(requestId);
      clearTimeout(pending.timer);
      if (data.requestStatus?.result === true) pending.resolve(data.responseData || {});
      else {
        const error = new Error(cleanText(data.requestStatus?.comment || `${pending.requestType} wurde von OBS abgelehnt.`, 500));
        error.code = `obs_request_${Number(data.requestStatus?.code || 0)}`;
        pending.reject(error);
      }
    }
  }

  handleClose(event, socket) {
    if (socket !== this.socket) return;
    clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.socket = null;
    const wasConnecting = this.status === "connecting";
    this.status = "disconnected";
    this.lastDisconnectedAt = new Date().toISOString();
    if (!this.lastError && event?.reason) this.lastError = cleanText(event.reason, 400);
    const error = new Error(this.lastError || "OBS WebSocket-Verbindung wurde getrennt.");
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    if (wasConnecting) this.resolveConnectWaiters(error);
    this.notify();
    if (this.desiredConnected && this.reconnectEnabled) this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectTimer || !this.desiredConnected) return;
    this.reconnectAttempt += 1;
    const delay = Math.min(30000, 1000 * (2 ** Math.min(5, this.reconnectAttempt - 1)));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.desiredConnected) return;
      this.connect({ url:this.url, password:this.password }).catch(() => {});
    }, delay);
    this.reconnectTimer.unref?.();
  }

  async disconnect({ forget = false } = {}) {
    this.desiredConnected = false;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    clearTimeout(this.connectTimer);
    this.connectTimer = null;
    const socket = this.socket;
    this.socket = null;
    this.status = "idle";
    this.reconnectAttempt = 0;
    if (forget) this.password = "";
    try { socket?.close?.(1000, "client_disconnect"); } catch {}
    this.resolveConnectWaiters(new Error("OBS WebSocket-Verbindung wurde beendet."));
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("OBS WebSocket-Verbindung wurde beendet."));
    }
    this.pending.clear();
    this.notify();
    return this.snapshot();
  }

  request(requestType, requestData = {}, timeoutMs = 5000) {
    const type = String(requestType || "");
    if (!ALLOWED_REQUESTS.has(type)) throw new Error(`OBS Request ${type || "(leer)"} ist im Launcher nicht erlaubt.`);
    if (this.status !== "connected" || !this.socket) throw new Error("OBS WebSocket ist nicht verbunden.");
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`OBS Request ${type} hat das Zeitlimit überschritten.`));
      }, Math.max(1000, Math.min(15000, Number(timeoutMs) || 5000)));
      timer.unref?.();
      this.pending.set(requestId, { requestType:type, resolve, reject, timer });
      try { this.send({ op:6, d:{ requestType:type, requestId, requestData } }); }
      catch (error) { clearTimeout(timer); this.pending.delete(requestId); reject(error); }
    });
  }

  async refreshScenes() {
    const [sceneList, current] = await Promise.all([
      this.request("GetSceneList"),
      this.request("GetCurrentProgramScene")
    ]);
    this.scenes = (Array.isArray(sceneList.scenes) ? sceneList.scenes : []).map(item => ({
      sceneName:cleanText(item.sceneName, 180),
      sceneUuid:cleanText(item.sceneUuid, 180)
    })).filter(item => item.sceneName);
    this.currentScene = cleanText(current.sceneName || current.currentProgramSceneName || "", 180);
    this.notify();
    return this.snapshot();
  }

  async refresh() {
    const [version, inputList] = await Promise.all([
      this.request("GetVersion"),
      this.request("GetInputList")
    ]);
    this.obsVersion = cleanText(version.obsVersion || "", 80);
    this.websocketVersion = cleanText(version.obsWebSocketVersion || "", 80);
    this.browserSources = (Array.isArray(inputList.inputs) ? inputList.inputs : []).filter(item => String(item.inputKind || "") === "browser_source").map(item => ({
      inputName:cleanText(item.inputName, 180),
      inputUuid:cleanText(item.inputUuid, 180),
      inputKind:"browser_source"
    })).filter(item => item.inputName);
    await this.refreshScenes();
    return this.snapshot();
  }

  async switchScene(sceneName) {
    const name = cleanText(sceneName, 180);
    if (!name) throw new Error("Bitte eine OBS-Szene auswählen.");
    if (!this.scenes.some(item => item.sceneName === name)) await this.refreshScenes();
    if (!this.scenes.some(item => item.sceneName === name)) throw new Error("Die ausgewählte OBS-Szene wurde nicht gefunden.");
    await this.request("SetCurrentProgramScene", { sceneName:name });
    this.currentScene = name;
    this.notify();
    return this.snapshot();
  }

  async updateBrowserSource(inputName, rawUrl) {
    const name = cleanText(inputName, 180);
    if (!name) throw new Error("Bitte eine OBS Browser Source auswählen.");
    const url = cleanBrowserSourceUrl(rawUrl);
    const current = await this.request("GetInputSettings", { inputName:name });
    if (String(current.inputKind || "") !== "browser_source") throw new Error("Die ausgewählte OBS-Quelle ist keine Browser Source.");
    await this.request("SetInputSettings", {
      inputName:name,
      inputSettings:{ url:url.toString() },
      overlay:true
    });
    return { ok:true, inputName:name, url:redactUrl(url), updatedAt:new Date().toISOString() };
  }

  async installBrowserSource({ sceneName = "", inputName = "", url:rawUrl = "", width = 600, height = 120 } = {}) {
    if (this.status !== "connected") throw new Error("OBS WebSocket ist nicht verbunden.");
    const scene = cleanText(sceneName || this.currentScene, 180);
    if (!scene) throw new Error("In OBS ist keine aktive Program-Szene ausgewählt.");
    if (!this.scenes.some(item => item.sceneName === scene)) await this.refreshScenes();
    if (!this.scenes.some(item => item.sceneName === scene)) throw new Error("Die aktive OBS-Szene wurde nicht gefunden.");

    const url = cleanBrowserSourceUrl(rawUrl);
    const baseName = cleanText(inputName || "cfs_zockt Widget", 150) || "cfs_zockt Widget";
    await this.refresh();
    const existing = this.browserSources.find(item => item.inputName === baseName);
    const safeWidth = Math.max(1, Math.min(4096, Math.round(Number(width) || 600)));
    const safeHeight = Math.max(1, Math.min(4096, Math.round(Number(height) || 120)));

    if (existing) {
      await this.request("SetInputSettings", {
        inputName:baseName,
        inputSettings:{ url:url.toString(), width:safeWidth, height:safeHeight },
        overlay:true
      });
      return { ok:true, created:false, sceneName:scene, inputName:baseName, url:redactUrl(url), width:safeWidth, height:safeHeight, updatedAt:new Date().toISOString() };
    }

    await this.request("CreateInput", {
      sceneName:scene,
      inputName:baseName,
      inputKind:"browser_source",
      inputSettings:{ url:url.toString(), width:safeWidth, height:safeHeight },
      sceneItemEnabled:true
    });
    await this.refresh();
    return { ok:true, created:true, sceneName:scene, inputName:baseName, url:redactUrl(url), width:safeWidth, height:safeHeight, updatedAt:new Date().toISOString() };
  }
}

module.exports = {
  ObsWebSocketController,
  DEFAULT_OBS_WEBSOCKET_URL,
  ALLOWED_REQUESTS,
  EVENT_SUBSCRIPTIONS,
  normalizeObsWebSocketUrl,
  computeObsAuthentication
};
