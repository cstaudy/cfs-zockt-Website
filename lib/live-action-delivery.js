"use strict";

const ACTION_LEASE_SECONDS = 45;
const ACTION_RETRY_DELAY_SECONDS = 5;
const ACTION_MAX_ATTEMPTS = 5;
const ACTION_TTL_MINUTES = 15;

function normalizeActionIds(values, limit = 50) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(String)
    .filter(value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)))]
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 50)));
}

function retryDecision({
  attempts = 0,
  expiresAt = null,
  now = Date.now(),
  maxAttempts = ACTION_MAX_ATTEMPTS
} = {}) {
  const expired = expiresAt ? new Date(expiresAt).getTime() <= now : false;
  if (expired) return { retry:false, status:"expired", reason:"expired" };
  if (Number(attempts || 0) >= Number(maxAttempts || ACTION_MAX_ATTEMPTS)) {
    return { retry:false, status:"expired", reason:"max_attempts" };
  }
  return { retry:true, status:"delivered", reason:"retry_after_lease" };
}

module.exports = {
  ACTION_LEASE_SECONDS,
  ACTION_RETRY_DELAY_SECONDS,
  ACTION_MAX_ATTEMPTS,
  ACTION_TTL_MINUTES,
  normalizeActionIds,
  retryDecision
};
