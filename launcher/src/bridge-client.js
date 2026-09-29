const { EventEmitter } = require("node:events");
const crypto = require("node:crypto");
const { sanitizePayload } = require("./provider-event-normalizer");

class BridgeClient extends EventEmitter {
  constructor({ settings, token, logger, version, spool = null, streamHealthProvider = null, interactiveGamesProvider = null, liveProviderHealthProvider = null, streamCredentialsProvider = null, obsIntegrationProvider = null }) {
    super();
    this.settings = settings;
    this.token = token;
    this.logger = logger;
    this.version = version;
    this.spool = spool;
    this.streamHealthProvider = typeof streamHealthProvider === "function" ? streamHealthProvider : null;
    this.interactiveGamesProvider = typeof interactiveGamesProvider === "function" ? interactiveGamesProvider : null;
    this.liveProviderHealthProvider = typeof liveProviderHealthProvider === "function" ? liveProviderHealthProvider : null;
    this.streamCredentialsProvider = typeof streamCredentialsProvider === "function" ? streamCredentialsProvider : null;
    this.obsIntegrationProvider = typeof obsIntegrationProvider === "function" ? obsIntegrationProvider : null;
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
    this.heartbeatAfterMs = 10000;
    this.heartbeatGraceMs = 90000;
    this.lastSuccessfulHeartbeatMs = 0;
    this.consecutiveHeartbeatFailures = 0;
    this.metrics = {
      enqueued: this.eventQueue.length,
      sent: 0,
      flushBatches: 0,
      flushFailures: 0,
      droppedByServer: 0,
      reconnects: 0,
      actionsReceived: 0,
      actionsAcked: 0,
      actionsNacked: 0,
      actionPollSkips: 0
    };
    this.lastState = {
      connected: false,
      connectionState: "offline",
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
    let liveProvider = null, games = null, credentials = null, obs = null;
    try { liveProvider = this.liveProviderHealthProvider?.() || null; } catch {}
    try { games = this.interactiveGamesProvider?.() || null; } catch {}
    try { credentials = this.streamCredentialsProvider?.() || null; } catch {}
    try { obs = this.obsIntegrationProvider?.() || null; } catch {}
    const configuredCredentialTargets = credentials?.targets && typeof credentials.targets === "object"
      ? Object.values(credentials.targets).filter(item=>item?.configured === true).length
      : 0;
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
      session_resume_v2: true,
      game_activity_presence_v1: true,
      bridge_health_v2: true,
      session_scoped_events_v1: true,
      secure_transport_guard_v1: true,
      signed_requests_v1: true,
      replay_guard_v1: true,
      creator_suite_runtime_v1: true,
      stream_engine_v1: Boolean(this.streamHealthProvider),
      multistream_local_v1: Boolean(this.streamHealthProvider),
      local_stream_credentials_v1: Boolean(this.streamCredentialsProvider),
      interactive_games_v1: Boolean(this.interactiveGamesProvider),
      interactive_games_service_v1: Boolean(this.interactiveGamesProvider),
      interactive_games_catalog_v1: Array.isArray(games?.modules),
      interactive_games_service_ready: games?.ready === true,
      interactive_games_service_running: games?.running === true,
      interactive_games_active_module: String(games?.activeGame || "").slice(0,80),
      interactive_game_modules: Array.isArray(games?.modules)
        ? games.modules.slice(0,100).map(item=>({
            id:String(item?.id||"").slice(0,80),
            name:String(item?.name||item?.label||"").slice(0,80),
            version:String(item?.version||"").slice(0,30),
            category:String(item?.category||"").slice(0,40),
            events:Array.isArray(item?.events)?item.events.slice(0,20).map(value=>String(value||"").slice(0,40)):[]
          })).filter(item=>item.id)
        : [],
      interactive_games_catalog_hash: /^[a-f0-9]{64}$/i.test(String(games?.catalogHash||"")) ? String(games.catalogHash).toLowerCase() : "",
      live_provider_health_v1: Boolean(this.liveProviderHealthProvider),
      obs_browser_source_doctor_v1: Boolean(this.obsIntegrationProvider),
      stream_studio_protocol: 6,
      integration_health: {
        live_provider: {
          key:String(liveProvider?.key || this.settings?.provider || "mock").slice(0,40),
          ready:liveProvider?.ready === true,
          status:String(liveProvider?.status || "unknown").slice(0,40)
        },
        interactive_games: {
          available:games?.available === true,
          ready:games?.ready === true,
          running:games?.running === true,
          status:String(games?.status || (games ? "available" : "unknown")).slice(0,40),
          active_module:String(games?.activeGame || "").slice(0,80),
          catalog_hash:/^[a-f0-9]{64}$/i.test(String(games?.catalogHash||"")) ? String(games.catalogHash).toLowerCase() : "",
          module_count:Array.isArray(games?.modules)?Math.min(100,games.modules.length):0,
          forwarded_events:Math.max(0,Math.min(100000000,Number(games?.forwarded)||0)),
          failed_events:Math.max(0,Math.min(100000000,Number(games?.failed)||0))
        },
        stream_credentials: {
          encryption_available:credentials?.encryptionAvailable === true,
          configured_targets:Math.max(0,Math.min(8,Number(configuredCredentialTargets)||0))
        },
        obs: {
          available:obs?.available !== false && Boolean(this.obsIntegrationProvider),
          mode:String(obs?.mode || "browser_source_doctor").slice(0,40)
        }
      },
      protocol_version: 3
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

  validateStreamStudioContract(payload = {}) {
    const contract = payload?.contract && typeof payload.contract === "object" ? payload.contract : null;
    if (!contract) {
      const error = new Error("Stream Studio Vertrag fehlt. Launcher und Backend sind nicht kompatibel.");
      error.code = "stream_studio_contract_missing";
      throw error;
    }
    const protocol = Number(contract.protocol || 0);
    if (protocol < 1 || protocol > 6) {
      const error = new Error(`Nicht unterstütztes Stream-Studio-Protokoll: ${protocol || "unbekannt"}.`);
      error.code = "stream_studio_protocol_unsupported";
      throw error;
    }
    const required = Array.isArray(contract.required_launcher_capabilities) ? contract.required_launcher_capabilities.map(String) : [];
    const capabilities = this.capabilities;
    const missing = required.filter(key => capabilities[key] !== true);
    if (missing.length) {
      const error = new Error(`Launcher-Funktionen fehlen: ${missing.join(", ")}.`);
      error.code = "stream_studio_capability_missing";
      error.missing = missing;
      throw error;
    }
    if (String(contract.credentials || "") !== "launcher_local_encrypted") {
      const error = new Error("Unsichere Stream-Zugangsdaten-Policy wurde abgelehnt.");
      error.code = "stream_studio_credential_policy_rejected";
      throw error;
    }
    return contract;
  }

  async fetchStreamStudioConfig() {
    const payload = await this.request("/api/bridge/stream-studio/config", {
      method:"GET",
      timeoutMs:10000
    });
    this.validateStreamStudioContract(payload);
    return payload;
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
  async submitGameActivity(payload={}){return this.request("/api/bridge/community/game-activity",{method:"POST",body:payload,timeoutMs:8000});}
  async publishGameActivityState(payload={}){return this.request("/api/bridge/community/game-activity/state",{method:"POST",body:payload,timeoutMs:8000});}
  async clearGameActivity(){return this.request("/api/bridge/community/game-activity",{method:"DELETE",timeoutMs:8000});}
  async cutProjects(){return this.request("/api/bridge/cut-studio/projects",{method:"GET",timeoutMs:8000});}
  async createCutProject(payload={}){return this.request("/api/bridge/cut-studio/projects",{method:"POST",body:payload,timeoutMs:10000});}
  async updateCutProject(projectId,payload={}){return this.request(`/api/bridge/cut-studio/projects/${encodeURIComponent(projectId)}`,{method:"PUT",body:payload,timeoutMs:10000});}
  async submitCutReferenceAnalysis(projectId,payload={}){return this.request(`/api/bridge/cut-studio/projects/${encodeURIComponent(projectId)}/reference-learning`,{method:"POST",body:payload,timeoutMs:15000});}
  async createCutClip(projectId,payload={}){return this.request(`/api/bridge/cut-studio/projects/${encodeURIComponent(projectId)}/clips`,{method:"POST",body:payload,timeoutMs:10000});}
  async createInitialRecordingCutClip(projectId,payload={}){return this.request(`/api/bridge/cut-studio/projects/${encodeURIComponent(projectId)}/clips/initial-recording`,{method:"POST",body:payload,timeoutMs:10000});}
  async gameRules(){return this.request("/api/bridge/games/rules",{method:"GET",timeoutMs:8000});}
  async cutJobs(){return this.request("/api/bridge/cut-studio/jobs",{method:"GET",timeoutMs:8000});}
  async updateCutAuditionRuntime(payload={}){return this.request("/api/bridge/cut-studio/audition-runtime",{method:"POST",body:payload,timeoutMs:5000});}
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
      heartbeat: {
        after_ms:this.heartbeatAfterMs,
        grace_ms:this.heartbeatGraceMs,
        last_success_at:this.lastSuccessfulHeartbeatMs ? new Date(this.lastSuccessfulHeartbeatMs).toISOString() : null,
        consecutive_failures:this.consecutiveHeartbeatFailures
      },
      metrics: { ...this.metrics },
      ...extra
    };
  }

  emitState(extra = {}) {
    this.emit("state", this.snapshot(extra));
  }

  assertSecureBackendUrl() {
    let parsed;
    try { parsed = new URL(this.baseUrl); } catch {
      const error = new Error("Backend-URL ist ungültig.");
      error.code = "invalid_backend_url";
      throw error;
    }
    const host = String(parsed.hostname || "").toLowerCase();
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
      const error = new Error("Unsichere Backend-URL blockiert. Remote-Verbindungen müssen HTTPS verwenden.");
      error.code = "insecure_backend_url";
      throw error;
    }
    return parsed;
  }

  async request(path, { method = "GET", body, timeoutMs = 8000 } = {}) {
    if (!this.baseUrl) throw new Error("Backend-URL fehlt.");
    if (!this.token) throw new Error("Bridge-Schlüssel fehlt.");
    this.assertSecureBackendUrl();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const bodyText = body === undefined ? "" : JSON.stringify(body);
      const methodUpper = String(method || "GET").toUpperCase();
      const headers = {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CFS-Bridge-Protocol": "3"
      };
      if (!["GET", "HEAD", "OPTIONS"].includes(methodUpper)) {
        const timestamp = String(Date.now());
        const nonce = crypto.randomBytes(18).toString("base64url");
        const bodyHash = crypto.createHash("sha256").update(bodyText).digest("hex");
        const canonical = [methodUpper, path, timestamp, nonce, bodyHash].join("\n");
        const signature = crypto.createHmac("sha256", String(this.token)).update(canonical).digest("base64url");
        headers["X-CFS-Timestamp"] = timestamp;
        headers["X-CFS-Nonce"] = nonce;
        headers["X-CFS-Signature"] = `v1=${signature}`;
      }
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: methodUpper,
        headers,
        body: body === undefined ? undefined : bodyText,
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        const error = new Error(payload.error || `Bridge HTTP ${response.status}`);
        error.status = response.status;
        error.code = String(payload.code || `bridge_http_${response.status}`);
        throw error;
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
    checks.push({ key: "protocol", ok: Number(status?.protocol || 0) >= 3, label: "Bridge Protocol V3" });
    checks.push({ key: "signed_requests", ok: status?.security?.signed_requests === true, label: "Signierte Requests" });

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
    this.heartbeatAfterMs = Math.max(5000, Math.min(60000, Number(data?.heartbeat_after_ms) || this.heartbeatAfterMs || 10000));
    this.heartbeatGraceMs = Math.max(this.heartbeatAfterMs * 3, Math.min(300000, Number(data?.heartbeat_grace_ms) || this.heartbeatGraceMs || 90000));
    this.lastSuccessfulHeartbeatMs = Date.now();
    this.consecutiveHeartbeatFailures = 0;
    this.lastState = {
      ...this.lastState,
      connected: true,
      connectionState: "online",
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
      session_id: String(event.session_id || this.lastState.live?.session_id || "").slice(0, 80),
      client_created_at: event.client_created_at || new Date().toISOString(),
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
        this.metrics.sent += Number(data?.accepted ?? batch.length);
        this.metrics.droppedByServer += Math.max(0, Number(data?.dropped || 0));
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
    this.consecutiveHeartbeatFailures += 1;
    const authFailed = Number(error?.status) === 401 || Number(error?.status) === 403;
    const withinGrace = this.lastSuccessfulHeartbeatMs > 0 && (Date.now() - this.lastSuccessfulHeartbeatMs) <= this.heartbeatGraceMs;
    const degraded = !authFailed && withinGrace;
    this.lastState = {
      ...this.lastState,
      connected: degraded ? true : false,
      connectionState: degraded ? "degraded" : "offline",
      lastError: message
    };
    this.logger?.warn(degraded ? "Bridge connection degraded" : "Bridge connection problem", message);
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
      const healthy = this.lastState.connectionState === "online";
      const degraded = this.lastState.connectionState === "degraded";
      const wait = healthy ? this.heartbeatAfterMs : (degraded ? Math.min(5000, this.heartbeatAfterMs) : Math.min(30000, this.backoffMs));
      if (!healthy) this.backoffMs = Math.min(30000, Math.round(this.backoffMs * 1.7));
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
