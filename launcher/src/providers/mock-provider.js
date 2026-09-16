const { EventEmitter } = require("node:events");

class MockProvider extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.running = false;
    this.viewerCount = 24;
    this.counter = 0;
  }

  info() {
    return {
      key: "mock",
      label: "LIVE Simulator",
      ready: true,
      connected: this.running,
      capabilities: ["follow", "like", "gift", "share", "viewer_update", "chat"]
    };
  }

  async start() {
    this.running = true;
    this.emit("state", { ready: true, connected: true, message: "Simulator aktiv" });
    return this.info();
  }

  async stop() {
    this.running = false;
    this.emit("state", { ready: true, connected: false, message: "Simulator gestoppt" });
    return this.info();
  }

  eventKey(type) {
    this.counter += 1;
    return `mock-${type}-${Date.now()}-${this.counter}`;
  }

  simulate(type, payload = {}) {
    if (!this.running) throw new Error("Starte zuerst die LIVE-Session.");
    const actor = payload.actor_name || ["NinaLive", "PixelTom", "MiraGaming", "StreamKai"][this.counter % 4];
    let event;
    if (type === "viewer_update") {
      this.viewerCount = Math.max(0, Number(payload.amount ?? this.viewerCount + 3));
      event = {
        event_key: this.eventKey(type),
        event_type: type,
        amount: this.viewerCount,
        payload: {}
      };
    } else if (type === "chat") {
      event = {
        event_key: this.eventKey(type),
        event_type: type,
        actor_name: actor,
        amount: 1,
        payload: { message: String(payload.message || "Hallo Chat! 👋").replace(/[\r\n\t]+/g," ").trim().slice(0,280) }
      };
    } else if (type === "gift") {
      event = {
        event_key: this.eventKey(type),
        event_type: type,
        actor_name: actor,
        amount: Math.max(1, Number(payload.amount || 1)),
        value: Number(payload.value || 0),
        payload: {
          gift_name: payload.gift_name || "Rose",
          gift_id: payload.gift_id || "mock-rose",
          repeat_count: Math.max(1, Number(payload.amount || 1))
        }
      };
    } else {
      event = {
        event_key: this.eventKey(type),
        event_type: type,
        actor_name: actor,
        amount: Math.max(1, Number(payload.amount || (type === "like" ? 10 : 1))),
        payload: {}
      };
    }
    this.emit("event", event);
    return event;
  }
}

module.exports = { MockProvider };
