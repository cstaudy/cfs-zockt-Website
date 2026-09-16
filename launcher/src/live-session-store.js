"use strict";

const fs = require("node:fs");
const path = require("node:path");

class LiveSessionStore {
  constructor(filePath, logger = null) {
    this.filePath = filePath;
    this.logger = logger;
    fs.mkdirSync(path.dirname(filePath), { recursive:true });
  }

  read() {
    try {
      if (!fs.existsSync(this.filePath)) return { schema:1, active:false };
      const value = JSON.parse(fs.readFileSync(this.filePath,"utf8"));
      if (!value || value.schema !== 1 || value.active !== true || !value.sessionId) {
        return { schema:1, active:false };
      }
      return {
        schema:1,
        active:true,
        sessionId:String(value.sessionId),
        provider:String(value.provider || "mock"),
        username:String(value.username || ""),
        startedAt:value.startedAt || null,
        lastUpdatedAt:value.lastUpdatedAt || null,
        lastError:String(value.lastError || "")
      };
    } catch (error) {
      this.logger?.warn?.("LIVE session marker read failed", error?.message);
      return { schema:1, active:false, error:String(error?.message || error) };
    }
  }

  write(value) {
    const normalized = {
      schema:1,
      active:value?.active === true,
      sessionId:value?.active === true ? String(value.sessionId || "") : "",
      provider:String(value?.provider || "mock"),
      username:String(value?.username || ""),
      startedAt:value?.startedAt || null,
      lastUpdatedAt:new Date().toISOString(),
      lastError:String(value?.lastError || "")
    };
    if (normalized.active && !normalized.sessionId) throw new Error("LIVE Session-ID fehlt.");
    const temp = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(normalized,null,2), "utf8");
    fs.renameSync(temp, this.filePath);
    return normalized;
  }

  setActive({ sessionId, provider="mock", username="", startedAt=null } = {}) {
    return this.write({
      active:true,
      sessionId,
      provider,
      username,
      startedAt:startedAt || new Date().toISOString(),
      lastError:""
    });
  }

  touch(patch = {}) {
    const current = this.read();
    if (!current.active) return current;
    return this.write({ ...current, ...patch, active:true });
  }

  markError(error) {
    const current = this.read();
    if (!current.active) return current;
    return this.write({ ...current, active:true, lastError:String(error?.message || error || "recovery_failed").slice(0,500) });
  }

  clear() {
    try {
      fs.rmSync(this.filePath,{force:true});
    } catch (error) {
      this.logger?.warn?.("LIVE session marker clear failed", error?.message);
    }
    return { schema:1, active:false };
  }

  snapshot() {
    const value = this.read();
    return {
      active:Boolean(value.active),
      sessionId:value.active ? value.sessionId : null,
      provider:value.active ? value.provider : null,
      startedAt:value.active ? value.startedAt : null,
      lastUpdatedAt:value.active ? value.lastUpdatedAt : null,
      lastError:value.active ? value.lastError : ""
    };
  }
}

module.exports = { LiveSessionStore };
