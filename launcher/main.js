const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const {
  app, BrowserWindow, ipcMain, safeStorage, Tray, Menu, shell, nativeImage, dialog, screen
} = require("electron");
const { ConfigStore } = require("./src/config-store");
const { Logger } = require("./src/logger");
const { BridgeClient } = require("./src/bridge-client");
const { ProviderManager } = require("./src/provider-manager");
const { UpdateManager } = require("./src/update-manager");
const { buildDiagnostics } = require("./src/diagnostics");
const { EventSpool } = require("./src/event-spool");
const { runPreflight } = require("./src/preflight");
const { EventMonitor } = require("./src/event-monitor");
const { runObsDoctor } = require("./src/obs-doctor");
const { createSupportBundle } = require("./src/support-bundle");
const { createBackup, parseBackup } = require("./src/config-backup");
const { RecoveryManager } = require("./src/recovery-manager");
const { LiveSessionStore } = require("./src/live-session-store");
const { DeviceLinkClient } = require("./src/device-link-client");
const { OutputWindowManager, BACKGROUND_MODES } = require("./src/output-window-manager");
const { OutputGateStore } = require("./src/output-gate-store");
const { StreamDeckStore } = require("./src/stream-deck-store");
const { executeStreamDeckAction } = require("./src/stream-deck-actions");
const { assertFeature, assertStreamDeckButton } = require("./src/entitlement-guard");
const { BetaSessionStore } = require("./src/beta-session-store");
const { MediaSourceStore } = require("./src/media-source-store");
const { CutMediaEngine } = require("./src/cut-media-engine");
const { StreamEngine } = require("./src/stream-engine");
const { StreamCredentialStore } = require("./src/stream-credential-store");
const { providerInfo: streamProviderInfo, providerCatalogPublic } = require("./src/stream-provider-catalog");
const { checkCloudHealth, creatorReady } = require("./src/cloud-health");
const { planSettingsTransition, assertLiveSafeSecretChange } = require("./src/runtime-stability");
const pkg = require("./package.json");

let mainWindow = null;
let tray = null;
let quitting = false;
let configStore = null;
let logger = null;
let bridge = null;
let providers = null;
let updates = null;
let eventSpool = null;
let eventMonitor = null;
let recoveringLive = false;
let shutdownInProgress = false;
let recoveryManager = null;
let liveSessionStore = null;
let lastRecoveryAttemptAt = 0;
let userDataPath = "";
let settingsPath = "";
let spoolPath = "";
let cloudHealth = {ok:false,online:false,database:false,status:"unknown",modules:{},latencyMs:0,checkedAt:null,error:"Noch nicht geprüft."};
let cloudHealthTimer = null;
let deviceLinkClient = null;
let deviceLinkPollTimer = null;
let deviceLinkPolling = false;
let creatorLibrary = {widgets:[],scenes:[],game:null,gameRules:[],gameRuleHits:[],cutProjects:[],cutJobs:[],creator:null,loadedAt:null,error:""};
let outputManager = null;
let outputGateStore = null;
let outputGatePath = "";
let streamDeckStore = null;
let betaSessionStore = null;
let mediaSourceStore = null;
let cutMediaEngine = null;
let streamEngine = null;
let streamCredentialStore = null;
let streamStudioCloud = {config:null,program_scene:null,overlays:[],multistream:{max_destinations:1},engine:{},loadedAt:null,error:""};
let betaCloud = {beta:{status:"none",active:false},active_session:null,recent_feedback:[],loadedAt:null,error:""};




function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function creatorFeatures(){
  return bridge?.snapshot?.().creator?.features || creatorLibrary?.creator?.features || {};
}

function currentPreflight() {
  return runPreflight({
    settings: configStore?.publicSettings?.() || {},
    bridge: bridge?.snapshot?.() || {},
    provider: providers?.info?.() || {},
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    spool: eventSpool?.snapshot?.() || {},
    releasePolicy: bridge?.snapshot?.().releasePolicy || null,
    creatorFeatures: creatorFeatures()
  });
}

function appState(extra = {}) {
  const settings = configStore?.publicSettings?.() || {};
  return {
    appVersion: pkg.version,
    platform: process.platform,
    settings,
    bridge: bridge?.snapshot?.() || { connected: false, liveActive: false, queuedEvents: 0 },
    provider: providers?.info?.() || { key: settings.provider || "mock", ready: false },
    update: updates?.snapshot?.() || { status: "idle", currentVersion: pkg.version, packaged: app.isPackaged },
    spool: eventSpool?.snapshot?.() || { persistent:false, pending:0, dropped:0 },
    preflight: currentPreflight(),
    monitor: eventMonitor?.snapshot?.() || {counts:{},coverage:{},recent:[]},
    firstRun: Number(settings.setupVersion || 0) < 1,
    cloudHealth,
    creatorReady: creatorReady({
      settings,
      health:cloudHealth,
      preflight:currentPreflight(),
      bridge:bridge?.snapshot?.() || {},
      spool:eventSpool?.snapshot?.() || {},
      encryptionAvailable:safeStorage.isEncryptionAvailable()
    }),
    recoveryPoints: recoveryManager?.list?.() || [],
    sessionRecovery: liveSessionStore?.snapshot?.() || {active:false,sessionId:null,lastError:""},
    creatorLibrary,
    localOutput: outputManager?.snapshot?.() || {running:false,ready:false,scene:null,lastError:""},
    outputGate: outputGateStore?.snapshot?.() || null,
    outputDisplays: outputManager?.displays?.() || [],
    outputBackgroundModes: Object.values(BACKGROUND_MODES),
    streamDeck: streamDeckStore?.snapshot?.() || null,
    betaCenter:{cloud:betaCloud,localSession:betaSessionStore?.snapshot?.() || {active:false,sessionId:null,lastError:""}},
    mediaEngine:cutMediaEngine?.snapshot?.() || {status:"idle",available:false,ffmpegPath:"",ffmpegSource:"",version:"",capabilities:{drawtext:false,concat:true,xfade:false,acrossfade:false,loudnorm:false,zoompan:false,rotate:false,blend:false,amix:false,sidechaincompress:false,encoders:{software:true,nvenc:false,qsv:false,amf:false}},jobId:null,progress:0,phase:"idle",mode:"clips",encoder:"software",transition:"cut",error:""},
    mediaSources:mediaSourceStore?.snapshot?.() || {schema:4,sources:{},music:{},voice:{},musicTracks:{},voiceTracks:{},sfx:{}},
    streamEngine:streamEngine?.snapshot?.() || {status:"idle",available:false,desiredRunning:false,capabilities:{gdigrab:false,dshow:false,encoders:{software:true,nvenc:false,amd:false,qsv:false}},destinations:{},recording:null,error:""},
    streamStudio:{...streamStudioCloud,credentials:streamCredentialStore?.snapshot?.((streamStudioCloud?.config?.multistream?.destinations||[]).map(item=>item.id)) || {encryptionAvailable:safeStorage.isEncryptionAvailable(),targets:{}}},
    streamProviders:providerCatalogPublic(),
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    ...extra
  };
}

async function refreshCloudHealth({notify=true} = {}) {
  const settings=configStore?.publicSettings?.() || {};
  cloudHealth=await checkCloudHealth(settings.backendUrl || "https://cfs-zockt.de");
  if(notify) send("launcher:state",appState());
  refreshTray();
  return cloudHealth;
}

function startCloudHealthLoop() {
  clearInterval(cloudHealthTimer);
  setTimeout(()=>refreshCloudHealth().catch(()=>{}),1800);
  cloudHealthTimer=setInterval(()=>refreshCloudHealth().catch(()=>{}),60000);
  cloudHealthTimer.unref?.();
}

function refreshTray() {
  if (!tray) return;
  const state = bridge?.snapshot?.() || {};
  const live = Boolean(state.liveActive);
  const online = Boolean(state.connected);
  tray.setToolTip(`cfs_zockt Creator Suite · ${live ? "LIVE" : online ? "Bridge online" : "offline"}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Creator Suite öffnen", click: showWindow },
    { type: "separator" },
    { label: "LIVE starten", enabled: online && !live, click: () => startLive().catch(() => {}) },
    { label: "LIVE beenden", enabled: live, click: () => endLive().catch(() => {}) },
    { type: "separator" },
    { label: "Beenden", click: () => { quitting = true; app.quit(); } }
  ]));
}

function showWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: "#020711",
    show: false,
    title: "cfs_zockt Creator Suite",
    icon: path.join(__dirname, "build", process.platform === "win32" ? "icon.ico" : "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) event.preventDefault();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logger?.error("Renderer process gone", JSON.stringify(details || {}));
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
    }, 1200);
  });

  mainWindow.once("ready-to-show", () => {
    const settings = configStore.publicSettings();
    if (!settings.startMinimized) mainWindow.show();
  });
  mainWindow.on("close", event => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "build", process.platform === "win32" ? "icon.ico" : "icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.on("double-click", showWindow);
  refreshTray();
}

function safeCreatorToolUrl(pagePath){
  const settings=configStore.publicSettings();
  let base;
  try{base=new URL(settings.backendUrl||"https://cfs-zockt.de")}catch{throw new Error("Creator Cloud URL ist ungültig.");}
  if(!["https:","http:"].includes(base.protocol))throw new Error("Creator Cloud URL ist nicht erlaubt.");
  return new URL(String(pagePath||"/"),base.origin).toString();
}

async function startCreatorSceneById(sceneId){
  if(!creatorLibrary.loadedAt)await refreshCreatorLibrary({notify:false});
  const scene=findCreatorScene(sceneId);
  if(!scene)throw new Error("Scene ist nicht in deinem Creator Account verfügbar.");
  const current=outputManager?.snapshot?.()||{};
  await startLocalOutput({
    sceneId:scene.id,
    displayId:current.displayId||null,
    backgroundMode:current.backgroundMode||"transparent",
    alwaysOnTop:Boolean(current.alwaysOnTop)
  });
  return scene;
}

async function startNextCreatorScene(){
  if(!creatorLibrary.loadedAt)await refreshCreatorLibrary({notify:false});
  const scenes=Array.isArray(creatorLibrary.scenes)?creatorLibrary.scenes:[];
  if(!scenes.length)throw new Error("Noch keine veröffentlichte Scene vorhanden.");
  const activeId=String(outputManager?.snapshot?.().scene?.id||"");
  const index=scenes.findIndex(scene=>String(scene.id)===activeId);
  const next=scenes[(index+1+scenes.length)%scenes.length];
  return startCreatorSceneById(next.id);
}

async function toggleAutoThanksFromDeck(){
  assertFeature(creatorFeatures(),"auto_thanks","AutoThanks");
  const settings=configStore.publicSettings();
  const next=configStore.save({ttsEnabled:settings.ttsEnabled===false});
  return next.ttsEnabled!==false;
}

async function openCreatorTool(pagePath){
  await shell.openExternal(safeCreatorToolUrl(pagePath));
  return true;
}

async function refreshGameRuntime({notify=true}={}){
  assertFeature(creatorFeatures(),"games","Creator Games");
  const data=await bridge.gameRuntime();
  creatorLibrary={...creatorLibrary,game:data?.runtime||null,loadedAt:creatorLibrary.loadedAt||new Date().toISOString()};
  if(notify)send("launcher:state",appState());
  return creatorLibrary.game;
}

async function gameControl(action,input={}){
  assertFeature(creatorFeatures(),"games","Creator Games");
  let data;
  if(action==="start")data=await bridge.gameStart();
  else if(action==="stop")data=await bridge.gameStop();
  else if(action==="reset")data=await bridge.gameReset();
  else if(action==="score")data=await bridge.gameScore(input.team,input.delta);
  else data=await bridge.gameRuntime();
  creatorLibrary={...creatorLibrary,game:data?.runtime||creatorLibrary.game};
  const next=appState({gameAction:{action,runtime:creatorLibrary.game}});
  send("launcher:state",next);
  return next;
}

async function openCutProject(projectId){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  const id=String(projectId||"");
  if(!creatorLibrary.cutProjects?.some(project=>String(project.id)===id))throw new Error("Cut-Projekt ist nicht in deinem Creator Account verfügbar.");
  await shell.openExternal(safeCreatorToolUrl(`/pages/cut-studio.html?project=${encodeURIComponent(id)}`));
  return true;
}

function configureCutMediaEngine(){
  if(cutMediaEngine)return cutMediaEngine;
  const outputRoot=path.join(app.getPath("videos"),"CFS Creator Suite","Exports");
  cutMediaEngine=new CutMediaEngine({outputRoot,logger,env:process.env,platform:process.platform,resourcesPath:process.resourcesPath,execPath:process.execPath});
  cutMediaEngine.on("state",mediaEngine=>send("launcher:state",appState({mediaEngine})));
  return cutMediaEngine;
}

async function probeCutMediaEngine(){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  await configureCutMediaEngine().probe();
  return appState();
}

function configureStreamEngine(){
  if(streamEngine)return streamEngine;
  streamEngine=new StreamEngine({
    logger,
    env:process.env,
    platform:process.platform,
    resourcesPath:process.resourcesPath,
    videosPath:app.getPath("videos")
  });
  streamEngine.on("state",engineState=>send("launcher:state",appState({streamEngine:engineState})));
  return streamEngine;
}

async function syncStreamStudioConfig({notify=true}={}){
  if(!bridge?.snapshot?.().connected)throw new Error("Creator Bridge ist nicht verbunden.");
  try{
    const data=await bridge.fetchStreamStudioConfig();
    streamStudioCloud={
      config:data?.config||null,
      program_scene:data?.program_scene||null,
      overlays:Array.isArray(data?.overlays)?data.overlays:[],
      multistream:data?.multistream||{max_destinations:1},
      engine:data?.engine||{},
      loadedAt:new Date().toISOString(),
      error:""
    };
  }catch(error){
    streamStudioCloud={...streamStudioCloud,error:String(error?.message||error)};
    throw error;
  }finally{if(notify)send("launcher:state",appState())}
  return streamStudioCloud;
}

function streamDisplayRegion(displayId="") {
  const id=String(displayId||"").trim();
  if(!id)return null;
  const display=(screen?.getAllDisplays?.()||[]).find(item=>String(item.id)===id);
  if(!display)throw new Error("Der ausgewählte Monitor ist nicht mehr verfügbar. Bitte Geräte neu laden.");
  const bounds=display.bounds||{};
  const scale=Number(display.scaleFactor||1)||1;
  const fallbackPoint=point=>({x:Math.round(Number(point.x||0)*scale),y:Math.round(Number(point.y||0)*scale)});
  const toScreen=point=>{try{return typeof screen?.dipToScreenPoint==="function"?screen.dipToScreenPoint(point):fallbackPoint(point)}catch{return fallbackPoint(point)}};
  const start=toScreen({x:Number(bounds.x||0),y:Number(bounds.y||0)});
  const end=toScreen({x:Number(bounds.x||0)+Number(bounds.width||0),y:Number(bounds.y||0)+Number(bounds.height||0)});
  return {x:start.x,y:start.y,width:Math.max(64,Math.abs(end.x-start.x)),height:Math.max(64,Math.abs(end.y-start.y)),displayId:id};
}

function saveStreamLocalSettings(input={}){
  const settings=configStore.save({
    streamCaptureType:["screen","window","camera"].includes(input.captureType)?input.captureType:undefined,
    streamWindowTitle:String(input.windowTitle??configStore.publicSettings().streamWindowTitle??""),
    streamDisplayId:String(input.displayId??configStore.publicSettings().streamDisplayId??""),
    streamCropEnabled:typeof input.cropEnabled==="boolean"?input.cropEnabled:configStore.publicSettings().streamCropEnabled,
    streamCropX:Number(input.cropX??configStore.publicSettings().streamCropX??0),
    streamCropY:Number(input.cropY??configStore.publicSettings().streamCropY??0),
    streamCropWidth:Number(input.cropWidth??configStore.publicSettings().streamCropWidth??1920),
    streamCropHeight:Number(input.cropHeight??configStore.publicSettings().streamCropHeight??1080),
    streamVideoDevice:String(input.videoDevice??configStore.publicSettings().streamVideoDevice??""),
    streamAudioDevice:String(input.audioDevice??configStore.publicSettings().streamAudioDevice??""),
    streamAudioDevice2:String(input.audioDevice2??configStore.publicSettings().streamAudioDevice2??""),
    streamAudioVolume:Number(input.audioVolume??configStore.publicSettings().streamAudioVolume??1),
    streamAudioVolume2:Number(input.audioVolume2??configStore.publicSettings().streamAudioVolume2??1),
    streamAudioMute:typeof input.audioMute==="boolean"?input.audioMute:configStore.publicSettings().streamAudioMute,
    streamAudioMute2:typeof input.audioMute2==="boolean"?input.audioMute2:configStore.publicSettings().streamAudioMute2,
    streamAudioDelayMs:Number(input.audioDelayMs??configStore.publicSettings().streamAudioDelayMs??0),
    streamAudioDelayMs2:Number(input.audioDelayMs2??configStore.publicSettings().streamAudioDelayMs2??0),
    streamWatchdogEnabled:typeof input.watchdogEnabled==="boolean"?input.watchdogEnabled:configStore.publicSettings().streamWatchdogEnabled,
    streamWatchdogTimeoutSec:Number(input.watchdogTimeoutSec??configStore.publicSettings().streamWatchdogTimeoutSec??18),
    streamDrawMouse:typeof input.drawMouse==="boolean"?input.drawMouse:configStore.publicSettings().streamDrawMouse,
    streamRecordingEnabled:typeof input.recordingEnabled==="boolean"?input.recordingEnabled:configStore.publicSettings().streamRecordingEnabled
  });
  return appState({settings});
}

function saveStreamCredential(input={}){
  if(!streamCredentialStore)throw new Error("Lokaler Stream-Key-Speicher ist nicht bereit.");
  const result=streamCredentialStore.set(input.targetId,{serverUrl:input.serverUrl,streamKey:input.streamKey});
  logger?.info?.("Local streaming credentials updated",String(input.targetId||""));
  return appState({streamCredentialAction:{ok:true,target:result}});
}

function removeStreamCredential(targetId){
  if(!streamCredentialStore)throw new Error("Lokaler Stream-Key-Speicher ist nicht bereit.");
  const removed=streamCredentialStore.remove(targetId);
  logger?.info?.("Local streaming credentials removed",String(targetId||""));
  return appState({streamCredentialAction:{ok:true,removed,targetId:String(targetId||"")}});
}

async function streamCaptureDevices(){
  const engine=configureStreamEngine();
  const probe=await engine.probe();
  const devices=probe.available?await engine.listWindowsAudioDevices():[];
  return appState({streamCaptureDevices:{devices,displays:(screen?.getAllDisplays?.()||[]).map(display=>({id:String(display.id),label:display.label||`Display ${display.id}`,bounds:display.bounds,scaleFactor:display.scaleFactor}))}});
}

async function openStreamProviderDocs(provider){
  const info=streamProviderInfo(provider);
  const url=String(info?.docs||"");
  if(!/^https:\/\//i.test(url))throw new Error("Für diesen Anbieter ist noch keine offizielle Anleitung hinterlegt.");
  await shell.openExternal(url);
  return {ok:true,provider:info.key};
}

async function streamEnginePreflight(){
  const cloud=await syncStreamStudioConfig({notify:false});
  const engine=configureStreamEngine();
  let engineState=engine.snapshot();
  if(!engineState.checkedAt)engineState=await engine.probe();
  const config=cloud.config||{};
  const active=(config?.multistream?.destinations||[]).filter(target=>target?.enabled===true);
  const limit=Math.max(1,Number(cloud?.multistream?.max_destinations||1));
  const checks=[];
  const push=(key,ok,label,detail)=>checks.push({key,ok:Boolean(ok),label,detail:String(detail||"")});
  push("bridge",Boolean(bridge?.snapshot?.().connected),"Launcher Bridge",bridge?.snapshot?.().connected?"Mit CFS Cloud verbunden.":"Launcher zuerst mit deinem Creator-Account verbinden.");
  push("engine",Boolean(engineState.available),"Streaming Engine",engineState.available?(engineState.version||"FFmpeg bereit"):(engineState.error||"FFmpeg nicht bereit."));
  push("encryption",Boolean(streamCredentialStore?.encryptionAvailable?.()),"Lokaler Secret-Speicher",streamCredentialStore?.encryptionAvailable?.()?"Windows SafeStorage verfügbar.":"SafeStorage-Verschlüsselung ist erforderlich.");
  push("target_count",active.length>0||configStore.publicSettings().streamRecordingEnabled===true,"Streaming-Ziel / Aufnahme",active.length?`${active.length} Streaming-Ziel${active.length===1?"":"e"} aktiviert.`:(configStore.publicSettings().streamRecordingEnabled===true?"Nur lokale Aufnahme aktiviert.":"Kein Ziel aktiviert."));
  push("plan_limit",active.length<=limit,"Plan-Limit",`${active.length}/${limit} aktive Ziele.`);
  for(const target of active){
    const meta=streamCredentialStore?.publicEntry?.(target.id)||{configured:false};
    const provider=streamProviderInfo(target.provider);
    push(`credential_${target.id}`,Boolean(meta.configured),`${provider.label}: Zugangsdaten`,meta.configured?`Lokal verschlüsselt gespeichert · ${meta.server||provider.transport}`:`Fehlt · ${provider.keyHint}`);
  }
  const passed=checks.filter(item=>item.ok).length;
  const result={ok:passed===checks.length,passed,total:checks.length,checkedAt:new Date().toISOString(),checks,targets:active.map(target=>({id:target.id,label:target.label||streamProviderInfo(target.provider).label,provider:target.provider,support:streamProviderInfo(target.provider).support}))};
  return appState({streamPreflight:result});
}

async function startStreamDestination(targetId){
  const id=String(targetId||"").trim();
  if(!id)throw new Error("Streaming-Ziel fehlt.");
  const engine=configureStreamEngine();
  if(!engine.snapshot().desiredRunning)throw new Error("Starte zuerst die lokale Streaming Engine.");
  return appState({streamEngine:await engine.startTarget(id)});
}

async function stopStreamDestination(targetId){
  const id=String(targetId||"").trim();
  if(!id)throw new Error("Streaming-Ziel fehlt.");
  return appState({streamEngine:await configureStreamEngine().stopTarget(id)});
}

async function startStreamingEngine(){
  if(streamEngine?.snapshot?.().desiredRunning)throw new Error("Streaming Engine läuft bereits.");
  const cloud=await syncStreamStudioConfig({notify:false});
  const config=cloud.config||{};
  const settings=configStore.publicSettings();
  const active=(config?.multistream?.destinations||[]).filter(target=>target?.enabled===true);
  const limit=Math.max(1,Number(cloud?.multistream?.max_destinations||1));
  if(active.length>limit)throw new Error(`Dein Plan erlaubt maximal ${limit} gleichzeitige Streaming-Ziele.`);
  const credentials={};
  for(const target of active){
    const credential=streamCredentialStore?.get?.(target.id);
    if(!credential)throw new Error(`Lokale RTMP/RTMPS Zugangsdaten fehlen für ${target.label||target.provider||target.id}.`);
    credentials[target.id]=credential;
  }
  const output=config.output||{};
  const capture={
    type:settings.streamCaptureType||"screen",
    windowTitle:settings.streamWindowTitle||"",
    displayId:settings.streamDisplayId||"",
    region:(settings.streamCaptureType||"screen")==="screen"?streamDisplayRegion(settings.streamDisplayId||""):null,
    crop:settings.streamCropEnabled===true?{x:settings.streamCropX||0,y:settings.streamCropY||0,width:settings.streamCropWidth||1920,height:settings.streamCropHeight||1080}:null,
    videoDevice:settings.streamVideoDevice||"",
    audioDevice:settings.streamAudioDevice||"",
    audioDevice2:settings.streamAudioDevice2||"",
    audioVolume:settings.streamAudioVolume??1,
    audioVolume2:settings.streamAudioVolume2??1,
    audioMuted:settings.streamAudioMute===true,
    audioMuted2:settings.streamAudioMute2===true,
    audioDelayMs:settings.streamAudioDelayMs||0,
    audioDelayMs2:settings.streamAudioDelayMs2||0,
    drawMouse:settings.streamDrawMouse!==false,
    encoder:output.encoder||"auto"
  };
  const engine=configureStreamEngine();
  const result=await engine.start({
    capture,
    targets:active,
    credentials,
    recording:settings.streamRecordingEnabled===true,
    output,
    watchdog:{enabled:settings.streamWatchdogEnabled!==false,timeoutSec:settings.streamWatchdogTimeoutSec||18}
  });
  logger?.info?.("Local streaming engine started",`${active.length} destination(s), recording=${settings.streamRecordingEnabled===true}`);
  return appState({streamEngine:result});
}

async function stopStreamingEngine(){
  const result=await configureStreamEngine().stop();
  logger?.info?.("Local streaming engine stopped");
  return appState({streamEngine:result});
}

function findCutJob(jobId){
  const id=String(jobId||"");
  return (creatorLibrary.cutJobs||[]).find(job=>String(job.id)===id)||null;
}

async function chooseCutSource(projectId,sourceName=""){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  const id=String(projectId||"");
  if(!creatorLibrary.cutProjects?.some(project=>String(project.id)===id))throw new Error("Cut-Projekt ist nicht in deinem Creator Account verfügbar.");
  const result=await dialog.showOpenDialog(mainWindow,{
    title:"Lokale Videodatei für Cut Studio auswählen",
    properties:["openFile"],
    filters:[{name:"Video",extensions:["mp4","mov","mkv","webm","avi","m4v","ts"]},{name:"Alle Dateien",extensions:["*"]}]
  });
  if(result.canceled||!result.filePaths?.[0])return appState({mediaSourceAction:{canceled:true}});
  const source=mediaSourceStore.set(id,{sourceName,filePath:result.filePaths[0]});
  return appState({mediaSourceAction:{ok:true,source}});
}

async function clearCutSource(projectId){
  mediaSourceStore.remove(projectId);
  return appState({mediaSourceAction:{ok:true,removed:String(projectId||"")}});
}


async function analyzeSelectedAudio(filePath,key){
  try{
    const engine=configureCutMediaEngine();
    const state=await engine.probe();
    if(!state.available)return{available:false,peak_db:null,mean_db:null,duration_ms:null,waveform_path:"",analyzed_at:new Date().toISOString()};
    return await engine.analyzeAudio(filePath,key);
  }catch{return{available:false,peak_db:null,mean_db:null,duration_ms:null,waveform_path:"",analyzed_at:new Date().toISOString()}}
}

async function chooseCutMusic(projectId,musicName=""){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  const id=String(projectId||"");
  if(!creatorLibrary.cutProjects?.some(project=>String(project.id)===id))throw new Error("Cut-Projekt ist nicht in deinem Creator Account verfügbar.");
  const result=await dialog.showOpenDialog(mainWindow,{
    title:"Lokale Musikdatei für Cut Studio auswählen",
    properties:["openFile"],
    filters:[{name:"Audio",extensions:["mp3","wav","m4a","aac","flac","ogg","opus"]},{name:"Alle Dateien",extensions:["*"]}]
  });
  if(result.canceled||!result.filePaths?.[0])return appState({mediaMusicAction:{canceled:true}});
  const analysis=await analyzeSelectedAudio(result.filePaths[0],`${id}-music-primary`);
  const music=mediaSourceStore.setMusic(id,{sourceName:musicName,filePath:result.filePaths[0],analysis});
  return appState({mediaMusicAction:{ok:true,music}});
}

async function clearCutMusic(projectId){
  mediaSourceStore.removeMusic(projectId);
  return appState({mediaMusicAction:{ok:true,removed:String(projectId||"")}});
}


async function chooseCutVoice(projectId,voiceName=""){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  const id=String(projectId||"");
  if(!creatorLibrary.cutProjects?.some(project=>String(project.id)===id))throw new Error("Cut-Projekt ist nicht in deinem Creator Account verfügbar.");
  const result=await dialog.showOpenDialog(mainWindow,{
    title:"Lokale Voiceover-Datei für Cut Studio auswählen",
    properties:["openFile"],
    filters:[{name:"Audio",extensions:["mp3","wav","m4a","aac","flac","ogg","opus"]},{name:"Alle Dateien",extensions:["*"]}]
  });
  if(result.canceled||!result.filePaths?.[0])return appState({mediaVoiceAction:{canceled:true}});
  const analysis=await analyzeSelectedAudio(result.filePaths[0],`${id}-voice-primary`);
  const voice=mediaSourceStore.setVoice(id,{sourceName:voiceName,filePath:result.filePaths[0],analysis});
  return appState({mediaVoiceAction:{ok:true,voice}});
}

async function clearCutVoice(projectId){
  mediaSourceStore.removeVoice(projectId);
  return appState({mediaVoiceAction:{ok:true,removed:String(projectId||"")}});
}


async function chooseCutMusicTrack(projectId,trackId,trackName=""){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  const id=String(projectId||""),tid=String(trackId||"");
  const project=creatorLibrary.cutProjects?.find(project=>String(project.id)===id);
  const track=(project?.export_preset?.music_tracks||[]).find(item=>String(item.id)===tid);
  if(!project||!track)throw new Error("Zusätzliche Musikspur ist nicht im aktuellen Cut-Projekt vorhanden.");
  const result=await dialog.showOpenDialog(mainWindow,{title:`Lokale Musikdatei auswählen · ${track.name||trackName||tid}`,properties:["openFile"],filters:[{name:"Audio",extensions:["mp3","wav","m4a","aac","flac","ogg","opus"]},{name:"Alle Dateien",extensions:["*"]}]});
  if(result.canceled||!result.filePaths?.[0])return appState({mediaExtraMusicAction:{canceled:true}});
  const analysis=await analyzeSelectedAudio(result.filePaths[0],`${id}-music-${tid}`);
  const item=mediaSourceStore.setMusicTrack(id,tid,{sourceName:trackName||track.name||"",filePath:result.filePaths[0],analysis});
  return appState({mediaExtraMusicAction:{ok:true,item}});
}
async function clearCutMusicTrack(projectId,trackId){
  mediaSourceStore.removeMusicTrack(projectId,trackId);
  return appState({mediaExtraMusicAction:{ok:true,projectId:String(projectId||""),trackId:String(trackId||"")}});
}
async function chooseCutVoiceTrack(projectId,trackId,trackName=""){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  const id=String(projectId||""),tid=String(trackId||"");
  const project=creatorLibrary.cutProjects?.find(project=>String(project.id)===id);
  const track=(project?.export_preset?.voice_tracks||[]).find(item=>String(item.id)===tid);
  if(!project||!track)throw new Error("Zusätzliche Voice-Spur ist nicht im aktuellen Cut-Projekt vorhanden.");
  const result=await dialog.showOpenDialog(mainWindow,{title:`Lokale Voice-Datei auswählen · ${track.name||trackName||tid}`,properties:["openFile"],filters:[{name:"Audio",extensions:["mp3","wav","m4a","aac","flac","ogg","opus"]},{name:"Alle Dateien",extensions:["*"]}]});
  if(result.canceled||!result.filePaths?.[0])return appState({mediaExtraVoiceAction:{canceled:true}});
  const analysis=await analyzeSelectedAudio(result.filePaths[0],`${id}-voice-${tid}`);
  const item=mediaSourceStore.setVoiceTrack(id,tid,{sourceName:trackName||track.name||"",filePath:result.filePaths[0],analysis});
  return appState({mediaExtraVoiceAction:{ok:true,item}});
}
async function clearCutVoiceTrack(projectId,trackId){
  mediaSourceStore.removeVoiceTrack(projectId,trackId);
  return appState({mediaExtraVoiceAction:{ok:true,projectId:String(projectId||""),trackId:String(trackId||"")}});
}

async function chooseCutSfx(projectId,trackId,sfxName=""){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  const id=String(projectId||""),tid=String(trackId||"");
  const project=creatorLibrary.cutProjects?.find(project=>String(project.id)===id);
  if(!project)throw new Error("Cut-Projekt ist nicht in deinem Creator Account verfügbar.");
  const track=(project.export_preset?.sfx_tracks||[]).find(item=>String(item.id)===tid);
  if(!track)throw new Error("SFX-Spur ist nicht im aktuellen Cut-Projekt vorhanden.");
  const result=await dialog.showOpenDialog(mainWindow,{
    title:`Lokale SFX-Datei auswählen · ${track.name||sfxName||tid}`,
    properties:["openFile"],
    filters:[{name:"Audio",extensions:["mp3","wav","m4a","aac","flac","ogg","opus"]},{name:"Alle Dateien",extensions:["*"]}]
  });
  if(result.canceled||!result.filePaths?.[0])return appState({mediaSfxAction:{canceled:true}});
  const analysis=await analyzeSelectedAudio(result.filePaths[0],`${id}-sfx-${tid}`);
  const sfx=mediaSourceStore.setSfx(id,tid,{sourceName:sfxName||track.name||"",filePath:result.filePaths[0],analysis});
  return appState({mediaSfxAction:{ok:true,sfx}});
}

async function clearCutSfx(projectId,trackId){
  mediaSourceStore.removeSfx(projectId,trackId);
  return appState({mediaSfxAction:{ok:true,projectId:String(projectId||""),trackId:String(trackId||"")}});
}

function updateCutJobInLibrary(job){
  if(!job?.id)return;
  const jobs=Array.isArray(creatorLibrary.cutJobs)?creatorLibrary.cutJobs.slice():[];
  const index=jobs.findIndex(item=>String(item.id)===String(job.id));
  if(index>=0)jobs[index]=job;else jobs.unshift(job);
  creatorLibrary={...creatorLibrary,cutJobs:jobs};
}

async function processCutJob(jobId){
  assertFeature(creatorFeatures(),"cut_studio","Cut Studio");
  if(!bridge?.snapshot?.().connected)throw new Error("Creator Bridge ist nicht verbunden.");
  if(!creatorLibrary.loadedAt)await refreshCreatorLibrary({notify:false});
  let job=findCutJob(jobId);
  if(!job)throw new Error("Cut-Export-Job ist nicht in deinem Creator Account verfügbar.");
  const source=mediaSourceStore.get(job.project_id);
  if(!source?.exists)throw new Error("Ordne diesem Cut-Projekt zuerst eine lokale Videodatei zu.");
  const preset=job?.manifest?.export_preset||{};
  const reelMode=["reel","both"].includes(String(preset.mode||"clips"));
  const needsMusic=preset.music_enabled===true&&preset.music_mute!==true&&reelMode;
  const needsVoice=preset.voiceover_enabled===true&&preset.voiceover_mute!==true&&reelMode;
  const neededMusicTracks=(Array.isArray(preset.music_tracks)?preset.music_tracks:[]).filter(track=>track?.enabled!==false&&track?.mute!==true&&reelMode);
  const neededVoiceTracks=(Array.isArray(preset.voice_tracks)?preset.voice_tracks:[]).filter(track=>track?.enabled!==false&&track?.mute!==true&&reelMode);
  const neededSfx=(Array.isArray(preset.sfx_tracks)?preset.sfx_tracks:[]).filter(track=>track?.enabled!==false&&track?.mute!==true&&reelMode);
  const music=needsMusic?mediaSourceStore.getMusic(job.project_id):null;
  const voice=needsVoice?mediaSourceStore.getVoice(job.project_id):null;
  const musicTrackSources=neededMusicTracks.map(track=>({trackId:String(track.id),filePath:mediaSourceStore.getMusicTrack(job.project_id,track.id)?.filePath||"",exists:Boolean(mediaSourceStore.getMusicTrack(job.project_id,track.id)?.exists)}));
  const voiceTrackSources=neededVoiceTracks.map(track=>({trackId:String(track.id),filePath:mediaSourceStore.getVoiceTrack(job.project_id,track.id)?.filePath||"",exists:Boolean(mediaSourceStore.getVoiceTrack(job.project_id,track.id)?.exists)}));
  const sfxSources=neededSfx.map(track=>({trackId:String(track.id),filePath:mediaSourceStore.getSfx(job.project_id,track.id)?.filePath||"",exists:Boolean(mediaSourceStore.getSfx(job.project_id,track.id)?.exists)}));
  if(needsMusic&&!music?.exists)throw new Error("Dieser Reel-Job benötigt eine lokal zugeordnete Musikdatei.");
  if(needsVoice&&!voice?.exists)throw new Error("Dieser Reel-Job benötigt eine lokal zugeordnete Voiceover-Datei.");
  const missingMusicTrack=neededMusicTracks.find(track=>!musicTrackSources.find(source=>source.trackId===String(track.id))?.exists);
  if(missingMusicTrack)throw new Error(`Lokale zusätzliche Musikdatei fehlt: ${missingMusicTrack.name||missingMusicTrack.id}`);
  const missingVoiceTrack=neededVoiceTracks.find(track=>!voiceTrackSources.find(source=>source.trackId===String(track.id))?.exists);
  if(missingVoiceTrack)throw new Error(`Lokale zusätzliche Voice-Datei fehlt: ${missingVoiceTrack.name||missingVoiceTrack.id}`);
  const missingSfx=neededSfx.find(track=>!sfxSources.find(source=>source.trackId===String(track.id))?.exists);
  if(missingSfx)throw new Error(`Lokale SFX-Datei fehlt: ${missingSfx.name||missingSfx.id}`);

  const engine=configureCutMediaEngine();
  const media=await engine.probe();
  if(!media.available)throw new Error(media.error||"FFmpeg ist nicht verfügbar.");

  try{
    if(job.status==="failed"){
      job=(await bridge.retryCutJob(job.id)).job;updateCutJobInLibrary(job);
    }
    if(job.status==="queued"){
      job=(await bridge.claimCutJob(job.id)).job;updateCutJobInLibrary(job);
    }
    if(job.status!=="claimed")throw new Error(`Cut-Job hat den Status ${job.status} und kann jetzt nicht lokal gestartet werden.`);
    job=(await bridge.startCutJob(job.id)).job;updateCutJobInLibrary(job);send("launcher:state",appState());
    const exported=await engine.runJob({job,sourcePath:source.filePath,musicPath:music?.filePath||null,voicePath:voice?.filePath||null,musicTrackSources:musicTrackSources.filter(source=>source.exists),voiceTrackSources:voiceTrackSources.filter(source=>source.exists),sfxSources:sfxSources.filter(source=>source.exists)});
    job=(await bridge.completeCutJob(job.id,exported.result)).job;updateCutJobInLibrary(job);
    send("launcher:state",appState({cutJobAction:{ok:true,job,outputs:exported.outputs,outputDir:exported.outputDir}}));
    return appState({cutJobAction:{ok:true,job,outputs:exported.outputs,outputDir:exported.outputDir}});
  }catch(error){
    const latest=findCutJob(job?.id)||job;
    if(latest&&["claimed","processing"].includes(latest.status)){
      try{const failed=(await bridge.failCutJob(latest.id,String(error?.message||error))).job;updateCutJobInLibrary(failed)}catch{}
    }
    send("launcher:state",appState({cutJobAction:{ok:false,error:String(error?.message||error)}}));
    throw error;
  }
}

function openCutExportFolder(){
  const folder=cutMediaEngine?.snapshot?.().lastOutputDir || path.join(app.getPath("videos"),"CFS Creator Suite","Exports");
  fs.mkdirSync(folder,{recursive:true});
  shell.openPath(folder).catch(()=>{});
  return folder;
}


async function runStreamDeckButton(buttonId){
  const button=streamDeckStore?.getButton?.(buttonId);
  if(!button)throw new Error("Stream-Deck Button nicht gefunden.");
  assertStreamDeckButton(creatorFeatures(),button);

  const result=await executeStreamDeckAction(button,{
    isLive:async()=>Boolean(bridge?.liveActive),
    startLive,
    endLive,
    startScene:startCreatorSceneById,
    startNextScene:startNextCreatorScene,
    stopOutput:()=>stopLocalOutput(),
    reloadOutput:()=>configureOutputManager().reload(),
    testAlert:type=>configureOutputManager().testEvent(type),
    toggleAutoThanks:toggleAutoThanksFromDeck,
    toggleWidget:id=>configureOutputManager().toggleWidget(id),
    controlWidget:(id,control)=>bridge.controlWidget(id,control),
    refreshLibrary:()=>refreshCreatorLibrary({notify:false}),
    gameStatus:async()=>creatorLibrary.game || await refreshGameRuntime({notify:false}),
    gameStart:async()=>{const next=await gameControl("start");return next.creatorLibrary.game},
    gameStop:async()=>{const next=await gameControl("stop");return next.creatorLibrary.game},
    gameReset:async()=>{const next=await gameControl("reset");return next.creatorLibrary.game},
    gameScore:async(team,delta)=>{const next=await gameControl("score",{team,delta});return next.creatorLibrary.game},
    openCutProject,
    openPage:openCreatorTool
  });

  const next=appState({streamDeckAction:result});
  send("launcher:state",next);
  return next;
}


function betaDiagnosticSnapshot(){
  const b=bridge?.snapshot?.()||{},o=outputManager?.snapshot?.()||{},g=outputGateStore?.snapshot?.()||{},pf=currentPreflight();
  return{launcher_version:pkg.version,platform:process.platform,provider:providers?.info?.().key||configStore?.publicSettings?.().provider||"",bridge_connected:Boolean(b.connected),live_active:Boolean(b.liveActive),local_output_running:Boolean(o.running),local_output_ready:Boolean(o.ready),scene_id:String(o.scene?.id||""),scene_name:String(o.scene?.name||""),spool_pending:Number(eventSpool?.snapshot?.().pending||0),preflight:{ok:Boolean(pf.ok),blockers:(pf.blockers||[]).map(item=>({key:item.key,label:item.label,detail:item.detail}))},output_gate:{pass:Number(g.summary?.pass||0),fail:Number(g.summary?.fail||0),untested:Number(g.summary?.untested||0),total:Number(g.summary?.total||0),complete:Boolean(g.summary?.complete)}};
}
async function refreshBetaCenter({notify=true}={}){
  if(!bridge?.snapshot?.().connected){betaCloud={beta:{status:"none",active:false},active_session:null,recent_feedback:[],loadedAt:null,error:"Bridge offline"};if(notify)send("launcher:state",appState());return betaCloud}
  try{const d=await bridge.betaStatus();betaCloud={beta:d?.beta||{status:"none",active:false},active_session:d?.active_session||null,recent_feedback:Array.isArray(d?.recent_feedback)?d.recent_feedback:[],loadedAt:new Date().toISOString(),error:""};if(betaCloud.active_session&&!betaSessionStore?.snapshot?.().active)betaSessionStore?.start?.(betaCloud.active_session);if(!betaCloud.active_session&&betaSessionStore?.snapshot?.().active)betaSessionStore?.clear?.()}catch(e){betaCloud={...betaCloud,error:String(e?.message||e)}}if(notify)send("launcher:state",appState());return betaCloud
}
async function startBetaTestSession(input={}){
  if(!bridge?.snapshot?.().connected)throw new Error("Creator Bridge ist nicht verbunden.");
  if(!bridge.snapshot().creator?.beta?.active)throw new Error("Beta-Testzugriff ist für diesen Creator nicht aktiv.");
  const d=betaDiagnosticSnapshot(),r=await bridge.startBetaSession({label:String(input.label||"Beta Test").slice(0,120),launcher_version:pkg.version,platform:process.platform,provider:d.provider,output_gate:d.output_gate,diagnostics:d});
  betaSessionStore.start(r.session);await refreshBetaCenter({notify:false});return appState({betaAction:{type:"session_start",session:r.session}});
}
async function endBetaTestSession(input={}){
  const local=betaSessionStore?.snapshot?.()||{},sessionId=String(input.sessionId||local.sessionId||"");if(!sessionId)throw new Error("Keine aktive Beta-Testsession.");
  const d=betaDiagnosticSnapshot();
  try{const r=await bridge.endBetaSession({session_id:sessionId,result_summary:String(input.resultSummary||"").slice(0,2000),output_gate:d.output_gate,diagnostics:d});betaSessionStore.clear();await refreshBetaCenter({notify:false});return appState({betaAction:{type:"session_end",session:r.session}})}
  catch(e){betaSessionStore.fail(e?.message||e);throw e}
}
async function submitBetaFeedback(input={}){
  if(!bridge?.snapshot?.().connected)throw new Error("Creator Bridge ist nicht verbunden.");
  if(!bridge.snapshot().creator?.beta?.active)throw new Error("Beta-Feedback ist für diesen Creator nicht aktiv.");
  const local=betaSessionStore?.snapshot?.()||{},d=betaDiagnosticSnapshot(),r=await bridge.submitBetaFeedback({session_id:local.active?local.sessionId:null,kind:String(input.kind||"bug"),severity:String(input.severity||"medium"),category:String(input.category||"launcher"),title:String(input.title||"").slice(0,160),description:String(input.description||"").slice(0,5000),repro_steps:String(input.reproSteps||"").slice(0,5000),expected:String(input.expected||"").slice(0,3000),actual:String(input.actual||"").slice(0,3000),launcher_version:pkg.version,platform:process.platform,provider:d.provider,diagnostics:d});
  await refreshBetaCenter({notify:false});return appState({betaAction:{type:"feedback",feedback:r.feedback}});
}

function configureOutputManager() {
  if (!outputManager) {
    outputManager = new OutputWindowManager({BrowserWindow,screen,logger});
    outputManager.on("state",state=>{
      send("launcher:state",appState({localOutput:state}));
    });
  }
  return outputManager;
}

function findCreatorScene(sceneId) {
  const id=String(sceneId||"");
  return (creatorLibrary.scenes||[]).find(scene=>String(scene.id)===id)||null;
}

async function startLocalOutput(input={}) {
  assertFeature(creatorFeatures(),"local_output","Local Scene Output");
  if (!bridge?.snapshot?.().connected) throw new Error("Creator Bridge ist nicht verbunden.");
  if (!creatorLibrary.loadedAt) await refreshCreatorLibrary({notify:false});
  const scene=findCreatorScene(input.sceneId);
  if (!scene) throw new Error("Diese veröffentlichte Scene ist nicht in deinem Creator Account verfügbar.");
  outputGateStore?.setScene?.(scene);
  const manager=configureOutputManager();
  const state=await manager.start(scene,{
    backgroundMode:String(input.backgroundMode||"transparent"),
    displayId:input.displayId,
    alwaysOnTop:Boolean(input.alwaysOnTop)
  });
  return appState({localOutput:state});
}

async function stopLocalOutput() {
  const state=await configureOutputManager().stop();
  return appState({localOutput:state});
}

async function exportOutputGateReport() {
  const report=outputGateStore.snapshot();
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const result=await dialog.showSaveDialog(mainWindow,{
    title:"CFS Output Testbericht speichern",
    defaultPath:path.join(app.getPath("documents"),`cfs_output_test_${stamp}.json`),
    filters:[{name:"JSON",extensions:["json"]}]
  });
  if(result.canceled||!result.filePath)return{ok:false,canceled:true};
  fs.writeFileSync(result.filePath,JSON.stringify(report,null,2),"utf8");
  shell.showItemInFolder(result.filePath);
  return{ok:true,filePath:result.filePath,summary:report.summary};
}


function configureDeviceLinkClient() {
  const settings = configStore?.publicSettings?.() || {};
  if (!deviceLinkClient) {
    deviceLinkClient = new DeviceLinkClient({
      backendUrl:settings.backendUrl || "https://cfs-zockt.de",
      version:pkg.version,
      logger
    });
  } else {
    deviceLinkClient.setBackendUrl(settings.backendUrl || "https://cfs-zockt.de");
  }
  return deviceLinkClient;
}

async function refreshCreatorLibrary({notify=true} = {}) {
  if (!bridge?.snapshot?.().connected) {
    creatorLibrary = {widgets:[],scenes:[],game:null,gameRules:[],gameRuleHits:[],cutProjects:[],cutJobs:[],creator:null,loadedAt:null,error:"Bridge offline"};
    if (notify) send("launcher:state",appState());
    return creatorLibrary;
  }
  try {
    const data = await bridge.fetchLibrary();
    creatorLibrary = {
      widgets:Array.isArray(data?.widgets)?data.widgets:[],
      scenes:Array.isArray(data?.scenes)?data.scenes:[],
      game:data?.game || null,
      gameRules:Array.isArray(data?.game_rules)?data.game_rules:[],
      gameRuleHits:Array.isArray(data?.game_rule_hits)?data.game_rule_hits:[],
      cutProjects:Array.isArray(data?.cut_projects)?data.cut_projects:[],
      cutJobs:Array.isArray(data?.cut_jobs)?data.cut_jobs:[],
      creator:data?.creator || null,
      loadedAt:new Date().toISOString(),
      error:""
    };
  } catch (error) {
    creatorLibrary = {...creatorLibrary,error:String(error?.message||error)};
  }
  if (notify) send("launcher:state",appState());
  return creatorLibrary;
}

function stopDeviceLinkPolling() {
  clearTimeout(deviceLinkPollTimer);
  deviceLinkPollTimer = null;
  deviceLinkPolling = false;
}

async function pollPendingDeviceLink({notify=true} = {}) {
  if (deviceLinkPolling) return appState();
  const pending = configStore?.getPendingDeviceLink?.();
  if (!pending) return appState();

  const expires = pending.expiresAt ? new Date(pending.expiresAt).getTime() : 0;
  if (expires && expires <= Date.now()) {
    configStore.clearPendingDeviceLink();
    stopDeviceLinkPolling();
    if (notify) send("launcher:state",appState({deviceLink:{status:"expired"}}));
    return appState({deviceLink:{status:"expired"}});
  }

  deviceLinkPolling = true;
  try {
    const client = configureDeviceLinkClient();
    const result = await client.poll({
      deviceLinkId:pending.deviceLinkId,
      deviceSecret:pending.deviceSecret
    });

    if (result?.approved) {
      configStore.completeDeviceLink();
      stopDeviceLinkPolling();
      rebuildBridge();
      try { await bridge.connect(); } catch {}
      await refreshCreatorLibrary({notify:false});
      logger?.info("Launcher Device-Link approved");
      const next = appState({
        deviceLink:{
          status:"approved",
          approved:true,
          creator:result.creator || null
        }
      });
      if (notify) send("launcher:state",next);
      return next;
    }

    if (result?.status === "expired" || result?.status === "revoked") {
      configStore.clearPendingDeviceLink();
      stopDeviceLinkPolling();
      const next = appState({deviceLink:{status:result.status,approved:false}});
      if (notify) send("launcher:state",next);
      return next;
    }

    const next = appState({
      deviceLink:{
        status:result?.status || "pending",
        approved:false
      }
    });
    if (notify) send("launcher:state",next);
    return next;
  } finally {
    deviceLinkPolling = false;
  }
}

function scheduleDeviceLinkPolling(delayMs = 1500) {
  clearTimeout(deviceLinkPollTimer);
  const pending = configStore?.getPendingDeviceLink?.();
  if (!pending) return;
  deviceLinkPollTimer = setTimeout(async () => {
    try { await pollPendingDeviceLink(); } catch (error) {
      logger?.warn("Device-Link poll failed",error?.message);
    } finally {
      if (configStore?.getPendingDeviceLink?.()) scheduleDeviceLinkPolling(2500);
    }
  }, Math.max(800,Number(delayMs)||1500));
  deviceLinkPollTimer.unref?.();
}

async function startDeviceLink() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Device-Link benötigt die sichere Betriebssystem-Verschlüsselung.");
  }
  const settings = configStore.publicSettings();
  configStore.clearPendingDeviceLink();
  const client = configureDeviceLinkClient();
  const link = await client.start({machineName:settings.machineName || os.hostname()});
  configStore.savePendingDeviceLink(link);
  scheduleDeviceLinkPolling(link.poll_after_ms || 2500);
  logger?.info("Launcher Device-Link started",link.user_code);
  return appState({
    deviceLink:{
      status:"pending",
      approved:false
    }
  });
}

async function logoutLauncherDevice() {
  if(bridge?.liveActive){
    try{
      await endLive("device_logout");
    }catch(error){
      logger?.warn("Device logout blocked because LIVE shutdown failed",error?.message);
      const blocked=new Error("LIVE konnte vor dem Abmelden nicht sauber beendet werden. Verbindung bleibt erhalten; bitte LIVE beenden und erneut versuchen.");
      blocked.code="LIVE_LOGOUT_BLOCKED";
      throw blocked;
    }
  }

  try { await outputManager?.stop?.(); } catch {}
  try { await streamEngine?.stop?.(); } catch {}
  let remoteRevoked = false;
  try {
    if (bridge?.token) {
      const result = await bridge.logoutDevice();
      remoteRevoked = Boolean(result?.revoked);
    }
  } catch (error) {
    logger?.warn("Remote device logout failed",error?.message);
  }
  stopDeviceLinkPolling();
  configStore.clearPendingDeviceLink();
  configStore.clearToken();
  creatorLibrary = {widgets:[],scenes:[],game:null,gameRules:[],gameRuleHits:[],cutProjects:[],cutJobs:[],creator:null,loadedAt:null,error:""};
  rebuildBridge();
  return appState({deviceLogout:{remoteRevoked}});
}


function rebuildBridge() {
  bridge?.stop?.();
  const settings = configStore.publicSettings();
  const token = configStore.getToken();
  bridge = new BridgeClient({ settings, token, logger, version: pkg.version, spool: eventSpool, streamHealthProvider:()=>streamEngine?.telemetry?.() || null });

  bridge.on("state", state => {
    send("launcher:state", appState({ bridge: state }));
    refreshTray();

    if (state.connected && (!creatorLibrary.loadedAt || creatorLibrary.error)) {
      refreshCreatorLibrary().catch(()=>{});
    }
    if (state.connected && (!betaCloud.loadedAt || betaCloud.error)) {
      refreshBetaCenter().catch(()=>{});
    }

    const settingsNow = configStore.publicSettings();
    const marker = liveSessionStore?.read?.() || { active:false };
    const retryDue = Date.now() - lastRecoveryAttemptAt >= 15000;

    if (
      settingsNow.autoRecoverLive !== false &&
      marker.active &&
      state.connected &&
      !bridge.liveActive &&
      !recoveringLive &&
      retryDue
    ) {
      lastRecoveryAttemptAt = Date.now();
      recoverLiveSession().catch(error => logger?.warn("Automatic LIVE recovery failed", error?.message));
    }
  });

  bridge.on("action", action => {
    send("launcher:action", action);
  });

  const marker = liveSessionStore?.read?.() || { active:false };
  const shouldRecover = settings.autoRecoverLive !== false && marker.active;
  bridge.start({ deferHeartbeat: shouldRecover });

  if (shouldRecover) {
    lastRecoveryAttemptAt = Date.now();
    setTimeout(() => {
      recoverLiveSession()
        .catch(error => logger?.warn("Startup LIVE recovery failed", error?.message))
        .finally(() => bridge?.enableHeartbeat?.());
    }, 0);
  }
}

async function rebuildProvider() {
  const settings = configStore.publicSettings();
  if (!providers) {
    providers = new ProviderManager(logger);
    providers.on("event", event => {
      try {
        eventMonitor?.record?.(event);
        bridge.enqueueEvent(event);
        send("launcher:state", appState());
      } catch (error) {
        logger.warn("Provider event rejected", error.message);
      }
    });
    providers.on("state", state => send("launcher:state", appState({ providerState: state })));
  }
  await providers.use(settings.provider || "mock");
}

async function recoverLiveSession() {
  if (recoveringLive) return bridge.snapshot();
  recoveringLive = true;
  lastRecoveryAttemptAt = Date.now();

  const marker = liveSessionStore?.read?.() || { active:false };
  if (!marker.active || !marker.sessionId) {
    recoveringLive = false;
    throw new Error("Kein persistenter LIVE Session Marker vorhanden.");
  }

  let providerStarted = false;
  try {
    const settings = configStore.publicSettings();

    await bridge.resumeSession(marker.sessionId,{ dryRun:true });

    const readiness = currentPreflight();
    if (!readiness.ok) {
      const message = readiness.blockers.map(x => x.label).join(", ");
      throw new Error(`LIVE Recovery blockiert: ${message}`);
    }

    await providers.use(marker.provider || settings.provider || "mock");
    await providers.start({
      machineName:settings.machineName,
      username:marker.username || settings.tiktokUsername,
      apiKey:configStore.getTikToolKey()
    });
    providerStarted = true;

    const data = await bridge.resumeSession(marker.sessionId,{ dryRun:false });
    liveSessionStore.touch({
      provider:marker.provider || settings.provider || "mock",
      username:marker.username || settings.tiktokUsername || "",
      lastError:""
    });

    logger?.info("LIVE session automatically recovered", String(data.session_id || marker.sessionId));
    send("launcher:state", appState({ recoveredLive:true }));
    refreshTray();
    return appState({ recoveredLive:true });
  } catch (error) {
    liveSessionStore?.markError?.(error);
    if (providerStarted && !bridge?.liveActive) {
      try { await providers.stop(); } catch {}
    }
    throw error;
  } finally {
    recoveringLive = false;
  }
}

async function startLive() {
  if (!bridge.snapshot().connected) await bridge.connect();
  const readiness = currentPreflight();
  if (!readiness.ok) {
    const message = readiness.blockers.map(x => x.label).join(", ");
    const error = new Error(`LIVE Preflight fehlgeschlagen: ${message}`);
    error.preflight = readiness;
    throw error;
  }
  const publicSettings = configStore.publicSettings();
  const providerInfo = await providers.start({
    machineName: publicSettings.machineName,
    username: publicSettings.tiktokUsername,
    apiKey: configStore.getTikToolKey()
  });
  const data = await bridge.startSession({ provider: providerInfo.key });
  try {
    liveSessionStore?.setActive?.({
      sessionId:data.session_id || data.live?.session_id,
      provider:providerInfo.key,
      username:publicSettings.tiktokUsername || "",
      startedAt:data.live?.started_at || new Date().toISOString()
    });
  } catch (error) {
    logger?.warn("LIVE session marker write failed", error?.message);
  }
  send("launcher:state", appState());
  refreshTray();
  return data;
}

async function endLive(reason = "launcher_user_stop") {
  try { await providers.stop(); } catch {}
  const drain = await bridge.drainEvents(5000);
  if (!drain.ok) logger?.warn("LIVE end with pending events", `${drain.remaining} events remain queued`);
  try {
    const data = await bridge.endSession({ reason });
    liveSessionStore?.clear?.();
    send("launcher:state", appState({ lastDrain:drain }));
    refreshTray();
    return { ...data, drain };
  } catch (error) {
    liveSessionStore?.markError?.(error);
    throw error;
  }
}

async function gracefulShutdown(reason = "app_quit") {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  try { await outputManager?.stop?.(); } catch {}
  try { await streamEngine?.stop?.(); } catch {}

  logger?.info("Graceful shutdown started", reason);
  try {
    if (bridge?.liveActive) {
      await endLive(reason);
    } else if (bridge?.eventQueue?.length) {
      const drain = await bridge.drainEvents(4500);
      if (!drain.ok) logger?.warn("Shutdown kept pending events in persistent spool", `${drain.remaining} pending`);
    }
  } catch (error) {
    logger?.warn("Graceful shutdown warning", error?.message);
  } finally {
    bridge?.stop?.();
    updates?.stop?.();
    clearInterval(cloudHealthTimer);
    stopDeviceLinkPolling();
    logger?.info("Graceful shutdown finished");
  }
}

function registerIpc() {
  ipcMain.handle("launcher:bootstrap", async () => appState());

  ipcMain.handle("launcher:settings-save", async (_event, settings) => {
    const input=settings&&typeof settings==="object"?settings:{};
    const current=configStore.publicSettings();
    const transition=planSettingsTransition({
      current,
      input,
      liveActive:Boolean(bridge?.liveActive)
    });
    const saved = configStore.save(input);
    app.setLoginItemSettings({ openAtLogin: Boolean(saved.autoStart), openAsHidden: Boolean(saved.startMinimized) });

    if(transition.providerChanged)await rebuildProvider();
    bridge?.updateCredentials?.(saved,configStore.getToken());
    updates?.configure?.(saved);
    updates?.start?.(saved);
    configureDeviceLinkClient();
    logger.info("Launcher settings updated",transition.criticalChanges.length?`connection fields: ${transition.criticalChanges.join(",")}`:"runtime-only");

    if(transition.bridgeCredentialsChanged){
      bridge?.connect?.().catch(error=>logger?.warn("Bridge reconnect after settings update failed",error?.message));
    }
    if(transition.backendChanged)refreshCloudHealth().catch(()=>{});
    return appState();
  });

  ipcMain.handle("launcher:device-link-start", async () => {
    return startDeviceLink();
  });

  ipcMain.handle("launcher:device-link-status", async () => {
    return pollPendingDeviceLink();
  });

  ipcMain.handle("launcher:device-link-cancel", async () => {
    stopDeviceLinkPolling();
    configStore.clearPendingDeviceLink();
    return appState({deviceLink:{status:"cancelled",approved:false}});
  });

  ipcMain.handle("launcher:device-logout", async () => {
    return logoutLauncherDevice();
  });

  ipcMain.handle("launcher:creator-library", async () => {
    await refreshCreatorLibrary({notify:false});
    return appState();
  });

  ipcMain.handle("launcher:stream-bot-get", async () => {
    if (!bridge?.snapshot?.().connected) throw new Error("Creator Bridge ist nicht verbunden.");
    return bridge.getStreamBot();
  });

  ipcMain.handle("launcher:stream-bot-save", async (_event, streamBot) => {
    if (!bridge?.snapshot?.().connected) throw new Error("Creator Bridge ist nicht verbunden.");
    return bridge.saveStreamBot(streamBot || {});
  });

  ipcMain.handle("launcher:token-clear", async () => {
    assertLiveSafeSecretChange(Boolean(bridge?.liveActive),"Bridge-Schlüssel");
    configStore.clearToken();
    rebuildBridge();
    return appState();
  });

  ipcMain.handle("launcher:provider-key-clear", async () => {
    assertLiveSafeSecretChange(Boolean(bridge?.liveActive),"Provider API-Key");
    configStore.clearProviderKey();
    return appState();
  });

  ipcMain.handle("launcher:connect", async () => {
    const data = await bridge.connect();
    return appState({ bridge: data });
  });

  ipcMain.handle("launcher:live-start", async () => startLive());
  ipcMain.handle("launcher:live-end", async () => endLive());

  ipcMain.handle("launcher:simulate", async (_event, input) => {
    const event = providers.simulate(String(input?.type || ""), input?.payload || {});
    return { ok: true, event, queue: bridge.eventQueue.length };
  });

  ipcMain.handle("launcher:provider", async (_event, provider) => {
    const input={provider:String(provider||"mock")};
    planSettingsTransition({current:configStore.publicSettings(),input,liveActive:Boolean(bridge?.liveActive)});
    const next = configStore.save(input);
    await rebuildProvider();
    bridge?.updateCredentials?.(next,configStore.getToken());
    return appState({ settings: next });
  });

  ipcMain.handle("launcher:auto-start", async (_event, enabled) => {
    const settings = configStore.save({ autoStart: Boolean(enabled) });
    app.setLoginItemSettings({ openAtLogin: Boolean(settings.autoStart), openAsHidden: Boolean(settings.startMinimized) });
    return settings;
  });

  ipcMain.handle("launcher:bridge-self-test", async () => {
    return bridge.selfTest();
  });

  ipcMain.handle("launcher:setup-complete", async () => {
    const settings = configStore.markSetupComplete(1);
    logger?.info("First-run setup completed");
    return appState({ settings, firstRun:false });
  });

  ipcMain.handle("launcher:setup-reset", async () => {
    const settings = configStore.resetSetup();
    return appState({ settings, firstRun:true });
  });

  ipcMain.handle("launcher:stream-deck-action", async (_event,buttonId) => {
    return runStreamDeckButton(buttonId);
  });

  ipcMain.handle("launcher:stream-deck-button-save", async (_event,input) => {
    const deck=streamDeckStore.updateButton(input?.id,input||{});
    return appState({streamDeck:deck});
  });

  ipcMain.handle("launcher:stream-deck-profile", async (_event,profileId) => {
    let deck=streamDeckStore.setActiveProfile(profileId);
    if(deck.active_profile==="gaming"){
      const widgets=Array.isArray(creatorLibrary.widgets)?creatorLibrary.widgets:[];
      const targetByType=type=>String(widgets.find(widget=>String(widget.widget_type||"")===type)?.id||"");
      const autoTargets=new Map([
        ["SIEG +1",targetByType("wins_counter")],
        ["TOD +1",targetByType("deaths_counter")],
        ["TIMER ▶ / ‖",targetByType("stream_timer")],
        ["TIMER RESET",targetByType("stream_timer")]
      ]);
      for(const button of deck.buttons||[]){
        const target=autoTargets.get(String(button.label||"").toUpperCase());
        if(target&&!button.target)deck=streamDeckStore.updateButton(button.id,{target});
      }
    }
    return appState({streamDeck:deck});
  });

  ipcMain.handle("launcher:stream-deck-reset", async () => {
    const deck=streamDeckStore.reset();
    return appState({streamDeck:deck});
  });

  ipcMain.handle("launcher:creator-tools-refresh", async () => {
    await refreshCreatorLibrary({notify:false});
    return appState();
  });

  ipcMain.handle("launcher:game-control", async (_event,input) => {
    return gameControl(String(input?.action||"status"),input||{});
  });

  ipcMain.handle("launcher:open-cut-project", async (_event,projectId) => {
    await openCutProject(projectId);
    return appState();
  });

  ipcMain.handle("launcher:media-engine-probe", async () => probeCutMediaEngine());
  ipcMain.handle("launcher:stream-engine-probe", async () => {await configureStreamEngine().probe();return appState();});
  ipcMain.handle("launcher:stream-studio-sync", async () => {await syncStreamStudioConfig({notify:false});return appState();});
  ipcMain.handle("launcher:stream-capture-devices", async () => streamCaptureDevices());
  ipcMain.handle("launcher:stream-local-settings", async (_event,input) => saveStreamLocalSettings(input||{}));
  ipcMain.handle("launcher:stream-credential-save", async (_event,input) => saveStreamCredential(input||{}));
  ipcMain.handle("launcher:stream-credential-remove", async (_event,targetId) => removeStreamCredential(targetId));
  ipcMain.handle("launcher:stream-provider-docs", async (_event,provider) => openStreamProviderDocs(provider));
  ipcMain.handle("launcher:stream-engine-preflight", async () => streamEnginePreflight());
  ipcMain.handle("launcher:stream-engine-start", async () => startStreamingEngine());
  ipcMain.handle("launcher:stream-engine-stop", async () => stopStreamingEngine());
  ipcMain.handle("launcher:stream-target-start", async (_event,targetId) => startStreamDestination(targetId));
  ipcMain.handle("launcher:stream-target-stop", async (_event,targetId) => stopStreamDestination(targetId));

  ipcMain.handle("launcher:cut-source-select", async (_event,input) => {
    return chooseCutSource(input?.projectId,input?.sourceName||"");
  });

  ipcMain.handle("launcher:cut-source-clear", async (_event,projectId) => clearCutSource(projectId));

  ipcMain.handle("launcher:cut-music-select", async (_event,input) => {
    return chooseCutMusic(input?.projectId,input?.musicName||"");
  });

  ipcMain.handle("launcher:cut-music-clear", async (_event,projectId) => clearCutMusic(projectId));

  ipcMain.handle("launcher:cut-voice-select", async (_event,input) => {
    return chooseCutVoice(input?.projectId,input?.voiceName||"");
  });

  ipcMain.handle("launcher:cut-voice-clear", async (_event,projectId) => clearCutVoice(projectId));

  ipcMain.handle("launcher:cut-music-track-select", async (_event,input) => chooseCutMusicTrack(input?.projectId,input?.trackId,input?.trackName||""));
  ipcMain.handle("launcher:cut-music-track-clear", async (_event,input) => clearCutMusicTrack(input?.projectId,input?.trackId));
  ipcMain.handle("launcher:cut-voice-track-select", async (_event,input) => chooseCutVoiceTrack(input?.projectId,input?.trackId,input?.trackName||""));
  ipcMain.handle("launcher:cut-voice-track-clear", async (_event,input) => clearCutVoiceTrack(input?.projectId,input?.trackId));

  ipcMain.handle("launcher:cut-sfx-select", async (_event,input) => {
    return chooseCutSfx(input?.projectId,input?.trackId,input?.sfxName||"");
  });

  ipcMain.handle("launcher:cut-sfx-clear", async (_event,input) => {
    return clearCutSfx(input?.projectId,input?.trackId);
  });

  ipcMain.handle("launcher:cut-job-process", async (_event,jobId) => processCutJob(jobId));

  ipcMain.handle("launcher:cut-export-folder", async () => {
    const folder=openCutExportFolder();
    return appState({cutExportFolder:folder});
  });

  ipcMain.handle("launcher:beta-refresh", async () => {await refreshBetaCenter({notify:false});return appState();});
  ipcMain.handle("launcher:beta-session-start", async (_event,input) => startBetaTestSession(input||{}));
  ipcMain.handle("launcher:beta-session-end", async (_event,input) => endBetaTestSession(input||{}));
  ipcMain.handle("launcher:beta-feedback", async (_event,input) => submitBetaFeedback(input||{}));

  ipcMain.handle("launcher:output-start", async (_event,input) => {
    return startLocalOutput(input||{});
  });

  ipcMain.handle("launcher:output-stop", async () => {
    return stopLocalOutput();
  });

  ipcMain.handle("launcher:output-reload", async () => {
    const state=await configureOutputManager().reload();
    return appState({localOutput:state});
  });

  ipcMain.handle("launcher:output-always-on-top", async (_event,enabled) => {
    const state=configureOutputManager().setAlwaysOnTop(Boolean(enabled));
    return appState({localOutput:state});
  });

  ipcMain.handle("launcher:output-gate-update", async (_event,input) => {
    const gate=outputGateStore.update(input?.key,input?.status,input?.note||"");
    return appState({outputGate:gate});
  });

  ipcMain.handle("launcher:output-gate-reset", async () => {
    const gate=outputGateStore.reset();
    return appState({outputGate:gate});
  });

  ipcMain.handle("launcher:output-gate-export", async () => {
    return exportOutputGateReport();
  });

  ipcMain.handle("launcher:scenes", async () => {
    if(!bridge?.snapshot?.().connected)return{ok:false,scenes:[],error:"Bridge ist nicht verbunden."};
    try{return{ok:true,scenes:await bridge.fetchScenes()}}
    catch(error){logger?.warn("Scene list failed",String(error?.message||error));return{ok:false,scenes:[],error:String(error?.message||error)}}
  });

  ipcMain.handle("launcher:cloud-health", async () => {
    await refreshCloudHealth({notify:false});
    return appState();
  });

  ipcMain.handle("launcher:config-export", async () => {
    const backup=createBackup(configStore.publicSettings(),pkg.version);
    const stamp=new Date().toISOString().replace(/[:.]/g,"-");
    const result=await dialog.showSaveDialog(mainWindow,{
      title:"Creator Suite Konfiguration exportieren",
      defaultPath:path.join(app.getPath("documents"),`cfs_creator_suite_config_${stamp}.json`),
      filters:[{name:"JSON",extensions:["json"]}]
    });
    if(result.canceled||!result.filePath)return {ok:false,canceled:true};
    fs.writeFileSync(result.filePath,JSON.stringify(backup,null,2),"utf8");
    shell.showItemInFolder(result.filePath);
    return {ok:true,filePath:result.filePath,secretsIncluded:false};
  });

  ipcMain.handle("launcher:config-import", async () => {
    if(bridge?.liveActive)throw new Error("Konfiguration kann während LIVE nicht importiert werden.");
    const result=await dialog.showOpenDialog(mainWindow,{
      title:"Creator Suite Konfiguration importieren",
      properties:["openFile"],
      filters:[{name:"JSON",extensions:["json"]}]
    });
    if(result.canceled||!result.filePaths?.[0])return {ok:false,canceled:true};
    const backup=parseBackup(fs.readFileSync(result.filePaths[0],"utf8"));
    recoveryManager?.create?.("before-config-import",pkg.version);
    const imported=configStore.save({
      ...backup.config,
      setupVersion:0,
      setupCompletedAt:""
    });
    app.setLoginItemSettings({openAtLogin:Boolean(imported.autoStart),openAsHidden:Boolean(imported.startMinimized)});
    await rebuildProvider();
    rebuildBridge();
    updates?.configure?.(imported);
    updates?.start?.(imported);
    await refreshCloudHealth({notify:false});
    logger?.warn("Portable configuration imported","Secrets were not imported");
    return appState({importedBackup:true,firstRun:true});
  });

  ipcMain.handle("launcher:recovery-create", async (_event, reason) => {
    if(bridge?.liveActive)throw new Error("Restore Point kann während LIVE nicht erstellt werden.");
    const point=recoveryManager.create(String(reason||"manual"),pkg.version);
    return appState({createdRestorePoint:point});
  });

  ipcMain.handle("launcher:recovery-restore", async (_event, id) => {
    if(bridge?.liveActive)throw new Error("Restore Point kann während LIVE nicht wiederhergestellt werden.");
    const meta=recoveryManager.restore(String(id||""));
    eventSpool=new EventSpool(spoolPath,logger,1000);
    const restored=configStore.publicSettings();
    app.setLoginItemSettings({openAtLogin:Boolean(restored.autoStart),openAsHidden:Boolean(restored.startMinimized)});
    await rebuildProvider();
    rebuildBridge();
    updates?.configure?.(restored);
    updates?.start?.(restored);
    await refreshCloudHealth({notify:false});
    logger?.warn("Local restore point applied",meta.id);
    return appState({restoredPoint:meta});
  });

  ipcMain.handle("launcher:obs-doctor", async (_event, rawUrl) => {
    return runObsDoctor(String(rawUrl || ""));
  });

  ipcMain.handle("launcher:event-monitor-clear", async () => {
    eventMonitor?.clear?.();
    send("launcher:state", appState());
    return { ok: true, monitor: eventMonitor?.snapshot?.() || {} };
  });

  ipcMain.handle("launcher:field-test-export", async () => {
    const settings = configStore.publicSettings();
    const report = {
      schema: 1,
      generated_at: new Date().toISOString(),
      product: "cfs_zockt Creator Suite",
      launcher_version: pkg.version,
      provider: providers?.info?.() || {},
      bridge: bridge?.snapshot?.() || {},
      preflight: currentPreflight(),
      event_monitor: eventMonitor?.snapshot?.({ includeActors: false }) || {},
      note: "Actor names are pseudonymized in exported field-test reports."
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "LIVE Field-Test-Bericht speichern",
      defaultPath: path.join(app.getPath("documents"), `cfs_live_field_test_${stamp}.json`),
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return { ok:false, canceled:true };
    fs.writeFileSync(result.filePath, JSON.stringify(report, null, 2), "utf8");
    shell.showItemInFolder(result.filePath);
    return { ok:true, filePath:result.filePath, coverage:report.event_monitor.coverage };
  });

  ipcMain.handle("launcher:preflight", async () => {
    if (!bridge.snapshot().connected) {
      try { await bridge.connect(); } catch {}
    }
    return currentPreflight();
  });

  ipcMain.handle("launcher:live-recover", async () => {
    return recoverLiveSession();
  });

  ipcMain.handle("launcher:spool-clear", async () => {
    if (bridge?.liveActive) throw new Error("Event Queue kann während einer aktiven LIVE-Session nicht geleert werden.");
    const cleared = eventSpool?.clear?.() || 0;
    if (bridge) bridge.eventQueue = eventSpool?.all?.() || [];
    send("launcher:state", appState());
    return { ok:true, cleared };
  });

  ipcMain.handle("launcher:update-check", async () => {
    return updates.check(true);
  });

  ipcMain.handle("launcher:update-download", async () => {
    return updates.download();
  });

  ipcMain.handle("launcher:update-install", async () => {
    if (bridge?.liveActive) {
      throw new Error("Update kann während einer aktiven LIVE-Session nicht installiert werden.");
    }
    if (bridge?.eventQueue?.length) {
      const drain = await bridge.drainEvents(4000);
      if (!drain.ok) {
        throw new Error(`Update wartet: ${drain.remaining} LIVE-Events sind noch nicht übertragen.`);
      }
    }
    recoveryManager?.create?.(`before-update-${updates?.snapshot?.().latestVersion || "unknown"}`,pkg.version);
    return updates.install();
  });

  ipcMain.handle("launcher:diagnostics-export", async () => {
    const report = buildDiagnostics({
      appVersion: pkg.version,
      settings: configStore.publicSettings(),
      bridge: bridge?.snapshot?.() || {},
      provider: providers?.info?.() || {},
      update: updates?.snapshot?.() || {},
      spool: eventSpool?.snapshot?.() || {},
      preflight: currentPreflight(),
      releaseGate: {},
      monitor: eventMonitor?.snapshot?.({ includeActors: false }) || {},
      cloudHealth,
      creatorReady:creatorReady({
        settings:configStore.publicSettings(),
        health:cloudHealth,
        preflight:currentPreflight(),
        bridge:bridge?.snapshot?.() || {},
        spool:eventSpool?.snapshot?.() || {},
        encryptionAvailable:safeStorage.isEncryptionAvailable()
      }),
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
      logger
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Creator Suite Diagnosebericht speichern",
      defaultPath: path.join(app.getPath("documents"), `cfs_creator_suite_diagnose_${stamp}.json`),
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(report, null, 2), "utf8");
    shell.showItemInFolder(result.filePath);
    logger.info("Diagnostics report exported");
    return { ok: true, filePath: result.filePath };
  });

  ipcMain.handle("launcher:support-bundle", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title:"Support-Paket speichern",
      properties:["openDirectory","createDirectory"]
    });
    if (result.canceled || !result.filePaths?.[0]) return {ok:false,canceled:true};

    const settings = configStore.publicSettings();
    const monitor = eventMonitor?.snapshot?.({includeActors:false}) || {};
    const diagnostics = buildDiagnostics({
      appVersion:pkg.version,
      settings,
      bridge:bridge?.snapshot?.() || {},
      provider:providers?.info?.() || {},
      update:updates?.snapshot?.() || {},
      spool:eventSpool?.snapshot?.() || {},
      preflight:currentPreflight(),
      releaseGate:{},
      monitor,
      encryptionAvailable:safeStorage.isEncryptionAvailable(),
      logger
    });
    const fieldTest = {
      schema:1,
      generated_at:new Date().toISOString(),
      launcher_version:pkg.version,
      provider:providers?.info?.() || {},
      bridge:bridge?.snapshot?.() || {},
      event_monitor:monitor
    };
    let releaseGate = {};
    try {
      releaseGate = JSON.parse(fs.readFileSync(path.join(__dirname,"reports","release-gate.json"),"utf8"));
    } catch {}
    const bundle = createSupportBundle({
      directory:result.filePaths[0],
      appVersion:pkg.version,
      settings,
      diagnostics,
      fieldTest,
      releaseGate,
      logText:logger?.tail?.(50000) || ""
    });
    shell.showItemInFolder(bundle.folder);
    logger?.info("Support bundle created");
    return bundle;
  });

  ipcMain.handle("launcher:open-logs", async () => {
    const logPath = path.join(app.getPath("userData"), "logs");
    await shell.openPath(logPath);
    return { ok: true };
  });

  ipcMain.handle("launcher:action-ack", async (_event, id) => {
    return bridge.ackActions([String(id || "")]);
  });

  ipcMain.handle("launcher:action-nack", async (_event, input) => {
    return bridge.nackActions([String(input?.id || "")], String(input?.error || "tts_failed"));
  });
}


const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());
}

process.on("uncaughtException", error => {
  logger?.error("Uncaught exception", error?.stack || error?.message || String(error));
});

process.on("unhandledRejection", error => {
  logger?.error("Unhandled rejection", error?.stack || error?.message || String(error));
});

app.whenReady().then(async () => {
  const userData = app.getPath("userData");
  userDataPath=userData;
  settingsPath=path.join(userData,"settings.json");
  spoolPath=path.join(userData,"queue","pending-events.json");
  logger = new Logger(path.join(userData, "logs", "launcher.log"));
  configStore = new ConfigStore(settingsPath, safeStorage, logger);
  eventSpool = new EventSpool(spoolPath, logger, 1000);
  recoveryManager = new RecoveryManager({
    rootDir:path.join(userData,"recovery"),
    settingsPath,
    spoolPath,
    logger,
    maxPoints:6
  });
  liveSessionStore = new LiveSessionStore(path.join(userData,"session","live-session.json"),logger);
  eventMonitor = new EventMonitor({ maxEvents: 200 });
  outputGatePath=path.join(userData,"output-tests","real-world-gate.json");
  outputGateStore=new OutputGateStore(outputGatePath,{version:pkg.version,platform:process.platform});
  streamDeckStore=new StreamDeckStore(path.join(userData,"stream-deck","layout.json"));
  betaSessionStore=new BetaSessionStore(path.join(userData,"beta","active-session.json"));
  mediaSourceStore=new MediaSourceStore(path.join(userData,"cut-studio","media-sources.json"));
  streamCredentialStore=new StreamCredentialStore(path.join(userData,"stream-studio","credentials.json"),safeStorage,logger);
  configureCutMediaEngine();
  configureStreamEngine();
  configureOutputManager();

  const settings = configStore.read();
  if (!settings.machineName) {
    try { configStore.save({ machineName: os.hostname() }); } catch {}
  }

  updates = new UpdateManager({ app, logger });
  updates.on("state", update => send("launcher:state", appState({ update })));

  registerIpc();
  configureDeviceLinkClient();
  await rebuildProvider();
  rebuildBridge();
  if (configStore.getPendingDeviceLink?.()) scheduleDeviceLinkPolling(1200);
  createWindow();
  createTray();
  updates.start(configStore.publicSettings());
  startCloudHealthLoop();
  logger.info(`Launcher ${pkg.version} started`);
});

app.on("activate", showWindow);
app.on("before-quit", event => {
  if (shutdownInProgress) return;
  event.preventDefault();
  quitting = true;
  gracefulShutdown("app_quit").finally(() => {
    shutdownInProgress = true;
    app.exit(0);
  });
});

app.on("window-all-closed", event => {
  if (process.platform !== "darwin") event.preventDefault?.();
});
