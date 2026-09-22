"use strict";

function parseUrl(value, label) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 1000) throw new Error(`${label} fehlt oder ist zu lang.`);
  try { return new URL(raw); }
  catch { throw new Error(`${label} ist keine gültige URL.`); }
}

function canonicalAppOrigin(value, nodeEnv = "production") {
  const url = parseUrl(value, "APP_BASE_URL");
  const production = String(nodeEnv || "production") === "production";
  if (!['https:','http:'].includes(url.protocol)) throw new Error("APP_BASE_URL muss HTTP(S) verwenden.");
  if (production && url.protocol !== "https:") throw new Error("APP_BASE_URL muss in Produktion HTTPS verwenden.");
  if (url.username || url.password) throw new Error("APP_BASE_URL darf keine Zugangsdaten enthalten.");
  if (url.search || url.hash) throw new Error("APP_BASE_URL darf keine Query-Parameter oder Fragmente enthalten.");
  if (url.pathname !== "/") throw new Error("APP_BASE_URL muss eine reine Origin ohne Pfad sein.");
  if (production && url.port && url.port !== "443") throw new Error("APP_BASE_URL darf in Produktion keinen benutzerdefinierten Port verwenden.");
  return Object.freeze({ url, origin:url.origin, hostname:url.hostname.toLowerCase() });
}

function validHostname(value) {
  const host=String(value||"").trim().toLowerCase().replace(/\.$/,"");
  if (!host || host.length>253 || host.includes(":")) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/i.test(host);
}

function parseAllowedHosts(value) {
  const items=String(value||"").split(",").map(item=>item.trim().toLowerCase().replace(/\.$/,"")).filter(Boolean);
  const unique=[];
  for (const host of items) {
    if (!validHostname(host)) throw new Error("CFS_ALLOWED_HOSTS darf nur kommaseparierte Hostnamen ohne Protokoll, Port oder Pfad enthalten.");
    if (!unique.includes(host)) unique.push(host);
  }
  return Object.freeze(unique);
}

function tiktokRedirectUri(value, canonicalOrigin, nodeEnv = "production") {
  const url=parseUrl(value,"TIKTOK_REDIRECT_URI");
  const production=String(nodeEnv||"production")==="production";
  const loopback=["localhost","127.0.0.1","::1"].includes(url.hostname.toLowerCase());
  if (url.protocol !== "https:" && !(String(nodeEnv)==="development" && url.protocol==="http:" && loopback)) {
    throw new Error("TIKTOK_REDIRECT_URI muss HTTPS verwenden (HTTP nur für localhost in Development).");
  }
  if (url.username || url.password || url.search || url.hash) throw new Error("TIKTOK_REDIRECT_URI darf keine Zugangsdaten, Query-Parameter oder Fragmente enthalten.");
  if (url.pathname !== "/auth/tiktok/callback") throw new Error("TIKTOK_REDIRECT_URI muss exakt auf /auth/tiktok/callback zeigen.");
  if (production && url.origin !== canonicalOrigin) throw new Error("TIKTOK_REDIRECT_URI muss in Produktion dieselbe Origin wie APP_BASE_URL verwenden.");
  return url.href;
}

module.exports={canonicalAppOrigin,validHostname,parseAllowedHosts,tiktokRedirectUri};
