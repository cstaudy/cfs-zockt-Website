"use strict";

const net = require("net");

const TLS_MODES = new Set(["require", "verify-ca", "verify-full"]);

function clean(value) {
  return String(value ?? "").trim();
}

function parseDatabaseUrl(value) {
  const raw = clean(value);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL ist keine gültige PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL muss postgres:// oder postgresql:// verwenden.");
  }
  if (!url.hostname) throw new Error("DATABASE_URL enthält keinen Datenbank-Host.");
  return url;
}

function isPrivateIpv4(host) {
  const parts = String(host || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function isPrivateDatabaseHost(hostname) {
  const host = clean(hostname).toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  if (host === "localhost" || host === "::1" || isPrivateIpv4(host)) return true;
  if (host.endsWith(".internal") || host.endsWith(".local")) return true;
  if (net.isIP(host) === 6) return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  // Render's private Postgres host is commonly a single-label service hostname.
  if (!host.includes(".")) return true;
  return false;
}

function databaseRuntimeSecurity({databaseUrl, nodeEnv="production"}={}) {
  const url = parseDatabaseUrl(databaseUrl);
  const hostname = url.hostname.toLowerCase();
  const sslmode = clean(url.searchParams.get("sslmode")).toLowerCase();
  const privateHost = isPrivateDatabaseHost(hostname);
  const renderExternal = /(?:^|\.)render\.com$/i.test(hostname);
  const tlsRequested = TLS_MODES.has(sslmode) || renderExternal;
  const explicitlyDisabled = sslmode === "disable";

  if (sslmode && !new Set(["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]).has(sslmode)) {
    throw new Error("DATABASE_URL enthält einen unbekannten sslmode.");
  }

  if (String(nodeEnv) === "production") {
    if (!privateHost && explicitlyDisabled) {
      throw new Error("Externe PostgreSQL-Verbindungen dürfen sslmode=disable nicht verwenden.");
    }
    if (!privateHost && !tlsRequested && !["allow", "prefer"].includes(sslmode)) {
      throw new Error("Externe PostgreSQL-Verbindungen benötigen TLS (mindestens sslmode=require).");
    }
    if (!privateHost && ["allow", "prefer"].includes(sslmode)) {
      throw new Error("Externe PostgreSQL-Verbindungen müssen TLS erzwingen; sslmode=allow/prefer reicht nicht aus.");
    }
  }

  // Render external URLs require encrypted transport. Without an explicit sslmode,
  // keep compatibility with Render's managed/self-signed chain while still forcing TLS.
  // If verify-ca/verify-full is explicitly configured, pg handles strict verification
  // from the connection string and this compatibility override is intentionally omitted.
  const forceRenderTls = renderExternal && !sslmode;

  return Object.freeze({
    hostname,
    privateHost,
    renderExternal,
    sslmode: sslmode || "",
    transport: privateHost && !tlsRequested ? "private" : (sslmode === "verify-full" || sslmode === "verify-ca") ? "tls-verified" : "tls-required",
    poolOptions: Object.freeze({
      max: 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 60_000,
      lock_timeout: 10_000,
      idle_in_transaction_session_timeout: 30_000,
      query_timeout: 65_000,
      ...(forceRenderTls ? {ssl:{rejectUnauthorized:false}} : {})
    })
  });
}

function productionDatabaseUrl(value) {
  try {
    databaseRuntimeSecurity({databaseUrl:value,nodeEnv:"production"});
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  parseDatabaseUrl,
  isPrivateDatabaseHost,
  databaseRuntimeSecurity,
  productionDatabaseUrl
};
