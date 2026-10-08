"use strict";

// Datenquellen sind unterschiedlich schnell. Die Grenzwerte müssen oberhalb des
// jeweiligen Backend-Reconcile-Intervalls liegen, aber einen ausgefallenen
// Worker/Provider schließlich als offline kennzeichnen.
const LIVE_PROVIDER_FRESHNESS_MS = Object.freeze({
  twitch: 45 * 60 * 1000, // Reconcile alle 15 Minuten
  youtube: 6 * 60 * 1000  // aktiver Poll ca. 15 Sek., idle ca. 3 Minuten
});

function publicProviderLiveState(provider, row, now = Date.now()) {
  const key = String(provider || "").toLowerCase();
  const updated = row?.updated_at ? new Date(row.updated_at).getTime() : NaN;
  const timeout = LIVE_PROVIDER_FRESHNESS_MS[key];
  const stale = !Number.isFinite(updated) || updated <= 0 ||
    !Number.isFinite(timeout) || now - updated > timeout || updated > now + 60_000;
  return {
    connected: row?.connected === true && !stale,
    provider: key || "none",
    session_id: row?.session_id || null,
    likes: 0, viewers: 0, shares: 0, gifts_count: 0, gifts_value: 0, followers_gained: 0,
    started_at: row?.started_at || null,
    last_event_at: row?.last_event_at || null,
    updated_at: row?.updated_at || null,
    stale
  };
}

// Alerts und Chat nie mit historischen Events aus einer beendeten/offline
// Session füttern. "latest" darf bei offlineBehavior=hold bestehen bleiben.
function widgetEventReadAllowed(definition = {}, live = {}) {
  if (!definition.event_type) return false;
  const source = String(definition.source_kind || "");
  if (source !== "live_provider" && source !== "live_bridge") return false;
  if (!live.session_id) return false;
  const mode = String(definition.mode || "");
  if ((mode === "alert" || mode === "chat") && (live.connected !== true || live.stale === true)) {
    return false;
  }
  return true;
}

module.exports = { LIVE_PROVIDER_FRESHNESS_MS, publicProviderLiveState, widgetEventReadAllowed };
