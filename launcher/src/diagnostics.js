const os = require("node:os");

function buildDiagnostics({
  appVersion,
  settings,
  bridge,
  provider,
  update,
  spool,
  preflight,
  releaseGate,
  monitor,
  cloudHealth,
  creatorReady,
  encryptionAvailable,
  logger
}) {
  return {
    generated_at: new Date().toISOString(),
    app: {
      product: "cfs_zockt Creator Suite",
      version: appVersion,
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
      electron: process.versions.electron || "",
      chrome: process.versions.chrome || "",
      packaged: Boolean(process.defaultApp === undefined)
    },
    system: {
      type: os.type(),
      release: os.release(),
      version: os.version?.() || "",
      hostname: os.hostname(),
      cpus: os.cpus()?.length || 0,
      memory_total_mb: Math.round(os.totalmem() / 1024 / 1024),
      memory_free_mb: Math.round(os.freemem() / 1024 / 1024)
    },
    security: {
      os_encryption_available: Boolean(encryptionAvailable),
      bridge_token_stored: Boolean(settings?.tokenStored),
      provider_key_stored: Boolean(settings?.tiktoolKeyStored)
    },
    settings: {
      backendUrl: settings?.backendUrl || "",
      machineName: settings?.machineName || "",
      provider: settings?.provider || "",
      tiktokUsername: settings?.tiktokUsername || "",
      autoStart: Boolean(settings?.autoStart),
      startMinimized: Boolean(settings?.startMinimized),
      ttsEnabled: settings?.ttsEnabled !== false,
      ttsVoiceName: settings?.ttsVoiceName || "",
      autoUpdate: settings?.autoUpdate !== false,
      updateChannel: settings?.updateChannel || "stable"
    },
    bridge: bridge || {},
    provider: provider || {},
    update: update || {},
    spool: spool || {},
    preflight: preflight || {},
    release_gate: releaseGate || {},
    event_monitor: monitor || {},
    cloud_health: cloudHealth || {},
    creator_ready: creatorReady || {},
    recent_log: logger?.tail?.(30000) || ""
  };
}

module.exports = { buildDiagnostics };
