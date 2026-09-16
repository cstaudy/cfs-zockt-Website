"use strict";

class DeviceLinkClient {
  constructor({ backendUrl, version = "", logger = null } = {}) {
    this.backendUrl = String(backendUrl || "").replace(/\/+$/,"");
    this.version = String(version || "");
    this.logger = logger;
  }

  setBackendUrl(value) {
    this.backendUrl = String(value || "").replace(/\/+$/,"");
  }

  async request(path, body, timeoutMs = 8000) {
    if (!this.backendUrl) throw new Error("Backend-URL fehlt.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.backendUrl + path, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Accept":"application/json"
        },
        body:JSON.stringify(body || {}),
        signal:controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Zeitüberschreitung zur Creator Cloud.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  start({ machineName = "" } = {}) {
    return this.request("/api/launcher/device-link/start", {
      machine_name:String(machineName || "").slice(0,120),
      client_version:this.version
    });
  }

  poll({ deviceLinkId, deviceSecret } = {}) {
    return this.request("/api/launcher/device-link/poll", {
      device_link_id:String(deviceLinkId || ""),
      device_secret:String(deviceSecret || "")
    });
  }
}

module.exports = { DeviceLinkClient };
