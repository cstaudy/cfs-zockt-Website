import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {EventEmitter} from "node:events";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {ConfigStore}=require("../src/config-store.js");
const {BridgeClient}=require("../src/bridge-client.js");
const {OutputWindowManager}=require("../src/output-window-manager.js");
const {planSettingsTransition}=require("../src/runtime-stability.js");

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const logger={info(){},warn(){},error(){}};

// 1) Settings: atomic writes + last-known-good backup fallback.
{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-launcher-settings-"));
  const file=path.join(dir,"settings.json");
  const safeStorage={
    isEncryptionAvailable:()=>true,
    encryptString:value=>Buffer.from(`enc:${value}`,"utf8"),
    decryptString:buffer=>buffer.toString("utf8").replace(/^enc:/,"")
  };
  const store=new ConfigStore(file,safeStorage,logger);
  store.save({machineName:"FIRST",bridgeToken:"cfsb_12345678901234567890"});
  store.save({machineName:"SECOND"});
  if(store.publicSettings().machineName!=="SECOND")throw new Error("settings write failed");
  if(fs.existsSync(`${file}.tmp`))throw new Error("settings tmp file survived successful write");
  if(!fs.existsSync(`${file}.bak`))throw new Error("settings backup missing");
  fs.writeFileSync(file,"{broken-json","utf8");
  if(store.publicSettings().machineName!=="FIRST")throw new Error("settings backup fallback failed");
}

// 2) Settings transitions: runtime-only changes must not restart connections; critical changes are blocked LIVE.
{
  const current={backendUrl:"https://cfs-zockt.de",provider:"mock",machineName:"PC",tiktokUsername:"cfs_zockt"};
  const runtimeOnly=planSettingsTransition({current,input:{ttsVolume:.8,autoStart:true},liveActive:true});
  if(runtimeOnly.criticalChanges.length||runtimeOnly.bridgeCredentialsChanged||runtimeOnly.providerChanged)throw new Error("runtime-only settings classified as connection change");
  let blocked=false;
  try{planSettingsTransition({current,input:{provider:"tiktool"},liveActive:true})}catch(error){blocked=error?.code==="LIVE_SETTINGS_LOCKED"}
  if(!blocked)throw new Error("provider switch was not blocked during LIVE");
  const offline=planSettingsTransition({current,input:{provider:"tiktool",backendUrl:"https://example.test/"},liveActive:false});
  if(!offline.providerChanged||!offline.backendChanged||!offline.bridgeCredentialsChanged)throw new Error("offline settings transition plan failed");
}

// 3) Bridge actions: never overlap polls, otherwise the same leased action can be emitted twice.
{
  const client=new BridgeClient({settings:{backendUrl:"https://example.test",provider:"mock"},token:"token",logger,version:"0.42.0"});
  client.running=true;
  let requests=0,actions=0;
  client.on("action",()=>{actions+=1});
  client.request=async()=>{requests+=1;await wait(60);return{actions:[{id:"action-1"}]}};
  await Promise.all([client.pollActions(),client.pollActions(),client.pollActions()]);
  if(requests!==1||actions!==1)throw new Error(`action poll overlap: requests=${requests}, actions=${actions}`);
  if(client.snapshot().metrics.actionPollSkips!==2)throw new Error("action poll skip metric failed");

  let release;
  client.request=()=>new Promise(resolve=>{release=()=>resolve({actions:[{id:"late-action"}]})});
  const pending=client.pollActions();
  await wait(10);
  client.stop();
  release();
  await pending;
  if(actions!==1)throw new Error("action emitted after bridge stop");
}

// 4) Local output: renderer crashes recover only within a bounded retry window.
{
  class FakeWebContents extends EventEmitter{
    constructor(){super();this.reloads=0}
    setAudioMuted(){}
    setWindowOpenHandler(){}
    reloadIgnoringCache(){this.reloads+=1;this.emit("did-finish-load")}
    async executeJavaScript(){return true}
  }
  class FakeWindow extends EventEmitter{
    static instances=[];
    constructor(options){super();this.options=options;this.webContents=new FakeWebContents();this.destroyed=false;FakeWindow.instances.push(this)}
    setMenuBarVisibility(){}
    setAlwaysOnTop(){}
    async loadURL(){this.webContents.emit("did-finish-load")}
    show(){}
    showInactive(){}
    close(){if(this.destroyed)return;this.destroyed=true;this.emit("closed")}
    isDestroyed(){return this.destroyed}
  }
  const display={id:1,bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1080}};
  const manager=new OutputWindowManager({
    BrowserWindow:FakeWindow,
    screen:{getAllDisplays:()=>[display],getPrimaryDisplay:()=>display},
    logger,
    maxCrashRestarts:2,
    crashWindowMs:5000,
    crashRestartDelayMs:100
  });
  await manager.start({id:"scene",name:"Scene",source_url:"https://cfs-zockt.de/widgets/scene.html#token=cfss_test",published_config:{canvas:{width:1280,height:720},items:[]}});
  const win=FakeWindow.instances.at(-1);
  win.webContents.emit("render-process-gone",{}, {reason:"crashed"});
  await wait(130);
  if(win.webContents.reloads!==1||manager.snapshot().crashed)throw new Error("first renderer recovery failed");
  win.webContents.emit("render-process-gone",{}, {reason:"crashed"});
  await wait(130);
  if(win.webContents.reloads!==2)throw new Error("second renderer recovery failed");
  win.webContents.emit("render-process-gone",{}, {reason:"crashed"});
  await wait(130);
  const snap=manager.snapshot();
  if(win.webContents.reloads!==2||snap.recovering||!snap.crashed||snap.restartCount!==3)throw new Error("renderer recovery retry cap failed");
  await manager.stop();
}

console.log(JSON.stringify({ok:true,checks:4,launcher_version:"0.42.0",areas:["settings_atomicity","live_settings_guard","action_poll_serialization","output_crash_recovery"]}));
