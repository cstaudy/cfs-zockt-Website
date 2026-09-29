"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const HOST = String(process.env.CFS_INTERACTIVE_GAME_HOST || "127.0.0.1").trim();
const PORT = Math.max(1024, Math.min(65535, Number(process.env.CFS_INTERACTIVE_GAME_PORT) || 8787));
const TOKEN = String(process.env.CFS_INTERACTIVE_GAME_TOKEN || "");
const DATA_DIR = path.resolve(process.env.CFS_INTERACTIVE_GAME_DATA_DIR || path.join(process.cwd(), ".data"));
const ROOT = path.resolve(__dirname);
const GAMES_DIR = path.join(ROOT, "games");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATE_FILE = path.join(DATA_DIR, "runtime-state.json");
const MAX_BODY = 32 * 1024;
const MAX_EVENTS = 160;
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

if (!TOKEN || TOKEN.length < 32) {
  process.stderr.write("Interactive Games runtime requires a strong local token.\n");
  process.exit(2);
}
if (!ALLOWED_HOSTS.has(HOST)) {
  process.stderr.write("Interactive Games runtime may bind to loopback only.\n");
  process.exit(2);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

function text(value, max = 160) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function safeId(value) {
  return text(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
}
function safeEq(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}
function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "cross-origin-resource-policy": "same-origin"
  });
  res.end(body);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("payload_too_large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        if (!chunks.length) return resolve({});
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        resolve(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {});
      } catch {
        reject(Object.assign(new Error("invalid_json"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}
function listGames() {
  if (!fs.existsSync(GAMES_DIR)) return [];
  const out = [];
  for (const entry of fs.readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(GAMES_DIR, entry.name, "game.json");
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      const id = safeId(raw.id || entry.name);
      if (!id) continue;
      out.push({
        id,
        name: text(raw.name || raw.label || id, 80),
        label: text(raw.label || raw.name || id, 80),
        version: text(raw.version || "1.0.0", 30),
        category: safeId(raw.category || "community"),
        events: Array.isArray(raw.events) ? raw.events.slice(0, 20).map(safeId).filter(Boolean) : []
      });
    } catch {}
  }
  return out.sort((a, b) => a.id.localeCompare(b.id)).slice(0, 100);
}
const catalog = listGames();
const catalogIds = new Set(catalog.map(item => item.id));

let state = {
  schema: 1,
  activeGame: "",
  terminalId: "",
  selectedAt: null,
  updatedAt: new Date().toISOString(),
  sequence: 0,
  events: []
};
try {
  const stored = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  if (catalogIds.has(safeId(stored.activeGame))) {
    state.activeGame = safeId(stored.activeGame);
    state.terminalId = safeId(stored.terminalId);
    state.selectedAt = text(stored.selectedAt, 40) || null;
  }
} catch {}
function persistState() {
  const temp = `${STATE_FILE}.${process.pid}.tmp`;
  const safe = {
    schema: 1,
    activeGame: state.activeGame,
    terminalId: state.terminalId,
    selectedAt: state.selectedAt,
    updatedAt: state.updatedAt
  };
  fs.writeFileSync(temp, JSON.stringify(safe, null, 2), { mode: 0o600 });
  fs.renameSync(temp, STATE_FILE);
}
function publicState() {
  return {
    ok: true,
    schema: 1,
    active_game: state.activeGame,
    terminal_id: state.terminalId,
    selected_at: state.selectedAt,
    updated_at: state.updatedAt,
    sequence: state.sequence,
    recent_events: state.events.slice(-30),
    catalog
  };
}
function cleanEvent(input = {}) {
  return {
    id: `evt_${crypto.randomBytes(8).toString("hex")}`,
    type: safeId(input.type),
    provider: safeId(input.provider || input.source_provider),
    username: text(input.username, 80),
    gift_name: text(input.gift_name, 80),
    gift_count: Math.max(0, Math.min(100000, Number(input.gift_count) || 0)),
    like_count: Math.max(0, Math.min(10000000, Number(input.like_count) || 0)),
    text: text(input.text, 300),
    received_at: text(input.received_at, 40) || new Date().toISOString()
  };
}
function auth(req) {
  return safeEq(req.headers["x-cfs-local-token"], TOKEN);
}
function setHtmlHeaders(res) {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'self'");
}
function serveFile(res, file, contentType) {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(ROOT + path.sep) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return json(res, 404, { ok: false, error: "not_found" });
  }
  const body = fs.readFileSync(resolved);
  if (contentType === "text/html") setHtmlHeaders(res);
  else {
    res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-content-type-options", "nosniff");
  }
  res.statusCode = 200;
  res.end(body);
}

let shuttingDown = false;
const server = http.createServer(async (req, res) => {
  const remote = req.socket.remoteAddress || "";
  if (!remote.includes("127.0.0.1") && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
    return json(res, 403, { ok: false, error: "loopback_only" });
  }
  const base = `http://${req.headers.host || `127.0.0.1:${PORT}`}`;
  let url;
  try { url = new URL(req.url || "/", base); } catch { return json(res, 400, { ok: false, error: "bad_url" }); }

  if (req.method === "GET" && url.pathname === "/api/status") {
    return json(res, 200, { ...publicState(), ready: true, pid: process.pid, bind_address: HOST, port: PORT, secrets_exposed: false });
  }
  if (req.method === "GET" && url.pathname === "/api/public/state") {
    return json(res, 200, publicState());
  }
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/overlay.html")) {
    return serveFile(res, path.join(PUBLIC_DIR, "overlay.html"), "text/html");
  }
  if (req.method === "GET" && url.pathname === "/overlay.js") {
    return serveFile(res, path.join(PUBLIC_DIR, "overlay.js"), "text/javascript; charset=utf-8");
  }

  if (req.method !== "GET" && !auth(req)) return json(res, 401, { ok: false, error: "unauthorized" });

  try {
    if (req.method === "POST" && url.pathname === "/api/game/select") {
      const body = await readJson(req);
      const game = safeId(body.game_type);
      if (!catalogIds.has(game)) return json(res, 400, { ok: false, error: "unknown_game" });
      state.activeGame = game;
      state.terminalId = safeId(body.terminal_id);
      state.selectedAt = new Date().toISOString();
      state.updatedAt = state.selectedAt;
      state.sequence += 1;
      state.events = [];
      persistState();
      return json(res, 200, { ok: true, active_game: game, terminal_id: state.terminalId, sequence: state.sequence });
    }
    if (req.method === "POST" && url.pathname === "/api/events") {
      if (!state.activeGame) return json(res, 409, { ok: false, error: "no_active_game" });
      const body = await readJson(req);
      const event = cleanEvent(body);
      if (!event.type) return json(res, 400, { ok: false, error: "event_type_required" });
      state.sequence += 1;
      state.updatedAt = new Date().toISOString();
      state.events.push({ ...event, sequence: state.sequence });
      if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
      return json(res, 202, { ok: true, sequence: state.sequence });
    }
    if (req.method === "POST" && url.pathname === "/api/shutdown") {
      shuttingDown = true;
      json(res, 200, { ok: true });
      setTimeout(() => server.close(() => process.exit(0)), 25).unref();
      return;
    }
  } catch (error) {
    return json(res, Number(error?.status) || 400, { ok: false, error: text(error?.message || "request_failed", 120) });
  }

  return json(res, 404, { ok: false, error: "not_found" });
});

server.on("error", error => {
  process.stderr.write(`Interactive Games runtime error: ${text(error?.message || error, 300)}\n`);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  process.stdout.write(`Interactive Games runtime ready on ${HOST}:${PORT}\n`);
});
process.on("SIGTERM", () => { if (!shuttingDown) server.close(() => process.exit(0)); });
process.on("SIGINT", () => { if (!shuttingDown) server.close(() => process.exit(0)); });
