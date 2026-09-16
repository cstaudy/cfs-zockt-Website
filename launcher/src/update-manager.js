const { EventEmitter } = require("node:events");

class UpdateManager extends EventEmitter {
  constructor({ app, logger }) {
    super();
    this.app = app;
    this.logger = logger;
    this.autoUpdater = null;
    this.timer = null;
    this.bound = false;
    this.settings = { autoUpdate: true, updateChannel: "stable" };
    this.state = {
      supported: false,
      packaged: Boolean(app?.isPackaged),
      status: app?.isPackaged ? "idle" : "development",
      currentVersion: app?.getVersion?.() || "",
      latestVersion: "",
      progress: 0,
      message: app?.isPackaged ? "Bereit." : "Updates sind im Entwicklungsmodus deaktiviert.",
      downloaded: false,
      lastCheckedAt: null,
      error: ""
    };

    try {
      ({ autoUpdater: this.autoUpdater } = require("electron-updater"));
      this.state.supported = Boolean(this.autoUpdater);
      this.bind();
    } catch (error) {
      this.state.status = "unavailable";
      this.state.message = "Update-Modul ist nicht verfügbar.";
      this.state.error = String(error?.message || error);
      this.logger?.warn("Update module unavailable", this.state.error);
    }
  }

  bind() {
    if (!this.autoUpdater || this.bound) return;
    this.bound = true;
    const u = this.autoUpdater;
    u.autoDownload = false;
    u.autoInstallOnAppQuit = true;

    u.on("checking-for-update", () => this.set({
      status: "checking",
      message: "Suche nach Updates…",
      error: ""
    }));

    u.on("update-available", info => this.set({
      status: "available",
      latestVersion: String(info?.version || ""),
      message: `Version ${info?.version || ""} ist verfügbar.`,
      progress: 0,
      downloaded: false,
      lastCheckedAt: new Date().toISOString()
    }));

    u.on("update-not-available", info => this.set({
      status: "current",
      latestVersion: String(info?.version || this.state.currentVersion || ""),
      message: "Creator Suite ist aktuell.",
      progress: 0,
      downloaded: false,
      lastCheckedAt: new Date().toISOString()
    }));

    u.on("download-progress", progress => this.set({
      status: "downloading",
      progress: Math.max(0, Math.min(100, Number(progress?.percent || 0))),
      message: `Update wird geladen · ${Math.round(Number(progress?.percent || 0))}%`
    }));

    u.on("update-downloaded", info => this.set({
      status: "downloaded",
      latestVersion: String(info?.version || this.state.latestVersion || ""),
      progress: 100,
      downloaded: true,
      message: "Update ist bereit. Creator Suite kann neu gestartet werden."
    }));

    u.on("error", error => this.set({
      status: "error",
      message: "Update-Prüfung fehlgeschlagen.",
      error: String(error?.message || error || "Unbekannter Update-Fehler")
    }));
  }

  set(patch = {}) {
    this.state = { ...this.state, ...patch };
    this.emit("state", this.snapshot());
  }

  configure(settings = {}) {
    this.settings = {
      autoUpdate: settings.autoUpdate !== false,
      updateChannel: settings.updateChannel === "beta" ? "beta" : "stable"
    };
    if (this.autoUpdater) {
      this.autoUpdater.allowPrerelease = this.settings.updateChannel === "beta";
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      ...this.state,
      channel: this.settings.updateChannel,
      autoUpdate: this.settings.autoUpdate
    };
  }

  start(settings = {}) {
    this.configure(settings);
    clearInterval(this.timer);
    if (!this.app.isPackaged || !this.settings.autoUpdate || !this.autoUpdater) return;
    setTimeout(() => this.check(false).catch(() => {}), 12000);
    this.timer = setInterval(() => this.check(false).catch(() => {}), 6 * 60 * 60 * 1000);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  async check(manual = true) {
    if (!this.autoUpdater) throw new Error("Update-Modul ist nicht verfügbar.");
    if (!this.app.isPackaged) {
      this.set({
        status: "development",
        message: "Update-Prüfung ist erst in der installierten Windows-Version aktiv.",
        lastCheckedAt: new Date().toISOString()
      });
      return this.snapshot();
    }
    if (!manual && !this.settings.autoUpdate) return this.snapshot();
    this.autoUpdater.allowPrerelease = this.settings.updateChannel === "beta";
    await this.autoUpdater.checkForUpdates();
    return this.snapshot();
  }

  async download() {
    if (!this.autoUpdater) throw new Error("Update-Modul ist nicht verfügbar.");
    if (!this.app.isPackaged) throw new Error("Update-Download ist im Entwicklungsmodus deaktiviert.");
    this.set({ status: "downloading", message: "Update wird vorbereitet…", error: "" });
    await this.autoUpdater.downloadUpdate();
    return this.snapshot();
  }

  install() {
    if (!this.autoUpdater || !this.state.downloaded) {
      throw new Error("Es wurde noch kein Update heruntergeladen.");
    }
    this.logger?.info("Installing downloaded launcher update");
    setImmediate(() => this.autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  }
}

module.exports = { UpdateManager };
