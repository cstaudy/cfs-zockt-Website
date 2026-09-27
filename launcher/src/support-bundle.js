const fs = require("node:fs");
const path = require("node:path");

function safeName(value) {
  return String(value || "support")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "support";
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function createSupportBundle({
  directory,
  appVersion,
  settings,
  diagnostics,
  fieldTest,
  releaseGate,
  interactiveGames,
  gameActivity,
  recordingHandoffs,
  logText
}) {
  if (!directory) throw new Error("Support-Zielordner fehlt.");
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const folder = path.join(directory, `cfs_creator_suite_support_${safeName(appVersion)}_${stamp}`);
  fs.mkdirSync(folder, { recursive:true });

  const sanitizedSettings = {
    backendUrl:settings?.backendUrl || "",
    machineName:settings?.machineName || "",
    provider:settings?.provider || "",
    tiktokUsername:settings?.tiktokUsername || "",
    tokenStored:Boolean(settings?.tokenStored),
    tiktoolKeyStored:Boolean(settings?.tiktoolKeyStored),
    autoStart:Boolean(settings?.autoStart),
    startMinimized:Boolean(settings?.startMinimized),
    autoUpdate:settings?.autoUpdate !== false,
    autoRecoverLive:settings?.autoRecoverLive !== false,
    updateChannel:settings?.updateChannel || "stable",
    setupVersion:Number(settings?.setupVersion || 0),
    setupCompletedAt:settings?.setupCompletedAt || ""
  };

  writeJson(path.join(folder,"diagnostics.json"), diagnostics || {});
  writeJson(path.join(folder,"field-test.json"), fieldTest || {});
  writeJson(path.join(folder,"settings-sanitized.json"), sanitizedSettings);
  writeJson(path.join(folder,"release-gate.json"), releaseGate || {});
  const game = interactiveGames && typeof interactiveGames === "object" ? interactiveGames : {};
  writeJson(path.join(folder,"interactive-games.json"), {
    available:game.available===true,
    running:game.running===true,
    ready:game.ready===true,
    managed:game.managed===true,
    activeGame:String(game.activeGame||"").slice(0,64),
    activeManifest:game.activeManifest&&typeof game.activeManifest==="object"?{id:String(game.activeManifest.id||"").slice(0,64),name:String(game.activeManifest.name||"").slice(0,80),version:String(game.activeManifest.version||"").slice(0,32),category:String(game.activeManifest.category||"").slice(0,48)}:null,
    catalogHash:/^[a-f0-9]{64}$/.test(String(game.catalogHash||""))?String(game.catalogHash):"",
    modules:Array.isArray(game.modules)?game.modules.slice(0,32).map(item=>({id:String(item?.id||"").slice(0,64),name:String(item?.name||"").slice(0,80),version:String(item?.version||"").slice(0,32),category:String(item?.category||"").slice(0,48),events:Array.isArray(item?.events)?item.events.map(v=>String(v).slice(0,24)).slice(0,8):[]})):[],
    lastCatalogAt:game.lastCatalogAt||null,
    lastError:String(game.lastError||"").slice(0,300),
    forwarded:Number(game.forwarded||0),
    failed:Number(game.failed||0),
    secretsIncluded:false,
    rawMediaIncluded:false
  });

  const activity = gameActivity && typeof gameActivity === "object" ? gameActivity : {};
  const active = activity.active && typeof activity.active === "object" ? activity.active : null;
  writeJson(path.join(folder,"game-activity.json"), {
    enabled:activity.enabled===true,
    source:String(activity.source||"").slice(0,32),
    platform:String(activity.platform||"").slice(0,32),
    active:active?{
      game_name:String(active.game_name||"").slice(0,120),
      source:String(active.source||"").slice(0,32),
      platform:String(active.platform||"").slice(0,32),
      started_at:active.started_at||null,
      last_seen_at:active.last_seen_at||null,
      resumed_after_restart:active.resumed_after_restart===true
    }:null,
    queued_segments:Array.isArray(activity.pending)?activity.pending.length:Number(activity.queued||0),
    sync_waiting:activity.sync_waiting===true,
    next_retry_at:activity.next_retry_at||null,
    secretsIncluded:false,
    localPathsIncluded:false
  });

  const handoffs = recordingHandoffs && typeof recordingHandoffs === "object" ? recordingHandoffs : {};
  writeJson(path.join(folder,"recording-handoffs.json"), {
    schema:Number(handoffs.schema||0),
    pending:Number(handoffs.pending||0),
    ready:Number(handoffs.ready||0),
    items:(Array.isArray(handoffs.items)?handoffs.items:[]).slice(0,30).map(item=>({
      id:String(item?.id||"").slice(0,120),
      status:String(item?.status||"").slice(0,24),
      duration_ms:Math.max(0,Number(item?.durationMs||0)),
      profile:String(item?.profile||"").slice(0,40),
      format:String(item?.format||"").slice(0,12),
      scene_name:String(item?.sceneName||"").slice(0,120),
      project_id:String(item?.projectId||"").slice(0,120),
      game_context:item?.gameContext&&typeof item.gameContext==="object"?{
        mode:String(item.gameContext.mode||"none").slice(0,16),
        game_name:String(item.gameContext.game_name||"").slice(0,120),
        platform:String(item.gameContext.platform||"unknown").slice(0,32),
        source:String(item.gameContext.source||"").slice(0,32),
        context_id:/^cfsgc_[a-f0-9]{32}$/.test(String(item.gameContext.context_id||""))?String(item.gameContext.context_id):"",
        captured_at:item.gameContext.captured_at||null
      }:null
    })),
    rawMediaIncluded:false,
    localPathsIncluded:false
  });

  fs.writeFileSync(path.join(folder,"recent-launcher.log"), String(logText || ""), "utf8");
  fs.writeFileSync(path.join(folder,"README.txt"),
`cfs_zockt Creator Suite Support Bundle
Version: ${appVersion}
Generated: ${new Date().toISOString()}

Dieses Paket enthält keine Bridge- oder Provider-Schlüssel.
Game-Aktivität und Recording-Handoffs werden ohne lokale Medienpfade exportiert.
Nutzernamen in Field-Test-Daten werden pseudonymisiert.
`, "utf8");

  return {
    ok:true,
    folder,
    files:[
      "diagnostics.json",
      "field-test.json",
      "settings-sanitized.json",
      "release-gate.json",
      "interactive-games.json",
      "game-activity.json",
      "recording-handoffs.json",
      "recent-launcher.log",
      "README.txt"
    ]
  };
}

module.exports = { createSupportBundle };
