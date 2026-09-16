function check(key, ok, label, detail = "", blocking = true) {
  return { key, ok: Boolean(ok), label, detail: String(detail || ""), blocking: Boolean(blocking) };
}

function runPreflight({
  settings = {},
  bridge = {},
  provider = {},
  encryptionAvailable = false,
  spool = {},
  releasePolicy = null,
  creatorFeatures = null
} = {}) {
  const checks = [];

  checks.push(check(
    "encryption",
    encryptionAvailable,
    "Lokale Verschlüsselung",
    encryptionAvailable ? "Bridge- und Provider-Schlüssel können sicher gespeichert werden." : "OS-Verschlüsselung ist nicht verfügbar."
  ));

  let backendOk = false;
  try {
    const url = new URL(String(settings.backendUrl || ""));
    backendOk = url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {}
  checks.push(check(
    "backend_url",
    backendOk,
    "Backend URL",
    backendOk ? settings.backendUrl : "HTTPS-Backend URL fehlt oder ist ungültig."
  ));

  checks.push(check(
    "bridge_key",
    settings.tokenStored,
    "Bridge-Schlüssel",
    settings.tokenStored ? "Sicher gespeichert." : "Noch kein Bridge-Key gespeichert."
  ));

  checks.push(check(
    "bridge_online",
    bridge.connected,
    "Creator Cloud",
    bridge.connected ? `Verbunden${bridge.latencyMs ? ` · ${bridge.latencyMs} ms` : ""}` : (bridge.lastError || "Bridge ist offline.")
  ));

  if (creatorFeatures && typeof creatorFeatures === "object") {
    checks.push(check(
      "creator_live_access",
      creatorFeatures.live_bridge === true,
      "Creator LIVE Zugriff",
      creatorFeatures.live_bridge === true
        ? "Dein Creator-Zugriff erlaubt TikTok LIVE Funktionen."
        : "LIVE-Werkzeuge benötigen mindestens CREATOR oder eine aktive Beta-Freigabe."
    ));
  }

  if ((settings.provider || "mock") === "tiktool") {
    checks.push(check(
      "provider_username",
      Boolean(String(settings.tiktokUsername || "").trim()),
      "TikTok Username",
      settings.tiktokUsername ? `@${settings.tiktokUsername}` : "TikTok Username fehlt."
    ));
    checks.push(check(
      "provider_key",
      settings.tiktoolKeyStored,
      "LIVE Provider Key",
      settings.tiktoolKeyStored ? "Sicher gespeichert." : "TikTool API-Key fehlt."
    ));
  } else {
    checks.push(check(
      "simulator",
      true,
      "LIVE Simulator",
      "Simulator ist für End-to-End-Tests bereit."
    ));
  }

  if (releasePolicy && typeof releasePolicy === "object") {
    const maintenance = releasePolicy.safety?.maintenance?.active === true;
    const blocked = releasePolicy.version_blocked === true;
    const required = releasePolicy.update_required === true;
    const liveAllowed = releasePolicy.live_allowed !== false;

    let detail = "Creator Cloud Release-Policy erlaubt LIVE.";
    if (maintenance) detail = releasePolicy.safety?.maintenance?.message || "Creator Suite Wartungsmodus ist aktiv.";
    else if (blocked) detail = releasePolicy.message || "Diese Launcher-Version wurde gesperrt.";
    else if (required) detail = releasePolicy.message || "Launcher-Update ist erforderlich.";
    else if (releasePolicy.rollback_recommended) detail = `Rollback auf ${releasePolicy.recommended_version || "freigegebene Version"} empfohlen.`;
    else if (releasePolicy.status === "rollout_pending") detail = releasePolicy.message || "Gestaffelter Rollout aktiv.";

    checks.push(check(
      "release_policy",
      liveAllowed && !maintenance && !blocked && !required,
      "Launcher Release Policy",
      detail,
      true
    ));
  }

  checks.push(check(
    "spool",
    spool.persistent === true,
    "Event Recovery",
    spool.persistent
      ? `${Number(spool.pending || 0)} Events warten persistent auf Übertragung.`
      : "Persistente Event-Queue ist nicht verfügbar."
  ));

  if (Number(spool.dropped || 0) > 0) {
    checks.push(check(
      "spool_dropped",
      false,
      "Event Queue Überlauf",
      `${Number(spool.dropped || 0)} alte Events wurden wegen des Queue-Limits verworfen.`,
      false
    ));
  }

  const blockers = checks.filter(x => x.blocking && !x.ok);
  const warnings = checks.filter(x => !x.blocking && !x.ok);

  return {
    ok: blockers.length === 0,
    checks,
    blockers,
    warnings,
    generatedAt: new Date().toISOString()
  };
}

module.exports = { runPreflight };
