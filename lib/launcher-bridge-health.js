"use strict";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 10 * 1000;
const DEFAULT_ONLINE_WINDOW_MS = 45 * 1000;
const DEFAULT_GRACE_WINDOW_MS = 90 * 1000;

const clampMs = (value, fallback, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

function launcherBridgeTiming(input = {}) {
  const heartbeatAfterMs = clampMs(input.heartbeat_after_ms, DEFAULT_HEARTBEAT_INTERVAL_MS, 5000, 60000);
  const onlineWindowMs = clampMs(input.online_window_ms, Math.max(DEFAULT_ONLINE_WINDOW_MS, heartbeatAfterMs * 3), heartbeatAfterMs * 2, 120000);
  const graceWindowMs = clampMs(input.grace_window_ms, Math.max(DEFAULT_GRACE_WINDOW_MS, onlineWindowMs * 2), onlineWindowMs, 300000);
  return { heartbeatAfterMs, onlineWindowMs, graceWindowMs };
}

function launcherBridgeHealth(lastSeenAt, input = {}, now = Date.now()) {
  const timing = launcherBridgeTiming(input);
  const seenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const ageMs = Number.isFinite(seenMs) && seenMs > 0 ? Math.max(0, now - seenMs) : null;
  let state = "offline";
  if (ageMs !== null && ageMs <= timing.onlineWindowMs) state = "online";
  else if (ageMs !== null && ageMs <= timing.graceWindowMs) state = "degraded";
  return {
    state,
    online: state === "online",
    reachable: state !== "offline",
    age_ms: ageMs,
    age_seconds: ageMs === null ? null : Math.floor(ageMs / 1000),
    ...timing
  };
}

module.exports = {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_ONLINE_WINDOW_MS,
  DEFAULT_GRACE_WINDOW_MS,
  launcherBridgeTiming,
  launcherBridgeHealth
};
