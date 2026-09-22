"use strict";

const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;

function normalizeAllowedHosts(values = []) {
  return new Set(Array.from(values || []).map(value => String(value || "").trim().toLowerCase()).filter(Boolean));
}

function assertOutboundHttpsUrl(value, { allowedHosts = [], label = "Outbound URL" } = {}) {
  let url;
  try { url = new URL(String(value || "").trim()); }
  catch { throw new Error(`${label} ist ungültig.`); }
  if (url.protocol !== "https:") throw new Error(`${label} muss HTTPS verwenden.`);
  if (!url.hostname || url.username || url.password) throw new Error(`${label} enthält unzulässige Zugangsdaten.`);
  if (url.hash) throw new Error(`${label} darf kein Fragment enthalten.`);
  const hosts = normalizeAllowedHosts(allowedHosts);
  if (hosts.size && !hosts.has(url.hostname.toLowerCase())) throw new Error(`${label} verweist auf einen nicht erlaubten Host.`);
  return url;
}

async function readResponseTextBounded(response, maxBytes = DEFAULT_MAX_RESPONSE_BYTES) {
  const limit = Math.max(1024, Math.min(16 * 1024 * 1024, Number(maxBytes) || DEFAULT_MAX_RESPONSE_BYTES));
  const declared = Number(response?.headers?.get?.("content-length") || 0);
  if (declared > limit) {
    const error = new Error("HTTP-Antwort ist größer als erlaubt.");
    error.code = "outbound_response_too_large";
    throw error;
  }

  const body = response?.body;
  if (!body || typeof body.getReader !== "function") {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > limit) {
      const error = new Error("HTTP-Antwort ist größer als erlaubt.");
      error.code = "outbound_response_too_large";
      throw error;
    }
    return text;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value?.byteLength || 0;
      if (total > limit) {
        try { await reader.cancel("response too large"); } catch {}
        const error = new Error("HTTP-Antwort ist größer als erlaubt.");
        error.code = "outbound_response_too_large";
        throw error;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

async function readJsonResponseBounded(response, { maxBytes = DEFAULT_MAX_RESPONSE_BYTES, fallback = null } = {}) {
  const text = await readResponseTextBounded(response, maxBytes);
  if (!text.trim()) return fallback;
  try { return JSON.parse(text); }
  catch {
    const error = new Error("HTTP-Antwort enthält kein gültiges JSON.");
    error.code = "outbound_invalid_json";
    throw error;
  }
}

module.exports = {
  DEFAULT_MAX_RESPONSE_BYTES,
  assertOutboundHttpsUrl,
  readResponseTextBounded,
  readJsonResponseBounded
};
