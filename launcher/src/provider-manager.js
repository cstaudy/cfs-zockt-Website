"use strict";

const { EventEmitter } = require("node:events");
const { MockProvider } = require("./providers/mock-provider");
const { TikToolProvider } = require("./providers/tiktool-provider");
const { normalizeProviderEvent, sourceProviderForAdapter } = require("./provider-event-normalizer");

const ADAPTER_CATALOG = Object.freeze({
  mock: {
    key:"mock",
    sourceProvider:"simulator",
    label:"LIVE Simulator",
    implemented:true,
    official:false,
    capabilities:["follow","like","gift","share","viewer_update","chat"],
    moderation:[]
  },
  tiktool: {
    key:"tiktool",
    sourceProvider:"tiktok",
    label:"TikTok LIVE · TikTool",
    implemented:true,
    official:false,
    capabilities:["follow","like","gift","share","viewer_update","chat"],
    moderation:[]
  },
  twitch: {
    key:"twitch",
    sourceProvider:"twitch",
    label:"Twitch",
    implemented:false,
    official:true,
    capabilities:["chat"],
    moderation:[]
  },
  youtube: {
    key:"youtube",
    sourceProvider:"youtube",
    label:"YouTube Live",
    implemented:false,
    official:true,
    capabilities:["chat"],
    moderation:[]
  },
  kick: {
    key:"kick",
    sourceProvider:"kick",
    label:"Kick",
    implemented:false,
    official:false,
    capabilities:["chat"],
    moderation:[]
  }
});

class ProviderManager extends EventEmitter {
  constructor(logger, { factories = null } = {}) {
    super();
    this.logger = logger;
    this.provider = null;
    this.key = null;
    this.factories = factories || {
      mock: () => new MockProvider(this.logger),
      tiktool: () => new TikToolProvider(this.logger)
    };
    this.switchChain = Promise.resolve();
    this.metrics = { normalized:0, rejected:0 };
  }

  adapterCatalog() {
    return Object.values(ADAPTER_CATALOG).map(item => ({...item,capabilities:[...item.capabilities],moderation:[...item.moderation]}));
  }

  normalizeEvent(event, key = this.key) {
    try {
      const normalized = normalizeProviderEvent(key, event);
      this.metrics.normalized += 1;
      return normalized;
    } catch (error) {
      this.metrics.rejected += 1;
      this.logger?.warn("Provider event rejected during normalization", error?.message || String(error));
      throw error;
    }
  }

  async use(key) {
    const target = key === "tiktool" ? "tiktool" : "mock";
    const switchProvider = async () => {
      if (this.provider && this.key === target) return this.info();
      if (this.provider) await this.provider.stop?.();

      this.key = target;
      this.provider = this.factories[target]();
      this.provider.on("event", event => {
        try {
          const normalized = this.normalizeEvent(event, target);
          this.emit("event", normalized);
        } catch {}
      });
      this.provider.on("state", state => this.emit("state", { provider:this.key, source_provider:sourceProviderForAdapter(this.key), ...state }));
      return this.info();
    };

    this.switchChain = this.switchChain.then(switchProvider, switchProvider);
    return this.switchChain;
  }

  info() {
    const base = this.provider?.info?.() || { key:this.key || "none", ready:false };
    return {
      ...base,
      source_provider:sourceProviderForAdapter(base.key || this.key || ""),
      adapter_catalog:this.adapterCatalog(),
      normalization:{...this.metrics}
    };
  }

  async start(context = {}) {
    await this.switchChain;
    if (!this.provider) await this.use("mock");
    return this.provider.start(context);
  }

  async stop() {
    await this.switchChain;
    return this.provider?.stop?.();
  }

  simulate(type, payload = {}) {
    if (!this.provider || this.key !== "mock") throw new Error("Simulation ist nur mit dem Simulator-Provider verfügbar.");
    return this.provider.simulate(type, payload);
  }
}

module.exports = { ProviderManager, ADAPTER_CATALOG };
