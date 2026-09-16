const crypto = require("node:crypto");

function safeText(value, max = 120) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function actorFingerprint(name) {
  const value = safeText(name, 100);
  if (!value) return "";
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

class EventMonitor {
  constructor({ maxEvents = 200 } = {}) {
    this.maxEvents = Math.max(50, Math.min(1000, Number(maxEvents) || 200));
    this.events = [];
    this.startedAt = new Date().toISOString();
    this.counts = {
      follow: 0,
      like: 0,
      gift: 0,
      share: 0,
      viewer_update: 0,
      chat: 0
    };
    this.amounts = {
      likes: 0,
      gifts: 0,
      shares: 0,
      follows: 0
    };
    this.viewer = {
      latest: 0,
      peak: 0
    };
  }

  record(event = {}) {
    const type = String(event.event_type || "");
    if (!(type in this.counts)) return null;

    this.counts[type] += 1;
    const amount = Math.max(0, Number(event.amount || 0));

    if (type === "like") this.amounts.likes += amount;
    if (type === "gift") this.amounts.gifts += amount;
    if (type === "share") this.amounts.shares += amount || 1;
    if (type === "follow") this.amounts.follows += amount || 1;
    if (type === "viewer_update") {
      this.viewer.latest = amount;
      this.viewer.peak = Math.max(this.viewer.peak, amount);
    }

    const item = {
      at: new Date().toISOString(),
      type,
      event_key: safeText(event.event_key, 180),
      actor: safeText(event.actor_name, 100),
      actor_fingerprint: actorFingerprint(event.actor_name),
      amount,
      value: Math.max(0, Number(event.value || 0)),
      gift_name: safeText(event.payload?.gift_name, 120),
      repeat_count: Math.max(0, Number(event.payload?.repeat_count || 0)),
      message: safeText(event.payload?.message, 280)
    };

    this.events.push(item);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
    return item;
  }

  clear() {
    this.events = [];
    this.startedAt = new Date().toISOString();
    for (const key of Object.keys(this.counts)) this.counts[key] = 0;
    for (const key of Object.keys(this.amounts)) this.amounts[key] = 0;
    this.viewer.latest = 0;
    this.viewer.peak = 0;
  }

  coverage() {
    return {
      follow: this.counts.follow > 0,
      like: this.counts.like > 0,
      gift: this.counts.gift > 0,
      share: this.counts.share > 0,
      viewer_update: this.counts.viewer_update > 0
    };
  }

  snapshot({ includeActors = true } = {}) {
    return {
      startedAt: this.startedAt,
      observedAt: new Date().toISOString(),
      counts: { ...this.counts },
      amounts: { ...this.amounts },
      viewer: { ...this.viewer },
      coverage: this.coverage(),
      recent: this.events.slice(-50).reverse().map(item => includeActors ? { ...item } : {
        ...item,
        actor: item.actor ? `user_${item.actor_fingerprint}` : ""
      })
    };
  }
}

module.exports = { EventMonitor, actorFingerprint };
