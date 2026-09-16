const { EventEmitter } = require("node:events");

class TikTokProvider extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
  }

  info() {
    return {
      key: "tiktok",
      label: "TikTok LIVE Provider",
      ready: false,
      connected: false,
      capabilities: [],
      reason: "Provider-Adapter vorbereitet. Eine echte LIVE-Ereignisquelle wird in einem separaten Provider-Modul angeschlossen."
    };
  }

  async start() {
    const error = new Error("Der echte TikTok-LIVE-Provider ist noch nicht installiert. Die Bridge- und Widget-Infrastruktur ist bereit.");
    this.emit("state", { ready: false, connected: false, message: error.message });
    throw error;
  }

  async stop() {
    return this.info();
  }
}

module.exports = { TikTokProvider };
