"use strict";

const finiteInt = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
};

const text = (value, max = 160, fallback = "") => {
  const cleaned = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
};

const isoOrNull = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const serviceState = ({ status, available, connected, configured, online, stale, detail = "" } = {}) => {
  const normalizedStatus = text(status, 32).toLowerCase();
  let state = "unknown";
  if (["online", "live", "ready", "active", "connected", "ok"].includes(normalizedStatus)) state = "ready";
  else if (["offline", "disconnected", "down", "error"].includes(normalizedStatus)) state = "offline";
  else if (online === true || connected === true || available === true) state = stale === true ? "stale" : "ready";
  else if (configured === true) state = "waiting";
  else if (configured === false || available === false || connected === false || online === false) state = "offline";
  return { state, detail:text(detail, 220), stale:stale === true };
};

function buildPublicCreatorState({ community = {}, liveSession = {}, generatedAt = new Date().toISOString() } = {}) {
  const recentGames = community?.recent_games && typeof community.recent_games === "object" ? community.recent_games : {};
  const recent = Array.isArray(recentGames.recent) ? recentGames.recent : [];
  const games = Array.isArray(recentGames.games) ? recentGames.games : [];
  const currentGame = liveSession?.current_game && liveSession.current_game.name ? liveSession.current_game : (recentGames?.active?.game_name ? {
    name:recentGames.active.game_name,
    platform:recentGames.active.platform,
    source:recentGames.active.source,
    started_at:recentGames.active.started_at,
    elapsed_seconds:recentGames.active.elapsed_seconds
  } : null);

  return {
    ok:Boolean(community?.ok || liveSession?.ok),
    schema:1,
    generated_at:isoOrNull(generatedAt) || new Date().toISOString(),
    refresh_seconds:finiteInt(community?.refresh_seconds, 0),
    creator:{
      name:text(liveSession?.profile_name, 120, "cfs_zockt"),
      profile_url:text(liveSession?.profile_url || community?.tiktok?.url, 1000, ""),
      channels:{
        twitch:{
          connected:liveSession?.channels?.twitch?.connected === true,
          available:liveSession?.channels?.twitch?.available === true,
          status:text(liveSession?.channels?.twitch?.status, 32, "unknown"),
          authoritative:liveSession?.channels?.twitch?.authoritative === true,
          stale:liveSession?.channels?.twitch?.stale === true,
          profile_name:text(liveSession?.channels?.twitch?.profile_name, 120, ""),
          url:text(liveSession?.channels?.twitch?.url, 1000, ""),
          last_live_at:isoOrNull(liveSession?.channels?.twitch?.last_live_at),
          last_live_started_at:isoOrNull(liveSession?.channels?.twitch?.last_live_started_at)
        },
        tiktok:{
          connected:liveSession?.channels?.tiktok?.connected === true,
          available:liveSession?.channels?.tiktok?.available === true,
          status:text(liveSession?.channels?.tiktok?.status, 32, "unknown"),
          authoritative:liveSession?.channels?.tiktok?.authoritative === true,
          tracking_ready:liveSession?.channels?.tiktok?.tracking_ready === true,
          tracking_provider:text(liveSession?.channels?.tiktok?.tracking_provider, 40, "none"),
          provider_status:text(liveSession?.channels?.tiktok?.provider_status, 40, "unknown"),
          stale:liveSession?.channels?.tiktok?.stale === true,
          profile_name:text(liveSession?.channels?.tiktok?.profile_name, 120, "cfs_zockt"),
          url:text(liveSession?.channels?.tiktok?.url || community?.tiktok?.url, 1000, ""),
          last_live_at:isoOrNull(liveSession?.channels?.tiktok?.last_live_at),
          last_live_started_at:isoOrNull(liveSession?.channels?.tiktok?.last_live_started_at)
        }
      }
    },
    live:{
      active:liveSession?.live === true,
      status:text(liveSession?.status, 32, "unknown"),
      source:text(liveSession?.live_source, 64, "none"),
      provider:text(liveSession?.provider, 32, "none"),
      title:text(liveSession?.title, 220, ""),
      viewers:finiteInt(liveSession?.viewers),
      likes:finiteInt(liveSession?.likes),
      shares:finiteInt(liveSession?.shares),
      followers_gained:finiteInt(liveSession?.followers_gained),
      started_at:isoOrNull(liveSession?.started_at),
      updated_at:isoOrNull(liveSession?.updated_at),
      last_live_at:isoOrNull(liveSession?.last_live_at),
      last_live_started_at:isoOrNull(liveSession?.last_live_started_at),
      last_live_provider:text(liveSession?.last_live_provider, 32, ""),
      signal:{
        launcher_online:liveSession?.signal?.launcher_online === true,
        launcher_reachable:liveSession?.signal?.launcher_reachable === true,
        launcher_state:text(liveSession?.signal?.launcher_state, 32, liveSession?.signal?.launcher_online ? "online" : "offline"),
        heartbeat_age_seconds:Number.isFinite(Number(liveSession?.signal?.heartbeat_age_seconds)) ? finiteInt(liveSession.signal.heartbeat_age_seconds) : null,
        latest_event_at:isoOrNull(liveSession?.signal?.latest_event_at),
        latest_event_type:text(liveSession?.signal?.latest_event_type, 64, ""),
        twitch_checked_at:isoOrNull(liveSession?.signal?.twitch_checked_at),
        twitch_authoritative:liveSession?.signal?.twitch_authoritative === true,
        tiktok_checked_at:isoOrNull(liveSession?.signal?.tiktok_checked_at),
        tiktok_tracking_ready:liveSession?.signal?.tiktok_tracking_ready === true,
        tiktok_tracking_provider:text(liveSession?.signal?.tiktok_tracking_provider, 40, "none")
      }
    },
    game:{
      current:currentGame ? {
        name:text(currentGame.name || currentGame.game_name, 160),
        platform:text(currentGame.platform, 40, "unknown"),
        source:text(currentGame.source, 64, ""),
        started_at:isoOrNull(currentGame.started_at),
        elapsed_seconds:finiteInt(currentGame.elapsed_seconds)
      } : null,
      source:text(recentGames.source, 64, ""),
      playtime_scope:text(recentGames.playtime_scope, 40, ""),
      window_days:Number.isFinite(Number(recentGames.window_days)) ? Math.max(1, Math.floor(Number(recentGames.window_days))) : null,
      updated_at:isoOrNull(recentGames.updated_at),
      recent,
      games
    },
    social:{
      tiktok:{
        available:community?.tiktok?.available === true,
        followers:Number.isFinite(Number(community?.tiktok?.followers)) ? finiteInt(community.tiktok.followers) : null,
        stale:community?.tiktok?.stale === true,
        source:text(community?.tiktok?.source, 64, ""),
        updated_at:isoOrNull(community?.tiktok?.updated_at),
        url:text(community?.tiktok?.url, 1000, "")
      },
      discord:{
        available:community?.discord?.available === true,
        members:Number.isFinite(Number(community?.discord?.members)) ? finiteInt(community.discord.members) : null,
        online:Number.isFinite(Number(community?.discord?.online)) ? finiteInt(community.discord.online) : null,
        stale:community?.discord?.stale === true,
        updated_at:isoOrNull(community?.discord?.updated_at),
        url:text(community?.discord?.url, 1000, "")
      }
    }
  };
}

function buildCreatorTechnicalState({
  database = {},
  website = {},
  tiktok = {},
  launcher = {},
  live = {},
  game = {},
  playstation = {},
  discord = {},
  security = {},
  suite = {},
  release = {},
  generatedAt = new Date().toISOString()
} = {}) {
  const components = {
    website:{
      ...serviceState({ status:website.status || (website.ok ? "online" : "error"), detail:website.detail }),
      status:text(website.status, 32, website.ok ? "online" : "unknown")
    },
    database:{
      ...serviceState({ status:database.ok ? "online" : "error", detail:database.detail }),
      latency_ms:Number.isFinite(Number(database.latency_ms)) ? Math.max(0, Math.round(Number(database.latency_ms))) : null
    },
    tiktok:{
      ...serviceState({ connected:tiktok.connected === true, configured:tiktok.configured, stale:tiktok.stale, detail:tiktok.detail }),
      connected:tiktok.connected === true,
      stats_scope:tiktok.stats_scope === true,
      display_name:text(tiktok.display_name, 120, ""),
      followers:Number.isFinite(Number(tiktok.followers)) ? finiteInt(tiktok.followers) : null,
      updated_at:isoOrNull(tiktok.updated_at)
    },
    launcher:{
      ...serviceState({
        status:launcher.connection_state === "degraded" ? "stale" : launcher.connection_state,
        online:launcher.online === true,
        configured:launcher.configured === true,
        stale:launcher.connection_state === "degraded",
        detail:launcher.detail
      }),
      configured:launcher.configured === true,
      online:launcher.online === true,
      reachable:launcher.reachable === true,
      connection_state:text(launcher.connection_state, 32, launcher.online ? "online" : "offline"),
      client_version:text(launcher.client_version, 80, ""),
      machine_name:text(launcher.machine_name, 120, ""),
      protocol:finiteInt(launcher.protocol, 1),
      heartbeat_age_seconds:Number.isFinite(Number(launcher.heartbeat_age_seconds)) ? finiteInt(launcher.heartbeat_age_seconds) : null,
      heartbeat_after_ms:Number.isFinite(Number(launcher.heartbeat_after_ms)) ? finiteInt(launcher.heartbeat_after_ms) : null,
      heartbeat_grace_ms:Number.isFinite(Number(launcher.heartbeat_grace_ms)) ? finiteInt(launcher.heartbeat_grace_ms) : null,
      last_seen_at:isoOrNull(launcher.last_seen_at)
    },
    live:{
      ...serviceState({ status:live.status, detail:live.detail }),
      active:live.active === true,
      status:text(live.status, 32, "unknown"),
      source:text(live.source, 64, "none"),
      viewers:finiteInt(live.viewers),
      last_event_at:isoOrNull(live.last_event_at)
    },
    game:{
      ...serviceState({ status:game.active ? "active" : (game.available ? "ready" : "unknown"), detail:game.detail }),
      active:game.active === true,
      name:text(game.name, 160, ""),
      platform:text(game.platform, 40, "unknown"),
      source:text(game.source, 64, ""),
      updated_at:isoOrNull(game.updated_at)
    },
    playstation:{
      ...serviceState({ available:playstation.available === true, configured:playstation.configured, stale:playstation.stale, detail:playstation.detail }),
      configured:playstation.configured === true,
      available:playstation.available === true,
      recent_count:finiteInt(playstation.recent_count),
      updated_at:isoOrNull(playstation.updated_at)
    },
    discord:{
      ...serviceState({ available:discord.available === true, stale:discord.stale, detail:discord.detail }),
      available:discord.available === true,
      members:Number.isFinite(Number(discord.members)) ? finiteInt(discord.members) : null,
      online:Number.isFinite(Number(discord.online)) ? finiteInt(discord.online) : null,
      updated_at:isoOrNull(discord.updated_at)
    }
  };

  if (security && typeof security === "object" && Object.keys(security).length) {
    components.security = {
      ...serviceState({ status:security.ready === true ? "ready" : (security.blocked === true ? "error" : "waiting"), detail:security.detail }),
      ready:security.ready === true,
      blocked:security.blocked === true,
      passed:finiteInt(security.passed),
      total:finiteInt(security.total),
      warnings:finiteInt(security.warnings),
      launcher_signed_requests:security.launcher_signed_requests === true,
      launcher_replay_guard:security.launcher_replay_guard === true,
      widget_conflict_guard:security.widget_conflict_guard !== false
    };
  }


  if (suite && typeof suite === "object" && Object.keys(suite).length) {
    components.suite = {
      ...serviceState({ status:suite.ready === true ? "ready" : "waiting", detail:suite.detail || (suite.ready ? "Creator-Suite-Kern ist bereit." : "Creator-Suite-Kern benötigt Aufmerksamkeit.") }),
      ready:suite.ready === true,
      passed:finiteInt(suite.passed),
      total:finiteInt(suite.total),
      blocking:finiteInt(suite.blocking),
      stream_studio_protocol:finiteInt(suite?.policy?.stream_studio_protocol),
      credentials:text(suite?.policy?.stream_credentials, 64, "")
    };
  }

  if (release && typeof release === "object" && Object.keys(release).length) {
    components.release = {
      ...serviceState({ status:release.local_ready === true ? "ready" : "error", detail:release.detail }),
      local_ready:release.local_ready === true,
      production_ready:release.production_ready === true,
      passed:finiteInt(release.passed),
      total:finiteInt(release.total),
      blocking_internal:finiteInt(release.blocking_internal),
      external_acceptance:text(release.external_acceptance, 32, "open"),
      external_open:Array.isArray(release.external_gates) ? release.external_gates.filter(row => row?.status !== "closed").length : 0
    };
  }

  const states = Object.values(components).map(component => component.state);
  const overall = states.includes("offline") ? "attention" : states.includes("stale") || states.includes("waiting") || states.includes("unknown") ? "partial" : "ready";

  return {
    ok:overall !== "attention",
    schema:1,
    overall,
    generated_at:isoOrNull(generatedAt) || new Date().toISOString(),
    components
  };
}

module.exports = {
  buildPublicCreatorState,
  buildCreatorTechnicalState
};
