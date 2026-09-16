const fs = require("node:fs");
const path = require("node:path");

class EventSpool {
  constructor(filePath, logger, maxItems = 1000) {
    this.filePath = filePath;
    this.logger = logger;
    this.maxItems = Math.max(100, Math.min(5000, Number(maxItems) || 1000));
    this.items = [];
    this.dropped = 0;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      const source = Array.isArray(parsed?.items) ? parsed.items : [];
      this.items = source.filter(x => x && typeof x === "object" && x.event_key && x.event_type).slice(-this.maxItems);
      this.dropped = Math.max(0, Number(parsed?.dropped || 0));
      this.logger?.info("Event spool loaded", `${this.items.length} pending events`);
    } catch {
      this.items = [];
      this.dropped = 0;
    }
  }

  persist() {
    const payload = JSON.stringify({
      version: 1,
      updated_at: new Date().toISOString(),
      dropped: this.dropped,
      items: this.items
    }, null, 2);
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, payload, "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  all() {
    return this.items.map(x => ({ ...x, payload: x.payload && typeof x.payload === "object" ? { ...x.payload } : {} }));
  }

  push(event) {
    const key = String(event?.event_key || "");
    if (!key) throw new Error("Event-Spool benötigt einen event_key.");
    if (this.items.some(x => x.event_key === key)) return false;
    this.items.push(event);
    if (this.items.length > this.maxItems) {
      const removeCount = this.items.length - this.maxItems;
      this.items.splice(0, removeCount);
      this.dropped += removeCount;
      this.logger?.warn("Event spool overflow", `${removeCount} oldest events dropped`);
    }
    this.persist();
    return true;
  }

  removeKeys(keys = []) {
    const set = new Set(keys.map(String).filter(Boolean));
    if (!set.size) return 0;
    const before = this.items.length;
    this.items = this.items.filter(x => !set.has(String(x.event_key)));
    const removed = before - this.items.length;
    if (removed) this.persist();
    return removed;
  }

  clear() {
    const count = this.items.length;
    this.items = [];
    this.persist();
    return count;
  }

  snapshot() {
    let bytes = 0;
    try { bytes = fs.statSync(this.filePath).size; } catch {}
    return {
      persistent: true,
      pending: this.items.length,
      dropped: this.dropped,
      maxItems: this.maxItems,
      bytes,
      updatedAt: (() => {
        try { return fs.statSync(this.filePath).mtime.toISOString(); } catch { return null; }
      })()
    };
  }
}

module.exports = { EventSpool };
