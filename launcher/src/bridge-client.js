const { EventEmitter } = require("node:events");
const { sanitizePayload } = require("./provider-event-normalizer");

class BridgeClient extends EventEmitter {
  constructor({ settings, token, logger, version, spool = null, streamHealthProvider = null }) {
    super();
    this.settings = settings;
    this.token = token;
    this.logger = logger;
    this.version = version;
    this.spool = spool;
    this.streamHealthProvider = typeof streamHealthProvider === "function" ? streamHealthProvider : null;
    this.liveActive = false;
    this.running = false;
    this.eventQueue = this.spool?.all?.() || [];
    this.maxQueue = 1000;
    this.heartbeatTimer = null;
    this.flushTimer = null;
    this.flushPromise = null;
    this.actionTimer = null;
    this.actionPollPromise = null;
    this.reconnectTimer = null;
    this.heartbeatEnabled = false;
    this.backoffMs = 1500;
    this.metrics = {
      enqueued: this.eventQueue.length,
      sent: 0,
      flushBatches: 0,
      flushFailures: 0,
      reconnects: 0,
      actionsReceived: 0,
      actionsAcked: 0,
      actionsNacked: 0,
      actionPollSkips: 0
    };
    this.lastState = {
      connected: false,
      bridge: null,
      live: null,
      lastError: "",
      lastHeartbeatAt: null,
      latencyMs: null,
      lastFlushAt: null,
      queuedEvents: this.eventQueue.length,
      releasePolicy: null,
      releaseCatalog: null,
      creator: null
    };
  }

  updateCredentials(settings, token) {
    this.settings = settings;
    this.token = token;
  }

  get baseUrl() {
    return String(this.settings?.backendUrl || "").replace(/\/+$/, "");
  }

  get capabilities() {
    return {
      follow: true,
      like: true,
      gift: true,
      share: true,
      viewer_update: true,
      chat: true,
      actions: true,
      tts: true,
      batch_events: true,
      provider: this.settings?.provider || "mock",
      action_leasing: true,
      session_resume_v2: true
    };
  }

  async fetchScenes() {
    const payload=await this.request("/api/bridge/widget-studio/scenes",{method:"GET",timeoutMs:8000});
    return Array.isArray(payload?.scenes)?payload.scenes:[];
  }

  async fetchLibrary() {
    return this.request("/api/bridge/widget-studio/library", {
      method:"GET",
      timeoutMs:8000
    });
  }

  async fetchStreamStudioConfig() {
    return this.request("/api/bridge/stream-studio/config", {
      method:"GET",
      timeoutMs:10000
    });
  }

  async getStreamBot() {
    return this.request("/api/bridge/widget-studio/stream-bot", { method:"GET", timeoutMs:8000 });
  }

  async saveStreamBot(streamBot = {}) {
    return this.request("/api/bridge/widget-studio/stream-bot", { method:"POST", body:{ stream_bot:streamBot }, timeoutMs:8000 });
  }

  async controlWidget(widgetId, control = {}) {
    const id=encodeURIComponent(String(widgetId||""));
    if(!id)throw new Error("Widget-ID fehlt.");
    return this.request(`/api/bridge/widget-studio/widgets/${id}/control`, { method:"POST", body:control, timeoutMs:8000 });
  }

  async logoutDevice() {
    return this.request("/api/bridge/widget-studio/logout", {
      method:"POST",
      body:{}
    });
  }
  async betaStatus(){return this.request("/api/bridge/beta/status",{method:"GET",timeoutMs:8000});}
  async startBetaSession(payload={}){return this.request("/api/bridge/beta/session/start",{method:"POST",body:payload,timeoutMs:10000});}
  async endBetaSession(payload={}){return this.request("/api/bridge/beta/session/end",{method:"POST",body:payload,timeoutMs:10000});}
  async submitBetaFeedback(payload={}){return this.request("/api/bridge/beta/feedback",{method:"POST",body:payload,timeoutMs:12000});}
  async gameRuntime(){return this.request("/api/bridge/games/runtime",{method:"GET",timeoutMs:8000});}
  async gameStart(){return this.request("/api/bridge/games/runtime/start",{method:"POST",body:{},timeoutMs:8000});}
  async gameStop(){return this.request("/api/bridge/games/runtime/stop",{method:"POST",body:{},timeoutMs:8000});}
  async gameReset(){return this.request("/api/bridge/games/runtime/reset",{method:"POST",body:{},timeoutMs:8000});}
  async gameScore(team,delta=1){return this.request("/api/bridge/games/runtime/score",{method:"POST",body:{team,delta},timeoutMs:8000});}
  async cutProjects(){return this.request("/api/bridge/cut-studio/projects",{method:"GET",timeoutMs:8000});}
  async gameRules(){return this.request("/api/bridge/games/rules",{method:"GET",timeoutMs:8000});}
  async cutJobs(){return this.request("/api/bridge/cut-studio/jobs",{method:"GET",timeoutMs:8000});}
  async claimCutJob(id){return this.request(`/api/bridge/cut-studio/jobs/${encodeURIComponent(id)}/claim`,{method:"POST",body:{},timeoutMs:8000});}
  async startCutJob(id){return this.request(`/api/bridge/cut-studio/jobs/${encodeURIComponent(id)}/processing`,{method:"POST",body:{},timeoutMs:8000});}
  async completeCutJob(id,result={}){return this.request(`/api/bridge/cut-studio/jobs/${encodeURIComponent(id)}/complete`,{method:"POST",body:{result},timeoutMs:8000});}
  async failCutJob(id,errorMessage="Media Engine Fehler"){return this.request(`/api/bridge/cut-studio/jobs/${encodeURIComponent(id)}/fail`,{method:"POST",body:{error_message:errorMessage},timeoutMs:8000});}
  async retryCutJob(id){return this.request(`/api/bridge/cut-studio/jobs/${encodeURIComponent(id)}/retry`,{method:"POST",body:{},timeoutMs:8000});}





  snapshot(extra = {}) {
    return {
      ...this.lastState,
      liveActive: this.liveActive,
      queuedEvents: this.eventQueue.length,
      spool: this.spool?.snapshot?.() || { persistent:false, pending:this.eventQueue.length, dropped:0 },
      backendUrl: this.baseUrl,
      provider: this.settings?.provider || "mock",
      metrics: { ...this.metrics },
      ...extra
    };
  }

  emitState(extra = {}) {
    this.emit("state", this.snapshot(extra));
  }

  async request(path, { method = "GET", body, timeoutMs = 8000 } = {}) {
    if (!this.baseUrl) throw new Error("Backend-URL fehlt.");
    if (!this.token) throw new Error("Bridge-Schlüssel fehlt.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || `Bridge HTTP ${response.status}`);
      }
      this.lastState.latencyMs = Math.max(0, Date.now() - startedAt);
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  heartbeatPayload() {
    let streamHealth = null;
    try { streamHealth = this.streamHealthProvider?.() || null; } catch {}
    return {
      client_version: this.version,
      machine_name: this.settings?.machineName || "",
      live_session_active: this.liveActive,
      update_channel: this.settings?.updateChannel === "beta" ? "beta" : "stable",
      capabilities: this.capabilities,
      stream_health: streamHealth
    };
  }

  async status() {
    return this.request("/api/bridge/widget-studio/status");
  }

  async selfTest() {
    const started = Date.now();
    const checks = [];
    const status = await this.status();
    checks.push({ key: "auth", ok: Boolean(status?.ok), label: "Bridge Auth" });
    checks.push({ key: "protocol", ok: Number(status?.protocol || 0) === 1, label: "Protocol V1" });

    const heartbeat = await this.heartbeat();
    checks.push({ key: "heartbeat", ok: Boolean(heartbeat?.ok), label: "Heartbeat" });
    checks.push({
      key: "server_time",
      ok: Boolean(heartbeat?.server_time),
      label: "Server-Zeit"
    });

    return {
      ok: checks.every(x => x.ok),
      duration_ms: Date.now() - started,
      checks,
      server_time: heartbeat?.server_time || status?.server_time || null,
      live: heartbeat?.live || status?.live || null
    };
  }

  async heartbeat() {
    const wasOffline = !this.lastState.connected;
    const data = await this.request("/api/bridge/widget-studio/heartbeat", {
      method: "POST",
      body: this.heartbeatPayload()
    });
    this.lastState = {
      ...this.lastState,
      connected: true,
      bridge: data.bridge || null,
      live: data.live || null,
      releasePolicy: data.release_policy || this.lastState.releasePolicy || null,
      releaseCatalog: data.release_catalog || this.lastState.releaseCatalog || null,
      creator: data.creator || this.lastState.creator || null,
      lastError: "",
      lastHeartbeatAt: new Date().toISOString()
    };
    if (wasOffline && this.lastState.lastHeartbeatAt) this.metrics.reconnects += 1;
    this.backoffMs = 1500;
    this.emitState();
    return data;
  }

  async resumeSession(sessionId, { dryRun = false } = {}) {
    let resolvedSessionId = String(sessionId || this.lastState.live?.session_id || "");
    if (!resolvedSessionId) {
      const status = await this.status();
      resolvedSessionId = String(status?.live?.session_id || "");
      this.lastState.live = status?.live || this.lastState.live;
      this.lastState.creator = status?.creator || this.lastState.creator;
      this.lastState.releasePolicy = status?.release_policy || this.lastState.releasePolicy;
      this.lastState.releaseCatalog = status?.release_catalog || this.lastState.releaseCatalog;
    }
    if (!resolvedSessionId) throw new Error("Es gibt keine bekannte LIVE Session zum Fortsetzen.");

    const data = await this.request("/api/bridge/widget-studio/session/resume", {
      method:"POST",
      body:{
        ...this.heartbeatPayload(),
        session_id:resolvedSessionId,
        dry_run:dryRun === true
      }
    });

    this.lastState = {
      ...this.lastState,
      connected:true,
      live:data.live || this.lastState.live,
      creator:data.creator || this.lastState.creator || null,
      releasePolicy:data.release_policy || this.lastState.releasePolicy || null,
      releaseCatalog:data.release_catalog || this.lastState.releaseCatalog || null,
      lastError:""
    };

    if (data.allowed === false) {
      this.emitState({ recoveryBlocked:true, recoveryReason:data.reason || "blocked" });
      const error = new Error(data.message || "LIVE Recovery wurde blockiert.");
      error.code = String(data.reason || "recovery_blocked");
      throw error;
    }

    if (!dryRun) {
      this.liveActive = true;
      this.logger?.info("LIVE session recovered", String(data.session_id || resolvedSessionId));
    }
    this.emitState({ recovered:!dryRun, recoveryProbe:dryRun });
    return data;
  }

  async startSession(payload = {}) {
    const data = await this.request("/api/bridge/widget-studio/session/start", {
      method: "POST",
      body: {
        ...this.heartbeatPayload(),
        event_key: `launcher-start-${Date.now()}`,
        payload
      }
    });
    this.liveActive = true;
    this.lastState.live = data.live || this.lastState.live;
    this.emitState();
    return data;
  }

  async endSession(payload = {}) {
    const data = await this.request("/api/bridge/widget-studio/session/end", {
      method: "POST",
      body: {
        ...this.heartbeatPayload(),
        live_session_active: false,
        event_key: `launcher-end-${Date.now()}`,
        payload
      }
    });
    this.liveActive = false;
    this.lastState.live = data.live || this.lastState.live;
    this.emitState();
    return data;
  }

  enqueueEvent(event) {
    const normalized = {
      event_key: String(event.event_key || `launcher-${event.event_type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      event_type: String(event.event_type || ""),
      actor_name: String(event.actor_name || "").slice(0, 100),
      actor_avatar: String(event.actor_avatar || "").slice(0, 2000),
      amount: Number(event.amount || 0),
      value: Number(event.value || 0),
      payload: sanitizePayload(event.payload, event.payload?.source_provider || "launcher_bridge")
    };
    if (!["follow", "like", "gift", "share", "viewer_update", "chat"].includes(normalized.event_type)) {
      throw new Error(`Unbekannter Event-Typ: ${normalized.event_type}`);
    }
    if (this.spool) {
      this.spool.push(normalized);
      this.eventQueue = this.spool.all();
    } else {
      if (!this.eventQueue.some(x => x.event_key === normalized.event_key)) this.eventQueue.push(normalized);
      if (this.eventQueue.length > this.maxQueue) {
        this.eventQueue.splice(0, this.eventQueue.length - this.maxQueue);
        this.logger?.warn("Event queue trimmed to max size.");
      }
    }
    this.metrics.enqueued += 1;
    this.emitState();
  }

  async flushEvents() {
    if (this.flushPromise) return this.flushPromise;
    if (!this.running || !this.liveActive || !this.eventQueue.length) return;

    this.flushPromise = (async () => {
      const batch = this.eventQueue.slice(0, 50);
      try {
        const data = await this.request("/api/bridge/widget-studio/events", {
          method: "POST",
          body: {
            ...this.heartbeatPayload(),
            events: batch
          }
        });
        if (this.spool) {
          this.spool.removeKeys(batch.map(x => x.event_key));
          this.eventQueue = this.spool.all();
        } else {
          const sentKeys = new Set(batch.map(x => x.event_key));
          this.eventQueue = this.eventQueue.filter(x => !sentKeys.has(x.event_key));
        }
        this.metrics.sent += batch.length;
        this.metrics.flushBatches += 1;
        this.lastState = {
          ...this.lastState,
          connected: true,
          live: data.live || this.lastState.live,
          bridge: data.bridge || this.lastState.bridge,
          lastError: "",
          lastFlushAt: new Date().toISOString()
        };
        this.emitState();
        return data;
      } catch (error) {
        this.metrics.flushFailures += 1;
        this.markOffline(error);
        return null;
      }
    })();

    try {
      return await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  async waitForFlushIdle(timeoutMs = 2500) {
    const started = Date.now();
    while (this.flushPromise && Date.now() - started < Math.max(250, Number(timeoutMs) || 2500)) {
      try { await this.flushPromise; } catch {}
      if (this.flushPromise) await new Promise(resolve => setTimeout(resolve, 20));
    }
    return !this.flushPromise;
  }

  async drainEvents(timeoutMs = 5000) {
    const started = Date.now();
    let attempts = 0;
    while (this.eventQueue.length && Date.now() - started < Math.max(500, Number(timeoutMs) || 5000)) {
      attempts += 1;
      await this.flushEvents();
      if (this.eventQueue.length) {
        await new Promise(resolve => setTimeout(resolve, Math.min(400, 80 * attempts)));
      }
    }
    return {
      ok:this.eventQueue.length === 0,
      remaining:this.eventQueue.length,
      drainedAt:new Date().toISOString(),
      durationMs:Date.now()-started,
      attempts
    };
  }

  async pollActions() {
    if (!this.running) return;
    if (this.actionPollPromise) {
      this.metrics.actionPollSkips += 1;
      return this.actionPollPromise;
    }

    this.actionPollPromise = (async () => {
      try {
        const data = await this.request("/api/bridge/widget-studio/actions?limit=20");
        if (!this.running) return data;
        for (const action of data.actions || []) {
          this.metrics.actionsReceived += 1;
          this.emit("action", action);
        }
        return data;
      } catch (error) {
        if (this.running) this.markOffline(error);
        return null;
      }
    })();

    try {
      return await this.actionPollPromise;
    } finally {
      this.actionPollPromise = null;
    }
  }

  async ackActions(ids) {
    const safe = [...new Set((ids || []).map(String).filter(Boolean))].slice(0, 50);
    if (!safe.length) return { ok: true, acked: 0 };
    const result = await this.request("/api/bridge/widget-studio/actions/ack", {
      method: "POST",
      body: { ids: safe }
    });
    this.metrics.actionsAcked += safe.length;
    return result;
  }

  async nackActions(ids, error = "tts_failed") {
    const safe = [...new Set((ids || []).map(String).filter(Boolean))].slice(0, 50);
    if (!safe.length) return { ok:true, nacked:0 };
    const result = await this.request("/api/bridge/widget-studio/actions/nack", {
      method:"POST",
      body:{ ids:safe, error:String(error || "tts_failed").slice(0,300) }
    });
    this.metrics.actionsNacked += Number(result?.nacked || safe.length);
    return result;
  }

  markOffline(error) {
    const message = error?.name === "AbortError" ? "Zeitüberschreitung zum Backend." : String(error?.message || error || "Bridge offline");
    this.lastState = { ...this.lastState, connected: false, lastError: message };
    this.logger?.warn("Bridge connection problem", message);
    this.emitState();
  }

  async connect() {
    try {
      await this.heartbeat();
      return this.snapshot();
    } catch (error) {
      this.markOffline(error);
      throw error;
    }
  }

  async heartbeatLoop() {
    if (!this.running || !this.heartbeatEnabled) return;
    try {
      await this.heartbeat();
    } catch (error) {
      this.markOffline(error);
    } finally {
      if (!this.running || !this.heartbeatEnabled) return;
      const wait = this.lastState.connected ? 10000 : Math.min(30000, this.backoffMs);
      if (!this.lastState.connected) this.backoffMs = Math.min(30000, Math.round(this.backoffMs * 1.7));
      this.heartbeatTimer = setTimeout(() => this.heartbeatLoop(), wait);
    }
  }

  enableHeartbeat() {
    if (!this.running || this.heartbeatEnabled) return;
    this.heartbeatEnabled = true;
    clearTimeout(this.heartbeatTimer);
    this.heartbeatLoop();
  }

  start({ deferHeartbeat = false } = {}) {
    if (this.running) {
      if (!deferHeartbeat) this.enableHeartbeat();
      return;
    }
    this.running = true;
    if (!deferHeartbeat) this.enableHeartbeat();
    this.flushTimer = setInterval(() => this.flushEvents(), 300);
    this.actionTimer = setInterval(() => this.pollActions(), 1600);
  }

  stop() {
    this.running = false;
    this.heartbeatEnabled = false;
    clearTimeout(this.heartbeatTimer);
    clearInterval(this.flushTimer);
    clearInterval(this.actionTimer);
    clearTimeout(this.reconnectTimer);
  }
}

module.exports = { BridgeClient };
