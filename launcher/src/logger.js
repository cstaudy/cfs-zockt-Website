const fs = require("node:fs");
const path = require("node:path");

function sanitize(value) {
  let text = String(value ?? "");
  text = text.replace(/cfsb_[A-Za-z0-9_-]{20,}/g, "cfsb_[REDACTED]");
  text = text.replace(/Authorization:\s*Bearer\s+\S+/gi, "Authorization: Bearer [REDACTED]");
  return text;
}

class Logger {
  constructor(filePath) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  write(level, message, details = "") {
    const row = `${new Date().toISOString()} [${level}] ${sanitize(message)}${details ? ` ${sanitize(details)}` : ""}\n`;
    try {
      fs.appendFileSync(this.filePath, row, "utf8");
      const stat = fs.statSync(this.filePath);
      if (stat.size > 2 * 1024 * 1024) {
        const text = fs.readFileSync(this.filePath, "utf8");
        fs.writeFileSync(this.filePath, text.slice(-1024 * 1024), "utf8");
      }
    } catch {}
  }

  info(m, d) { this.write("INFO", m, d); }
  warn(m, d) { this.write("WARN", m, d); }
  error(m, d) { this.write("ERROR", m, d); }

  tail(maxBytes = 30000) {
    let fd = null;
    try {
      const limit = Math.max(1000, Math.min(200000, Number(maxBytes) || 30000));
      const stat = fs.statSync(this.filePath);
      if (!stat.size) return "";
      const length = Math.min(stat.size, limit);
      const start = Math.max(0, stat.size - length);
      const buffer = Buffer.alloc(length);
      fd = fs.openSync(this.filePath, "r");
      fs.readSync(fd, buffer, 0, length, start);
      return sanitize(buffer.toString("utf8"));
    } catch {
      return "";
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch {}
      }
    }
  }
}

module.exports = { Logger };
