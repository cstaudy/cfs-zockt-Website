"use strict";

const { EventEmitter } = require("node:events");
const { MockProvider } = require("./providers/mock-provider");
const { TikToolProvider } = require("./providers/tiktool-provider");

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
  }

  async use(key) {
    const target = key === "tiktool" ? "tiktool" : "mock";
    const switchProvider = async () => {
      if (this.provider && this.key === target) return this.provider.info();
      if (this.provider) await this.provider.stop?.();

      this.key = target;
      this.provider = this.factories[target]();
      this.provider.on("event", event => this.emit("event", event));
      this.provider.on("state", state => this.emit("state", { provider:this.key, ...state }));
      return this.provider.info();
    };

    this.switchChain = this.switchChain.then(switchProvider, switchProvider);
    return this.switchChain;
  }

  info() {
    return this.provider?.info?.() || { key:this.key || "none", ready:false };
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

module.exports = { ProviderManager };
