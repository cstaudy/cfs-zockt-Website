class GiftStreakTracker {
  constructor({ emit, timeoutMs = 1800, logger = null } = {}) {
    this.emit = typeof emit === "function" ? emit : () => {};
    this.timeoutMs = Math.max(500, Math.min(10000, Number(timeoutMs) || 1800));
    this.logger = logger;
    this.pending = new Map();
  }

  key(event = {}) {
    const user = event.user || {};
    const userKey = String(user.uniqueId || user.nickname || event.uniqueId || "anonymous");
    const giftKey = String(event.giftId || event.gift?.id || event.giftName || event.gift?.name || "gift");
    return `${userKey}::${giftKey}`;
  }

  isStreakable(event = {}) {
    if (typeof event.repeatEnd === "boolean") return true;
    if (typeof event.gift?.streakable === "boolean") return event.gift.streakable;
    if (typeof event.streakable === "boolean") return event.streakable;
    return false;
  }

  repeatCount(event = {}) {
    return Math.max(1, Number(
      event.repeatCount ??
      event.repeat_count ??
      event.gift?.repeatCount ??
      1
    ) || 1);
  }

  clearEntry(key) {
    const current = this.pending.get(key);
    if (current?.timer) clearTimeout(current.timer);
    this.pending.delete(key);
  }

  flush(key, reason = "timeout") {
    const current = this.pending.get(key);
    if (!current) return null;
    this.clearEntry(key);
    const event = { ...current.event, repeatCount: current.count, repeatEnd: true };
    this.logger?.info?.("Gift streak flushed", `${key} x${current.count} · ${reason}`);
    this.emit(event, { streak: true, reason });
    return event;
  }

  handle(event = {}) {
    if (!this.isStreakable(event)) {
      this.emit(event, { streak: false, reason: "single" });
      return { emitted: true, pending: false, count: this.repeatCount(event) };
    }

    const key = this.key(event);
    const count = this.repeatCount(event);
    const isFinal = event.repeatEnd === true;

    if (isFinal) {
      this.clearEntry(key);
      const finalEvent = { ...event, repeatCount: count, repeatEnd: true };
      this.emit(finalEvent, { streak: true, reason: "repeatEnd" });
      return { emitted: true, pending: false, count };
    }

    const previous = this.pending.get(key);
    if (previous?.timer) clearTimeout(previous.timer);

    const entry = {
      event: { ...(previous?.event || {}), ...event },
      count: Math.max(count, previous?.count || 0),
      timer: null
    };
    entry.timer = setTimeout(() => this.flush(key, "timeout"), this.timeoutMs);
    entry.timer.unref?.();
    this.pending.set(key, entry);

    return { emitted: false, pending: true, count: entry.count };
  }

  flushAll(reason = "stop") {
    const keys = [...this.pending.keys()];
    return keys.map(key => this.flush(key, reason)).filter(Boolean);
  }

  snapshot() {
    return {
      pendingStreaks: this.pending.size,
      timeoutMs: this.timeoutMs
    };
  }
}

module.exports = { GiftStreakTracker };
