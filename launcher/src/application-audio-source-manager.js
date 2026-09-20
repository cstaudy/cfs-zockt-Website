"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");

const AUDIO_KEYS = Object.freeze(["game", "discord", "music", "alerts"]);
const PROCESS_LOOPBACK_PROTOCOL = "CFS_AUDIO_LOOPBACK_V1";
const MIN_WINDOWS_BUILD = 20348;
const RECOVERY_DELAYS = Object.freeze([500, 1000, 2000, 5000, 10000]);
const PROCESS_MONITOR_MS = 2000;
const CONTINUITY_AFTER_MS = 1200;
const CONTINUITY_CHUNK_MS = 100;
const PCM_BYTES_PER_SECOND = 48000 * 2 * 2;
const CONTINUITY_CHUNK_BYTES = Math.round(PCM_BYTES_PER_SECOND * CONTINUITY_CHUNK_MS / 1000);
const CONTINUITY_CHUNK = Buffer.alloc(CONTINUITY_CHUNK_BYTES);

function safeText(value, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
function safePid(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 0x7fffffff ? n : 0;
}
function parseWindowsBuild(release = "") {
  const parts = String(release || "").trim().split(".").map(part => Number(part));
  if (parts.length >= 3 && Number.isInteger(parts[2]) && parts[2] > 0) return parts[2];
  return 0;
}
function normalizeProcessName(value = "") {
  return safeText(value, 160).replace(/\.exe$/i, "").toLowerCase();
}
function normalizeProcessRows(rows = []) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(rows) ? rows : []) {
    const id = safePid(raw?.id ?? raw?.Id);
    const name = safeText(raw?.name ?? raw?.ProcessName, 160);
    const title = safeText(raw?.title ?? raw?.MainWindowTitle, 220);
    if (!id || !name) continue;
    const key = `${id}:${normalizeProcessName(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, name, title });
  }
  return out;
}
function normalizeSpec(input = {}) {
  const key = safeText(input.key, 40).toLowerCase();
  const processId = safePid(input.processId);
  const processName = safeText(input.processName, 160);
  if (!AUDIO_KEYS.includes(key) || !processId) return null;
  return {
    key,
    processId,
    processName,
    sampleRate: 48000,
    channels: 2,
    sampleFormat: "s16le",
    includeTree: input.includeTree !== false
  };
}

class ApplicationAudioSourceManager extends EventEmitter {
  constructor({
    logger = null,
    resourcesPath = "",
    devHelperPath = "",
    platform = process.platform,
    env = process.env,
    spawnFn = spawn,
    fsImpl = fs,
    osRelease = platform === process.platform ? os.release() : "",
    processResolver = null,
    nowFn = Date.now,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
    monitorIntervalMs = PROCESS_MONITOR_MS,
    continuityAfterMs = CONTINUITY_AFTER_MS
  } = {}) {
    super();
    this.logger = logger;
    this.resourcesPath = resourcesPath;
    this.devHelperPath = devHelperPath;
    this.platform = platform;
    this.env = env;
    this.spawnFn = spawnFn;
    this.fs = fsImpl;
    this.osRelease = String(osRelease || "");
    this.processResolver = typeof processResolver === "function" ? processResolver : null;
    this.nowFn = nowFn;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.monitorIntervalMs = Math.max(500, Number(monitorIntervalMs) || PROCESS_MONITOR_MS);
    this.continuityAfterMs = Math.max(500, Number(continuityAfterMs) || CONTINUITY_AFTER_MS);
    this.sources = new Map();
    this.helperPath = "";
    this.monitorTimer = null;
    this.monitorBusy = false;
    this.recoveryTotals = { helperRestarts: 0, processRebinds: 0, continuityBytes: 0, recoveries: 0 };
    this.lastProbe = {
      available: false,
      staged: false,
      runtimeVerified: false,
      checkedAt: null,
      error: "",
      path: "",
      protocol: "",
      windowsBuild: parseWindowsBuild(this.osRelease),
      minimumWindowsBuild: MIN_WINDOWS_BUILD
    };
  }

  candidates() {
    const out = [];
    if (this.env.CFS_AUDIO_LOOPBACK_PATH) out.push(String(this.env.CFS_AUDIO_LOOPBACK_PATH));
    if (this.resourcesPath) out.push(path.join(this.resourcesPath, "audio", "cfs-audio-loopback.exe"));
    if (this.devHelperPath) out.push(this.devHelperPath);
    return [...new Set(out.filter(Boolean))];
  }

  probe() {
    const checkedAt = new Date().toISOString();
    const windowsBuild = parseWindowsBuild(this.osRelease);
    if (this.platform !== "win32") {
      this.helperPath = "";
      this.lastProbe = {
        available: false, staged: false, runtimeVerified: false, checkedAt,
        error: "Application Audio Capture ist nur unter Windows verfügbar.", path: "", protocol: "",
        windowsBuild, minimumWindowsBuild: MIN_WINDOWS_BUILD
      };
      return { ...this.lastProbe };
    }
    const candidate = this.candidates().find(file => {
      try { return this.fs.existsSync(file); } catch { return false; }
    }) || "";
    this.helperPath = candidate;
    if (windowsBuild && windowsBuild < MIN_WINDOWS_BUILD) {
      this.lastProbe = {
        available: false, staged: Boolean(candidate), runtimeVerified: false, checkedAt,
        error: `Windows Build ${windowsBuild} ist zu alt. Process Loopback benötigt mindestens Build ${MIN_WINDOWS_BUILD}.`,
        path: candidate, protocol: "", windowsBuild, minimumWindowsBuild: MIN_WINDOWS_BUILD
      };
      return { ...this.lastProbe };
    }
    const keepVerified = Boolean(candidate && this.lastProbe.path === candidate && this.lastProbe.runtimeVerified === true);
    this.lastProbe = {
      available: Boolean(candidate), staged: Boolean(candidate), runtimeVerified: keepVerified, checkedAt,
      error: candidate ? "" : "CFS WASAPI Process-Loopback Helper fehlt. Windows-Helper zuerst bauen/stagen.",
      path: candidate, protocol: keepVerified ? PROCESS_LOOPBACK_PROTOCOL : "",
      windowsBuild, minimumWindowsBuild: MIN_WINDOWS_BUILD
    };
    return { ...this.lastProbe };
  }

  probeRuntime({ timeoutMs = 5000 } = {}) {
    const base = this.probe();
    if (!base.available) return Promise.resolve({ ...base });
    const file = this.helperPath;
    return new Promise(resolve => {
      let child = null, stdout = "", stderr = "", settled = false, timer = null;
      const finish = (ok, error = "", protocol = "") => {
        if (settled) return;
        settled = true;
        if (timer) this.clearTimeoutFn(timer);
        this.lastProbe = {
          ...this.lastProbe,
          available: ok,
          staged: true,
          runtimeVerified: ok,
          checkedAt: new Date().toISOString(),
          error: safeText(error, 320),
          path: file,
          protocol: ok ? protocol : ""
        };
        resolve({ ...this.lastProbe });
      };
      try {
        child = this.spawnFn(file, ["--probe"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      } catch (error) {
        finish(false, `WASAPI Helper konnte nicht gestartet werden: ${error?.message || error}`);
        return;
      }
      child.stdout?.on?.("data", chunk => { stdout += String(chunk).slice(0, 4096); });
      child.stderr?.on?.("data", chunk => { stderr += String(chunk).slice(0, 4096); });
      child.once?.("error", error => finish(false, `WASAPI Helper Startfehler: ${error?.message || error}`));
      child.once?.("close", code => {
        const protocol = String(stdout || "").trim().split(/\r?\n/).find(line => line.trim() === PROCESS_LOOPBACK_PROTOCOL) || "";
        if (code === 0 && protocol === PROCESS_LOOPBACK_PROTOCOL) finish(true, "", protocol);
        else finish(false, `WASAPI Helper Probe fehlgeschlagen${Number.isInteger(code) ? ` (Code ${code})` : ""}: ${safeText(stderr || stdout || "unerwartete Antwort", 220)}`);
      });
      if (!settled) {
        timer = this.setTimeoutFn(() => {
          try { child?.kill?.(); } catch {}
          finish(false, "WASAPI Helper Probe Timeout.");
        }, Math.max(1000, Math.min(15000, Number(timeoutMs) || 5000)));
        timer?.unref?.();
      }
    });
  }

  async doctor(options = {}) {
    const runtime = await this.probeRuntime(options);
    return {
      ok: runtime.runtimeVerified === true,
      checkedAt: runtime.checkedAt,
      platform: this.platform,
      windowsBuild: runtime.windowsBuild || 0,
      minimumWindowsBuild: MIN_WINDOWS_BUILD,
      helper: {
        staged: runtime.staged === true,
        path: runtime.path || "",
        runtimeVerified: runtime.runtimeVerified === true,
        protocol: runtime.protocol || "",
        error: runtime.error || ""
      },
      recovery: { ...this.recoveryTotals },
      checks: [
        { key: "platform", ok: this.platform === "win32", label: "Windows", detail: this.platform === "win32" ? "Windows erkannt." : "Process Loopback ist nur unter Windows verfügbar." },
        { key: "windows_build", ok: !runtime.windowsBuild || runtime.windowsBuild >= MIN_WINDOWS_BUILD, label: "Windows Build", detail: runtime.windowsBuild ? `Build ${runtime.windowsBuild} · Minimum ${MIN_WINDOWS_BUILD}` : `Build konnte noch nicht bestimmt werden · Minimum ${MIN_WINDOWS_BUILD}` },
        { key: "helper_staged", ok: runtime.staged === true, label: "Helper-Datei", detail: runtime.path || "cfs-audio-loopback.exe fehlt." },
        { key: "helper_runtime", ok: runtime.runtimeVerified === true, label: "Helper Runtime", detail: runtime.runtimeVerified ? `${PROCESS_LOOPBACK_PROTOCOL} bestätigt.` : (runtime.error || "Probe nicht erfolgreich.") }
      ]
    };
  }

  emitSourceError(payload) {
    this.emit("source-error", payload);
    if (this.listenerCount("error") > 0) this.emit("error", payload);
  }

  createEntry(spec) {
    return {
      spec,
      child: null,
      childGeneration: 0,
      sinks: new Set(),
      lastDataAt: 0,
      lastStartAt: 0,
      lastRecoveryAt: 0,
      error: "",
      bytes: 0,
      continuityBytes: 0,
      helperRestarts: 0,
      processRebinds: 0,
      restartAttempt: 0,
      restartTimer: null,
      continuityTimer: null,
      waitingForProcess: false,
      processState: "configured",
      lastExitCode: null
    };
  }

  prepare(specs = []) {
    const wanted = new Map();
    for (const raw of Array.isArray(specs) ? specs : []) {
      const spec = normalizeSpec(raw);
      if (spec) wanted.set(spec.key, spec);
    }
    for (const [key, entry] of [...this.sources.entries()]) {
      const next = wanted.get(key);
      if (!next || next.processId !== entry.spec.processId || normalizeProcessName(next.processName) !== normalizeProcessName(entry.spec.processName)) this.destroySource(key);
    }
    for (const spec of wanted.values()) if (!this.sources.has(spec.key)) this.sources.set(spec.key, this.createEntry(spec));
    if (this.sources.size) this.startMonitor(); else this.stopMonitor();
    return this.snapshot();
  }

  startMonitor() {
    if (this.monitorTimer || !this.sources.size) return;
    this.monitorTimer = this.setIntervalFn(() => {
      this.monitorTick().catch(error => this.logger?.warn?.("Application audio recovery monitor failed", error?.message || error));
    }, this.monitorIntervalMs);
    this.monitorTimer?.unref?.();
  }

  stopMonitor() {
    if (this.monitorTimer) this.clearIntervalFn(this.monitorTimer);
    this.monitorTimer = null;
    this.monitorBusy = false;
  }

  async resolveProcesses() {
    if (!this.processResolver) return [];
    try { return normalizeProcessRows(await this.processResolver()); }
    catch (error) {
      this.logger?.warn?.("Application audio process resolver failed", error?.message || error);
      return [];
    }
  }

  findProcessForEntry(entry, rows) {
    const current = rows.find(row => row.id === entry.spec.processId);
    if (current && (!entry.spec.processName || normalizeProcessName(current.name) === normalizeProcessName(entry.spec.processName))) return current;
    const wanted = normalizeProcessName(entry.spec.processName);
    if (!wanted) return null;
    return rows.find(row => normalizeProcessName(row.name) === wanted) || null;
  }

  async monitorTick() {
    if (this.monitorBusy || !this.sources.size) return this.snapshot();
    this.monitorBusy = true;
    try {
      const rows = this.processResolver ? await this.resolveProcesses() : [];
      const processSnapshotUsable = !this.processResolver || rows.length > 0;
      for (const entry of this.sources.values()) {
        if (this.processResolver && processSnapshotUsable) {
          const match = this.findProcessForEntry(entry, rows);
          if (!match) {
            if (!entry.waitingForProcess) {
              entry.waitingForProcess = true;
              entry.processState = "waiting";
              entry.error = `${entry.spec.processName || "Anwendung"} läuft derzeit nicht. Audio bleibt als Stille aktiv.`;
              this.stopEntry(entry, { preserveRecovery: true });
              this.startContinuity(entry, "process_wait");
              this.emit("recovery", { key: entry.spec.key, type: "waiting_for_process", processName: entry.spec.processName });
            }
            continue;
          }
          if (match.id !== entry.spec.processId) {
            const previousPid = entry.spec.processId;
            this.stopEntry(entry, { preserveRecovery: true });
            entry.spec = { ...entry.spec, processId: match.id, processName: match.name || entry.spec.processName };
            entry.waitingForProcess = false;
            entry.processState = "rebound";
            entry.processRebinds++;
            entry.lastRecoveryAt = this.nowFn();
            this.recoveryTotals.processRebinds++;
            this.recoveryTotals.recoveries++;
            this.emit("recovery", { key: entry.spec.key, type: "process_rebind", previousPid, processId: match.id, processName: entry.spec.processName });
            if (entry.sinks.size) this.ensureProcess(entry, { recovery: true });
            continue;
          }
          if (entry.waitingForProcess) {
            entry.waitingForProcess = false;
            entry.processState = "available";
            entry.error = "";
            entry.lastRecoveryAt = this.nowFn();
            this.recoveryTotals.recoveries++;
            if (entry.sinks.size) this.ensureProcess(entry, { recovery: true });
          }
        }

        if (entry.sinks.size && !entry.child && !entry.restartTimer && !entry.waitingForProcess) this.scheduleRestart(entry, "helper_missing");
        const noDataFor = entry.lastDataAt ? this.nowFn() - entry.lastDataAt : this.nowFn() - (entry.lastStartAt || this.nowFn());
        if (entry.sinks.size && noDataFor >= this.continuityAfterMs) this.startContinuity(entry, "no_pcm");
      }
      return this.snapshot();
    } finally {
      this.monitorBusy = false;
    }
  }

  writeToSinks(entry, data) {
    for (const sink of [...entry.sinks]) {
      if (sink.closed || sink.blocked) continue;
      try {
        if (sink.writable.write(data) === false) sink.blocked = true;
      } catch {
        sink.closed = true;
        entry.sinks.delete(sink);
      }
    }
  }

  startContinuity(entry, reason = "") {
    if (entry.continuityTimer || !entry.sinks.size) return;
    entry.processState = entry.waitingForProcess ? "waiting" : "continuity";
    const pump = () => {
      if (!entry.sinks.size) { this.stopContinuity(entry); return; }
      const now = this.nowFn();
      const dataAge = entry.lastDataAt ? now - entry.lastDataAt : now - (entry.lastStartAt || now);
      if (entry.child && dataAge < this.continuityAfterMs) { this.stopContinuity(entry); return; }
      this.writeToSinks(entry, CONTINUITY_CHUNK);
      entry.continuityBytes += CONTINUITY_CHUNK.length;
      this.recoveryTotals.continuityBytes += CONTINUITY_CHUNK.length;
    };
    entry.continuityTimer = this.setIntervalFn(pump, CONTINUITY_CHUNK_MS);
    entry.continuityTimer?.unref?.();
    this.emit("recovery", { key: entry.spec.key, type: "continuity_started", reason });
  }

  stopContinuity(entry) {
    if (entry?.continuityTimer) this.clearIntervalFn(entry.continuityTimer);
    if (entry) entry.continuityTimer = null;
  }

  scheduleRestart(entry, reason = "helper_exit") {
    if (!entry || entry.restartTimer || entry.waitingForProcess || !entry.sinks.size) return;
    const attempt = Math.min(entry.restartAttempt + 1, 99);
    const delay = RECOVERY_DELAYS[Math.min(attempt - 1, RECOVERY_DELAYS.length - 1)];
    entry.restartAttempt = attempt;
    entry.processState = "recovering";
    this.startContinuity(entry, reason);
    entry.restartTimer = this.setTimeoutFn(async () => {
      entry.restartTimer = null;
      if (!entry.sinks.size || !this.sources.has(entry.spec.key)) return;
      if (this.processResolver) {
        const rows = await this.resolveProcesses();
        const match = rows.length ? this.findProcessForEntry(entry, rows) : null;
        if (rows.length && !match) {
          entry.waitingForProcess = true;
          entry.processState = "waiting";
          entry.error = `${entry.spec.processName || "Anwendung"} läuft derzeit nicht. Audio bleibt als Stille aktiv.`;
          return;
        }
        if (match && match.id !== entry.spec.processId) {
          const previousPid = entry.spec.processId;
          entry.spec = { ...entry.spec, processId: match.id, processName: match.name || entry.spec.processName };
          entry.processRebinds++;
          this.recoveryTotals.processRebinds++;
          this.emit("recovery", { key: entry.spec.key, type: "process_rebind", previousPid, processId: match.id, processName: entry.spec.processName });
        }
        entry.waitingForProcess = false;
      }
      try {
        this.ensureProcess(entry, { recovery: true });
      } catch (error) {
        entry.error = safeText(error?.message || error, 260);
        this.scheduleRestart(entry, "restart_failed");
      }
    }, delay);
    entry.restartTimer?.unref?.();
  }

  ensureProcess(entry, { recovery = false } = {}) {
    if (entry.child) return entry.child;
    if (entry.waitingForProcess) throw new Error(`${entry.spec.processName || "Anwendung"} läuft derzeit nicht.`);
    const probe = this.helperPath ? this.lastProbe : this.probe();
    if (!probe.available) throw new Error(probe.error || "Application Audio Helper fehlt.");
    const args = [
      "--pid", String(entry.spec.processId),
      entry.spec.includeTree ? "--include-tree" : "--exclude-tree",
      "--stdout-s16le", "--rate", "48000", "--channels", "2"
    ];
    const generation = ++entry.childGeneration;
    const child = this.spawnFn(this.helperPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    entry.child = child;
    entry.error = "";
    entry.lastStartAt = this.nowFn();
    entry.processState = recovery ? "recovered" : "running";
    if (recovery) {
      entry.helperRestarts++;
      entry.lastRecoveryAt = this.nowFn();
      this.recoveryTotals.helperRestarts++;
      this.recoveryTotals.recoveries++;
      this.emit("recovery", { key: entry.spec.key, type: "helper_restart", attempt: entry.restartAttempt, processId: entry.spec.processId });
    }
    child.stdout?.on?.("data", chunk => {
      if (generation !== entry.childGeneration) return;
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      entry.lastDataAt = this.nowFn();
      entry.bytes += data.length;
      entry.restartAttempt = 0;
      entry.waitingForProcess = false;
      entry.processState = "running";
      this.stopContinuity(entry);
      this.writeToSinks(entry, data);
    });
    child.stderr?.on?.("data", chunk => {
      if (generation !== entry.childGeneration) return;
      const text = safeText(String(chunk).split(/\r?\n/).filter(Boolean).slice(-1)[0] || "", 260);
      if (text) entry.error = text;
    });
    child.once?.("error", error => {
      if (generation !== entry.childGeneration) return;
      entry.error = safeText(error?.message || error, 260);
      entry.child = null;
      entry.processState = "error";
      this.emitSourceError({ key: entry.spec.key, error: entry.error });
      this.scheduleRestart(entry, "helper_error");
    });
    child.once?.("close", code => {
      if (generation !== entry.childGeneration) return;
      entry.child = null;
      entry.lastExitCode = Number.isInteger(code) ? code : null;
      if (entry.sinks.size) {
        entry.error = entry.error || `Audio Helper beendet${Number.isInteger(code) ? ` (Code ${code})` : ""}.`;
        entry.processState = "recovering";
        if (code && code !== 0) this.emitSourceError({ key: entry.spec.key, error: entry.error });
        this.scheduleRestart(entry, "helper_close");
      }
    });
    return child;
  }

  attach(key, writable) {
    const entry = this.sources.get(String(key || "").toLowerCase());
    if (!entry) throw new Error("Application-Audioquelle ist nicht vorbereitet.");
    if (!writable || typeof writable.write !== "function") throw new Error("FFmpeg Application-Audio-Pipe fehlt.");
    const sink = { writable, blocked: false, closed: false };
    entry.sinks.add(sink);
    const onDrain = () => { sink.blocked = false; };
    const detach = () => {
      if (sink.closed && !entry.sinks.has(sink)) return;
      sink.closed = true;
      entry.sinks.delete(sink);
      writable.off?.("drain", onDrain);
      writable.off?.("close", detach);
      writable.off?.("error", detach);
      try { writable.end?.(); } catch {}
      if (!entry.sinks.size) {
        this.stopContinuity(entry);
        this.clearRestart(entry);
        this.stopEntry(entry, { preserveRecovery: true });
      }
    };
    writable.on?.("drain", onDrain);
    writable.on?.("close", detach);
    writable.on?.("error", detach);
    try {
      if (!entry.waitingForProcess) this.ensureProcess(entry);
      else this.startContinuity(entry, "attach_waiting");
    } catch (error) {
      this.startContinuity(entry, "attach_recovery");
      this.scheduleRestart(entry, "attach_failed");
      this.logger?.warn?.("Application audio helper attach recovery", error?.message || error);
    }
    this.startMonitor();
    return detach;
  }

  clearRestart(entry) {
    if (entry?.restartTimer) this.clearTimeoutFn(entry.restartTimer);
    if (entry) entry.restartTimer = null;
  }

  stopEntry(entry, { preserveRecovery = false } = {}) {
    if (!entry) return;
    if (!preserveRecovery) this.clearRestart(entry);
    if (!entry.child) return;
    const child = entry.child;
    entry.child = null;
    entry.childGeneration++;
    try { child.kill?.("SIGTERM"); } catch {}
  }

  destroySource(key) {
    const normalized = String(key || "").toLowerCase();
    const entry = this.sources.get(normalized);
    if (!entry) return;
    this.clearRestart(entry);
    this.stopContinuity(entry);
    for (const sink of [...entry.sinks]) {
      sink.closed = true;
      try { sink.writable.end?.(); } catch {}
    }
    entry.sinks.clear();
    this.stopEntry(entry);
    this.sources.delete(normalized);
    if (!this.sources.size) this.stopMonitor();
  }

  releaseAll() {
    for (const key of [...this.sources.keys()]) this.destroySource(key);
    this.stopMonitor();
  }

  snapshot() {
    return {
      ...this.lastProbe,
      prepared: this.sources.size,
      monitoring: Boolean(this.monitorTimer),
      recovery: { ...this.recoveryTotals },
      sources: [...this.sources.values()].map(entry => ({
        key: entry.spec.key,
        processId: entry.spec.processId,
        processName: entry.spec.processName,
        running: Boolean(entry.child),
        processState: entry.processState,
        waitingForProcess: entry.waitingForProcess === true,
        recovering: Boolean(entry.restartTimer),
        continuityActive: Boolean(entry.continuityTimer),
        attachments: entry.sinks.size,
        lastDataAt: entry.lastDataAt || 0,
        lastStartAt: entry.lastStartAt || 0,
        lastRecoveryAt: entry.lastRecoveryAt || 0,
        bytes: entry.bytes || 0,
        continuityBytes: entry.continuityBytes || 0,
        helperRestarts: entry.helperRestarts || 0,
        processRebinds: entry.processRebinds || 0,
        restartAttempt: entry.restartAttempt || 0,
        lastExitCode: entry.lastExitCode,
        error: safeText(entry.error, 180)
      }))
    };
  }
}

module.exports = {
  ApplicationAudioSourceManager,
  AUDIO_KEYS,
  PROCESS_LOOPBACK_PROTOCOL,
  MIN_WINDOWS_BUILD,
  RECOVERY_DELAYS,
  PROCESS_MONITOR_MS,
  CONTINUITY_AFTER_MS,
  CONTINUITY_CHUNK_MS,
  CONTINUITY_CHUNK_BYTES,
  normalizeSpec,
  safePid,
  parseWindowsBuild,
  normalizeProcessRows,
  normalizeProcessName
};
