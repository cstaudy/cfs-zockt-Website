"use strict";

const ALLOWED_EVENT_TYPES = new Set(["follow","like","gift","share","viewer_update","chat"]);
const ALLOWED_SOURCE_PROVIDERS = new Set(["tiktok","twitch","youtube","kick","facebook","custom_rtmp","simulator","launcher_bridge"]);

function cleanText(value, max = 160) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function cleanNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function sourceProviderForAdapter(adapterKey = "") {
  const key = cleanText(adapterKey, 40).toLowerCase();
  if (key === "tiktool" || key === "tiktok") return "tiktok";
  if (key === "mock" || key === "simulator") return "simulator";
  if (["twitch","youtube","kick","facebook","custom_rtmp"].includes(key)) return key;
  return "launcher_bridge";
}

function sanitizePayload(payload = {}, sourceProvider = "launcher_bridge") {
  const input = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const provider = ALLOWED_SOURCE_PROVIDERS.has(sourceProvider) ? sourceProvider : "launcher_bridge";
  const out = {
    source_provider: provider
  };

  const sourceChannel = cleanText(input.source_channel ?? input.channel ?? input.room ?? "", 120);
  const sourceEventId = cleanText(input.source_event_id ?? input.sourceEventId ?? input.message_id ?? input.messageId ?? "", 160);
  const message = cleanText(input.message ?? input.comment ?? input.text ?? "", 280);
  const giftName = cleanText(input.gift_name ?? input.giftName ?? "", 120);
  const giftId = cleanText(input.gift_id ?? input.giftId ?? "", 120);
  const botCommand = cleanText(input.bot_command ?? input.botCommand ?? "", 24);

  if (sourceChannel) out.source_channel = sourceChannel;
  if (sourceEventId) out.source_event_id = sourceEventId;
  if (message) out.message = message;
  if (giftName) out.gift_name = giftName;
  if (giftId) out.gift_id = giftId;
  if (botCommand) out.bot_command = botCommand;

  if (input.is_bot === true) out.is_bot = true;
  if (input.repeat_end === true) out.repeat_end = true;

  const repeatCount = Math.round(cleanNumber(input.repeat_count ?? input.repeatCount ?? 0, 0, 1_000_000));
  const totalLikes = Math.round(cleanNumber(input.total_likes ?? input.totalLikes ?? 0, 0, 1_000_000_000));
  if (repeatCount > 0) out.repeat_count = repeatCount;
  if (totalLikes > 0) out.total_likes = totalLikes;

  const valueUnit = cleanText(input.provider_value_unit ?? "", 24).toLowerCase();
  if (["diamonds","bits","stars","currency","points"].includes(valueUnit)) out.provider_value_unit = valueUnit;

  return out;
}

function normalizeProviderEvent(adapterKey, event = {}) {
  const eventType = cleanText(event.event_type ?? event.type ?? "", 40).toLowerCase();
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    const error = new Error(`Unbekannter Event-Typ: ${eventType || "leer"}`);
    error.code = "provider_event_type_invalid";
    throw error;
  }

  const sourceProvider = sourceProviderForAdapter(adapterKey);
  const payload = sanitizePayload(event.payload, sourceProvider);
  const sourceEventId = payload.source_event_id || cleanText(event.event_key ?? event.id ?? "", 160);
  const eventKey = cleanText(event.event_key, 160) || `${sourceProvider}-${eventType}-${sourceEventId || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`}`;

  return {
    event_key: eventKey,
    event_type: eventType,
    actor_name: cleanText(event.actor_name ?? event.actor ?? event.username ?? "", 100),
    actor_avatar: cleanText(event.actor_avatar ?? event.avatar ?? "", 2000),
    amount: cleanNumber(event.amount ?? (eventType === "viewer_update" ? 0 : 1), 0, 1_000_000_000),
    value: cleanNumber(event.value ?? 0, 0, 1_000_000_000),
    payload
  };
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  ALLOWED_SOURCE_PROVIDERS,
  cleanText,
  sanitizePayload,
  sourceProviderForAdapter,
  normalizeProviderEvent
};
