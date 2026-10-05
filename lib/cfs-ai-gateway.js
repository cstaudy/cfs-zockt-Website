"use strict";

const { URL, URLSearchParams } = require("url");

const DEFAULT_TIMEOUT_MS = 110000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

function boolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

function isLoopbackHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
}

function config() {
  const enabled = boolEnv("CFS_AI_ENABLED", false);
  const baseText = String(process.env.CFS_AI_BASE_URL || "http://127.0.0.1:8000").trim();
  const token = String(process.env.CFS_AI_BRIDGE_TOKEN || "").trim();
  const timeout = Math.max(5000, Math.min(115000, Number(process.env.CFS_AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS));
  let baseUrl = null;
  let error = "";
  try {
    const parsed = new URL(baseText);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Nur http/https erlaubt.");
    if (parsed.username || parsed.password) throw new Error("Credentials duerfen nicht in der AI-URL stehen.");
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") + "/";
    parsed.search = "";
    parsed.hash = "";
    if (!isLoopbackHost(parsed.hostname) && !token) {
      throw new Error("Fuer eine entfernte CFS-AI-Adresse ist CFS_AI_BRIDGE_TOKEN erforderlich.");
    }
    baseUrl = parsed;
  } catch (e) {
    error = e?.message || "CFS-AI-Adresse ist ungueltig.";
  }
  return { enabled, baseUrl, token, timeout, error };
}

function publicConfig() {
  const c = config();
  return {
    enabled: c.enabled,
    configured: Boolean(c.baseUrl) && !c.error,
    target: c.baseUrl ? `${c.baseUrl.protocol}//${c.baseUrl.host}` : "",
    local_target: Boolean(c.baseUrl && isLoopbackHost(c.baseUrl.hostname)),
    token_configured: Boolean(c.token),
    error: c.error || ""
  };
}

function targetUrl(apiPath, query = null) {
  const c = config();
  if (!c.enabled) {
    const error = new Error("CFS AI ist auf der Website noch nicht aktiviert.");
    error.code = "cfs_ai_disabled";
    throw error;
  }
  if (!c.baseUrl || c.error) {
    const error = new Error(c.error || "CFS-AI-Service ist nicht konfiguriert.");
    error.code = "cfs_ai_config";
    throw error;
  }
  const clean = String(apiPath || "");
  if (!clean.startsWith("/api/") || clean.includes("..") || /[\r\n]/.test(clean)) {
    const error = new Error("Ungueltiger interner CFS-AI-Pfad.");
    error.code = "cfs_ai_path";
    throw error;
  }
  const url = new URL(clean.replace(/^\//, ""), c.baseUrl);
  if (url.origin !== c.baseUrl.origin) {
    const error = new Error("CFS-AI-Ziel verlaesst die konfigurierte Origin.");
    error.code = "cfs_ai_origin";
    throw error;
  }
  if (query && typeof query === "object") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      params.set(key, String(value).slice(0, 500));
    }
    url.search = params.toString();
  }
  return { url, c };
}

async function readBounded(response, maxBytes = MAX_RESPONSE_BYTES) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    const error = new Error("CFS-AI-Antwort ist zu gross.");
    error.code = "cfs_ai_response_too_large";
    throw error;
  }
  return text;
}

async function requestJson(apiPath, { method = "GET", body = undefined, query = null, timeoutMs = null } = {}) {
  const { url, c } = targetUrl(apiPath, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || c.timeout);
  try {
    const headers = { "Accept": "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (c.token) headers["X-CFS-AI-Bridge-Token"] = c.token;
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const text = await readBounded(response);
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: "CFS-AI-Service lieferte keine gueltige JSON-Antwort." }; }
    if (!response.ok) {
      const error = new Error(String(data.detail || data.error || `CFS AI HTTP ${response.status}`));
      error.statusCode = response.status;
      error.code = "cfs_ai_upstream";
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("CFS AI hat nicht rechtzeitig geantwortet.");
      timeoutError.code = "cfs_ai_timeout";
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestHtml(apiPath, { timeoutMs = 30000 } = {}) {
  const { url, c } = targetUrl(apiPath);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, c.timeout));
  try {
    const headers = { "Accept": "text/html" };
    if (c.token) headers["X-CFS-AI-Bridge-Token"] = c.token;
    const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
    const text = await readBounded(response, 2 * 1024 * 1024);
    if (!response.ok) {
      const error = new Error(`CFS-AI-Vorschau konnte nicht geladen werden (${response.status}).`);
      error.statusCode = response.status;
      throw error;
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { publicConfig, requestJson, requestHtml };
