"use strict";

const { normalizePublicYoutubeUrl, sanitizeReferenceSample, GAME_PROFILES, profileId } = require("./cut-reference-learning");

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const PROVIDER_HOST = "generativelanguage.googleapis.com";
const MAX_RESPONSE_BYTES = 512 * 1024;

function text(value, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function providerError(message, statusCode = 502, code = "cut_reference_provider_failed") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
function normalizeModel(value) {
  const model = String(value || DEFAULT_GEMINI_MODEL).trim();
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(model)) throw providerError("Ungültiges Reference-Provider-Modell.", 500, "cut_reference_model_invalid");
  return model;
}
function responseSchema(gameProfile) {
  const categories = GAME_PROFILES[profileId(gameProfile)]?.categories || GAME_PROFILES.generic.categories;
  return {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      channel: { type: "STRING" },
      summary: { type: "STRING" },
      reference_score: { type: "NUMBER" },
      hook_seconds: { type: "NUMBER" },
      ideal_short_seconds: { type: "NUMBER" },
      action_density: { type: "NUMBER" },
      pacing: { type: "STRING", enum: ["slow", "balanced", "fast", "mixed"] },
      lessons: { type: "ARRAY", items: { type: "STRING" } },
      events: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING", enum: categories },
            start: { type: "NUMBER" },
            end: { type: "NUMBER" },
            confidence: { type: "NUMBER" },
            short_score: { type: "NUMBER" },
            hook_score: { type: "NUMBER" },
            reaction: { type: "NUMBER" },
            context_before: { type: "NUMBER" },
            context_after: { type: "NUMBER" },
            label: { type: "STRING" },
            reason: { type: "STRING" }
          },
          required: ["category", "start", "end", "confidence"]
        }
      }
    },
    required: ["summary", "reference_score", "hook_seconds", "ideal_short_seconds", "action_density", "pacing", "events", "lessons"]
  };
}
function extractJson(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  const output = Array.isArray(parts) ? parts.map(part => typeof part?.text === "string" ? part.text : "").join("").trim() : "";
  if (!output) throw providerError("Reference Provider hat kein strukturiertes Ergebnis geliefert.", 502, "cut_reference_empty");
  let parsed;
  try { parsed = JSON.parse(output); }
  catch {
    const match = output.match(/\{[\s\S]*\}/);
    try { parsed = match ? JSON.parse(match[0]) : null; } catch { parsed = null; }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw providerError("Reference Provider lieferte ungültiges JSON.", 502, "cut_reference_invalid_json");
  return parsed;
}

async function analyzeCutReferenceWithGemini({ url, gameProfile = "generic", apiKey, model = DEFAULT_GEMINI_MODEL, timeoutMs = 90000 } = {}) {
  const key = String(apiKey || "").trim();
  if (!key) throw providerError("Reference Provider ist nicht konfiguriert.", 503, "cut_reference_provider_unconfigured");
  const publicUrl = normalizePublicYoutubeUrl(url);
  const safeModel = normalizeModel(model);
  const profile = profileId(gameProfile);
  const categories = GAME_PROFILES[profile]?.categories || GAME_PROFILES.generic.categories;
  const endpoint = new URL(`https://${PROVIDER_HOST}/v1beta/models/${encodeURIComponent(safeModel)}:generateContent`);
  endpoint.searchParams.set("key", key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(5000, Math.min(110000, Number(timeoutMs) || 90000)));
  timer.unref?.();

  const prompt = [
    "Analyze this public gameplay reference only for general editing patterns.",
    "Do not infer facts about the creator or copy content. Do not claim an event unless it is visible in this reference.",
    `Game profile: ${profile}. Allowed event categories: ${categories.join(", ")}.`,
    "Return concise structured JSON. Focus on hook timing, ideal short duration, action density, pacing, context before/after and reusable editing lessons.",
    "This reference may influence only editorial scoring; it must never create semantic evidence for another creator's own clip."
  ].join("\n");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "manual",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { fileData: { mimeType: "video/*", fileUri: publicUrl } }
        ] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: responseSchema(profile)
        }
      })
    });
    if (response.status >= 300 && response.status < 400) throw providerError("Reference Provider Redirect wurde aus Sicherheitsgründen blockiert.", 502, "cut_reference_redirect_blocked");
    const host = new URL(response.url || endpoint.toString()).hostname.toLowerCase();
    if (host !== PROVIDER_HOST) throw providerError("Reference Provider antwortete von einer unerwarteten Domain.", 502, "cut_reference_host_mismatch");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_RESPONSE_BYTES) throw providerError("Reference Provider Antwort ist zu groß.", 502, "cut_reference_response_too_large");
    let payload = {};
    try { payload = JSON.parse(buffer.toString("utf8") || "{}"); } catch {}
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status >= 500 ? 502 : 400;
      const message = text(payload?.error?.message, 260) || `Reference Provider Fehler (${response.status}).`;
      throw providerError(message, status, "cut_reference_provider_http");
    }
    const parsed = extractJson(payload);
    const analyzedAt = new Date().toISOString();
    const sample = sanitizeReferenceSample({ ...parsed, url: publicUrl, status: "analyzed", analyzed_at: analyzedAt }, profile);
    if (!sample || sample.status !== "analyzed") throw providerError("Reference Provider Ergebnis konnte nicht sicher normalisiert werden.", 502, "cut_reference_normalization_failed");
    return { provider: "gemini", model: safeModel, sample };
  } catch (error) {
    if (error?.name === "AbortError") throw providerError("Reference Provider Timeout.", 504, "cut_reference_timeout");
    if (error?.statusCode) throw error;
    throw providerError("Reference Provider konnte nicht erreicht werden.", 502, "cut_reference_network_error");
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { analyzeCutReferenceWithGemini, DEFAULT_GEMINI_MODEL };
