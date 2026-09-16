"use strict";

const DEFAULT_RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function validSessionId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function canResumeSessionRow(row, {
  now = Date.now(),
  maxAgeMs = DEFAULT_RESUME_MAX_AGE_MS
} = {}) {
  if (!row) return { ok:false, reason:"session_not_found" };
  if (String(row.status || "") !== "live") return { ok:false, reason:"session_not_live" };
  const timestamp = row.updated_at || row.started_at || null;
  const time = timestamp ? new Date(timestamp).getTime() : 0;
  if (!time || !Number.isFinite(time)) return { ok:false, reason:"session_timestamp_missing" };
  if (now - time > Math.max(60_000, Number(maxAgeMs) || DEFAULT_RESUME_MAX_AGE_MS)) {
    return { ok:false, reason:"session_too_old" };
  }
  return { ok:true, reason:"ok" };
}

function releasePolicyAllowsLive(policy) {
  const maintenance = policy?.safety?.maintenance?.active === true;
  const blocked = policy?.version_blocked === true;
  const required = policy?.update_required === true;
  const liveAllowed = policy?.live_allowed !== false;
  return {
    ok: liveAllowed && !maintenance && !blocked && !required,
    maintenance,
    blocked,
    required,
    reason: maintenance ? "maintenance"
      : blocked ? "version_blocked"
      : required ? "update_required"
      : liveAllowed ? "ok" : "live_not_allowed"
  };
}

function buildResumedLiveState(session, current = null) {
  const sameSession = Boolean(current && String(current.session_id || "") === String(session?.id || ""));
  return {
    session_id: String(session?.id || ""),
    provider: "launcher_bridge",
    connected: true,
    likes: Number(sameSession ? current.likes : session?.likes || 0),
    viewers: Number(sameSession ? current.viewers : 0),
    shares: Number(sameSession ? current.shares : session?.shares || 0),
    gifts_count: Number(sameSession ? current.gifts_count : session?.gifts_count || 0),
    gifts_value: Number(sameSession ? current.gifts_value : session?.gifts_value || 0),
    followers_gained: Number(sameSession ? current.followers_gained : session?.followers_gained || 0),
    started_at: sameSession ? (current.started_at || session?.started_at || null) : (session?.started_at || null),
    last_event_at: sameSession ? (current.last_event_at || null) : null
  };
}

module.exports = {
  DEFAULT_RESUME_MAX_AGE_MS,
  validSessionId,
  canResumeSessionRow,
  releasePolicyAllowsLive,
  buildResumedLiveState
};
