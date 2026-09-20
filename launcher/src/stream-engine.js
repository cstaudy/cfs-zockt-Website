const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");
const { buildNativeSceneGraph, compileSceneVideoFilters, compileNativeVideoFilters, graphSummary } = require("./native-scene-graph");
const { SceneFrameBusManager, frameSizeFor } = require("./scene-frame-bus");

const PROFILE_MAP = Object.freeze({
  "1080p60":{width:1920,height:1080,fps:60},
  "1080p30":{width:1920,height:1080,fps:30},
  "720p60":{width:1280,height:720,fps:60},
  "vertical1080p60":{width:1080,height:1920,fps:60}
});
const ENCODER_MAP = Object.freeze({software:"libx264",nvenc:"h264_nvenc",amd:"h264_amf",qsv:"h264_qsv"});
const RECONNECT_DELAYS = [1500, 3000, 6000, 12000, 20000, 30000];
const AUDIO_SOURCE_KEYS = Object.freeze(["mic","game","discord","music","alerts"]);
const AUDIO_SOURCE_TITLES = Object.freeze({mic:"Mic",game:"Game",discord:"Discord",music:"Music",alerts:"Alerts"});

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}
function safeText(value, max = 240) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max); }
function cleanDeviceName(value) {
  const text = safeText(value, 220);
  if (!text) return "";
  if (/[\r\n\0]/.test(text)) throw new Error("Ungültiger Gerätename.");
  return text;
}
function escapeDshowName(value) { return cleanDeviceName(value).replace(/\\/g,"\\\\").replace(/"/g,'\\"'); }
function escapeGdiTitle(value) { return safeText(value, 220).replace(/\r|\n/g," "); }
function outputUrl(serverUrl, streamKey) { return `${String(serverUrl).replace(/\/+$/, "")}/${String(streamKey).replace(/^\/+/, "")}`; }
function redactSecrets(text, secrets = []) {
  let result = String(text || "");
  for (const secret of secrets.filter(Boolean).sort((a,b)=>String(b).length-String(a).length)) result = result.split(String(secret)).join("[REDACTED]");
  return result;
}
function profileFor(value) { return PROFILE_MAP[value] || PROFILE_MAP["1080p60"]; }
const SCENE_TRANSITION_TYPES = Object.freeze(new Set(["cut","fade","dissolve","slide_left","slide_right","slide_up","zoom"]));
const SCENE_XFADE_MAP = Object.freeze({fade:"fade",dissolve:"dissolve",slide_left:"slideleft",slide_right:"slideright",slide_up:"slideup",zoom:"zoomin"});
function normalizeSceneTransition(input={}) {
  const source=input&&typeof input==="object"?input:{};
  const type=SCENE_TRANSITION_TYPES.has(String(source.type||""))?String(source.type):"cut";
  const raw=Number(source.duration_ms??source.durationMs);
  const durationMs=type==="cut"?0:clamp(Number.isFinite(raw)?raw:350,120,2500,350);
  return{type,durationMs,easing:safeText(source.easing||"smooth",32)||"smooth"};
}

class StreamEngine extends EventEmitter {
  constructor({logger=null, resourcesPath="", videosPath="", platform=process.platform, env=process.env, spawnFn=spawn, widgetFrameSourceManager=null, applicationAudioSourceManager=null, gameCaptureSourceManager=null, sceneFrameBusManager=null}={}) {
    super();
    this.logger=logger;
    this.resourcesPath=resourcesPath;
    this.videosPath=videosPath;
    this.platform=platform;
    this.env=env;
    this.spawnFn=spawnFn;
    this.widgetFrameSourceManager=widgetFrameSourceManager;
    this.applicationAudioSourceManager=applicationAudioSourceManager;
    this.gameCaptureSourceManager=gameCaptureSourceManager;
    this.sceneFrameBusManager=sceneFrameBusManager||new SceneFrameBusManager({logger});
    this.sceneBusMeta=new Map();
    this.sceneSwitchInFlight=null;
    this.sceneBusRecoveryTimers=new Map();
    this.sceneFrameBusManager?.on?.("producer-lost",event=>this.scheduleSceneBusRecovery(event));
    this.ffmpegPath="";
    this.capabilities={gdigrab:false,dshow:false,processLoopback:false,gameCaptureWgc:false,xfade:false,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
    this.processes=new Map();
    this.reconnectTimers=new Map();
    this.watchdogTimers=new Map();
    this.pausedTargets=new Set();
    this.lastProgressEmitAt=0;
    this.desiredRunning=false;
    this.lastStartInput=null;
    this.state={status:"idle",available:false,checkedAt:null,error:"",startedAt:null,stoppedAt:null,capture:null,recording:null,destinations:{},metrics:{active:0,errors:0,reconnects:0,watchdogRestarts:0,droppedFrames:0,sceneSwitches:0,sceneSwitchFailures:0,sceneTransitions:0,sceneTransitionFallbacks:0},sceneRuntime:{mode:"legacy",sceneId:"",sceneName:"",lastSwitchAt:null,lastSwitchMs:0,lastSwitchSource:"",lastTransition:null,buses:[]}};
  }

  candidates() {
    const exe=this.platform==="win32"?"ffmpeg.exe":"ffmpeg";
    const list=[];
    if(this.env.CFS_FFMPEG_PATH)list.push({path:String(this.env.CFS_FFMPEG_PATH),source:"env"});
    if(this.resourcesPath)list.push({path:path.join(this.resourcesPath,"ffmpeg",exe),source:"bundled"});
    list.push({path:exe,source:"path"});
    return list;
  }

  runProbe(file,args,timeoutMs=7000) {
    return new Promise((resolve,reject)=>{
      let stdout="",stderr="",settled=false;
      let child;
      try{child=this.spawnFn(file,args,{windowsHide:true,stdio:["ignore","pipe","pipe"]});}catch(error){reject(error);return}
      child.stdout?.on?.("data",chunk=>{stdout+=String(chunk).slice(0,100000)});
      child.stderr?.on?.("data",chunk=>{stderr+=String(chunk).slice(0,200000)});
      const timer=setTimeout(()=>{if(settled)return;settled=true;try{child.kill()}catch{};reject(new Error("FFmpeg Probe Timeout"));},timeoutMs);
      child.once("error",error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error)});
      child.once("close",code=>{if(settled)return;settled=true;clearTimeout(timer);if(code===0)resolve({stdout,stderr});else reject(Object.assign(new Error(`FFmpeg Probe Exit ${code}`),{stdout,stderr,code}))});
    });
  }

  async probe() {
    let lastError="";
    for(const candidate of this.candidates()){
      try{
        const version=await this.runProbe(candidate.path,["-hide_banner","-version"],5000);
        const devices=await this.runProbe(candidate.path,["-hide_banner","-devices"],5000).catch(()=>({stdout:"",stderr:""}));
        const encoders=await this.runProbe(candidate.path,["-hide_banner","-encoders"],5000).catch(()=>({stdout:"",stderr:""}));
        const filters=await this.runProbe(candidate.path,["-hide_banner","-filters"],5000).catch(()=>({stdout:"",stderr:""}));
        const deviceText=`${devices.stdout}\n${devices.stderr}`;
        const encoderText=`${encoders.stdout}\n${encoders.stderr}`;
        const filterText=`${filters.stdout}\n${filters.stderr}`;
        this.ffmpegPath=candidate.path;
        const appAudioProbe=this.applicationAudioSourceManager?.probeRuntime?await this.applicationAudioSourceManager.probeRuntime():this.applicationAudioSourceManager?.probe?.()||{available:false};
        const gameCaptureProbe=this.gameCaptureSourceManager?.probeRuntime?await this.gameCaptureSourceManager.probeRuntime():this.gameCaptureSourceManager?.probe?.()||{available:false};
        this.capabilities={
          gdigrab:/\bgdigrab\b/i.test(deviceText),
          dshow:/\bdshow\b/i.test(deviceText),
          processLoopback:appAudioProbe.available===true,
          gameCaptureWgc:gameCaptureProbe.available===true&&gameCaptureProbe.runtimeVerified!==false,
          xfade:/\bxfade\b/i.test(filterText),
          encoders:{
            software:/\blibx264\b/i.test(encoderText),
            nvenc:/\bh264_nvenc\b/i.test(encoderText),
            amd:/\bh264_amf\b/i.test(encoderText),
            qsv:/\bh264_qsv\b/i.test(encoderText)
          }
        };
        this.state={...this.state,available:true,checkedAt:new Date().toISOString(),error:"",ffmpegPath:candidate.path,ffmpegSource:candidate.source,version:safeText((version.stdout||version.stderr).split(/\r?\n/)[0],200),capabilities:this.capabilities};
        return this.snapshot();
      }catch(error){lastError=String(error?.message||error)}
    }
    this.ffmpegPath="";
    this.state={...this.state,available:false,checkedAt:new Date().toISOString(),error:`FFmpeg ist nicht verfügbar: ${lastError||"nicht gefunden"}`,ffmpegPath:"",ffmpegSource:"",capabilities:this.capabilities};
    return this.snapshot();
  }

  async listWindowsAudioDevices() {
    if(this.platform!=="win32")return [];
    if(!this.ffmpegPath){const p=await this.probe();if(!p.available)return []}
    try{
      const result=await this.runProbe(this.ffmpegPath,["-hide_banner","-list_devices","true","-f","dshow","-i","dummy"],5000);
      return this.parseDshowDevices(`${result.stdout}\n${result.stderr}`);
    }catch(error){return this.parseDshowDevices(`${error?.stdout||""}\n${error?.stderr||""}`)}
  }

  parseDshowDevices(text) {
    const out=[]; let section="";
    for(const line of String(text||"").split(/\r?\n/)){
      if(/DirectShow video devices/i.test(line))section="video";
      if(/DirectShow audio devices/i.test(line))section="audio";
      const m=line.match(/\]\s+"([^"]+)"\s*$/);
      if(m&&section)out.push({type:section,name:m[1]});
    }
    return out.filter((item,index,array)=>array.findIndex(x=>x.type===item.type&&x.name===item.name)===index);
  }

  resolveEncoder(requested="auto") {
    const wanted=String(requested||"auto");
    const caps=this.capabilities.encoders||{};
    if(wanted!=="auto"){
      if(wanted==="software"&&caps.software!==false)return "software";
      if(caps[wanted])return wanted;
      throw new Error(`Der gewählte Encoder ${wanted.toUpperCase()} ist in diesem FFmpeg-Build nicht verfügbar.`);
    }
    if(caps.nvenc)return "nvenc";
    if(caps.amd)return "amd";
    if(caps.qsv)return "qsv";
    return "software";
  }

  buildCaptureArgs(input={}) {
    if(this.platform!=="win32")throw new Error("Pass 21.10 Capture ist zunächst für Windows vorbereitet.");
    const type=["screen","window","game","camera"].includes(input.type)?input.type:"screen";
    const fps=clamp(input.fps,15,60,60);
    const args=[];
    const primary=cleanDeviceName(input.audioDevice);
    const secondary=cleanDeviceName(input.audioDevice2);
    if(primary&&secondary&&primary===secondary)throw new Error("Audio 1 und Audio 2 dürfen nicht dasselbe Gerät verwenden.");
    const audioInputs=[];
    if(type==="camera"){
      const videoDevice=cleanDeviceName(input.videoDevice);
      if(!videoDevice)throw new Error("Für Kamera-Capture fehlt das Videogerät.");
      const selector=primary?`video=${escapeDshowName(videoDevice)}:audio=${escapeDshowName(primary)}`:`video=${escapeDshowName(videoDevice)}`;
      args.push("-f","dshow","-framerate",String(fps),"-i",selector);
      if(primary)audioInputs.push({index:0,device:primary,volume:Number(input.audioVolume??1),muted:input.audioMuted===true,delayMs:Number(input.audioDelayMs??0),bus:"audio1"});
      if(secondary){args.push("-f","dshow","-i",`audio=${escapeDshowName(secondary)}`);audioInputs.push({index:1,device:secondary,volume:Number(input.audioVolume2??1),muted:input.audioMuted2===true,delayMs:Number(input.audioDelayMs2??0),bus:"audio2"});}
      return {args,hasAudio:audioInputs.length>0,audioInputs,type,fps,inputCount:1+(secondary?1:0)};
    }
    if(type==="window"||type==="game"){
      const title=escapeGdiTitle(input.windowTitle);
      if(!title)throw new Error(type==="game"?"Für Game-Capture fehlt die lokale Prozess-/Fensterbindung.":"Für Fenster-Capture fehlt der Fenstertitel.");
      args.push("-f","gdigrab","-framerate",String(fps),"-draw_mouse",input.drawMouse===false?"0":"1","-i",`title=${title}`);
    }else{
      args.push("-f","gdigrab","-framerate",String(fps),"-draw_mouse",input.drawMouse===false?"0":"1");
      if(input.region&&Number.isFinite(Number(input.region.width))&&Number.isFinite(Number(input.region.height))){
        const width=clamp(input.region.width,64,7680,1920),height=clamp(input.region.height,64,4320,1080);
        const x=clamp(input.region.x,-10000,10000,0),y=clamp(input.region.y,-10000,10000,0);
        args.push("-offset_x",String(x),"-offset_y",String(y),"-video_size",`${width}x${height}`);
      }
      args.push("-i","desktop");
    }
    if(primary){args.push("-f","dshow","-i",`audio=${escapeDshowName(primary)}`);audioInputs.push({index:1,device:primary,volume:Number(input.audioVolume??1),muted:input.audioMuted===true,delayMs:Number(input.audioDelayMs??0),bus:"audio1"});}
    if(secondary){const index=1+audioInputs.length;args.push("-f","dshow","-i",`audio=${escapeDshowName(secondary)}`);audioInputs.push({index,device:secondary,volume:Number(input.audioVolume2??1),muted:input.audioMuted2===true,delayMs:Number(input.audioDelayMs2??0),bus:"audio2"});}
    return {args,hasAudio:audioInputs.length>0,audioInputs,type,fps,inputCount:1+audioInputs.length};
  }

  buildWidgetPipeInputs(graph,startInputIndex=0,startFd=3) {
    const args=[],inputIndexByNodeId={},widgetPipes=[];
    let inputIndex=Math.max(0,Number(startInputIndex)||0),fd=Math.max(3,Number(startFd)||3);
    const byKey=new Map();
    for(const source of graph?.widgetSources||[]){
      const key=String(source?.key||"");if(!key||byKey.has(key))continue;
      const width=clamp(source.width,32,4096,600),height=clamp(source.height,32,4096,120),fps=clamp(source.fps,1,30,30);
      args.push("-f","rawvideo","-pixel_format","bgra","-video_size",`${width}x${height}`,"-framerate",String(fps),"-i",`pipe:${fd}`);
      byKey.set(key,inputIndex);widgetPipes.push({fd,key,width,height,fps});inputIndex+=1;fd+=1;
    }
    for(const node of graph?.widgetNodes||[]){const index=byKey.get(String(node.widgetSourceKey||""));if(Number.isInteger(index))inputIndexByNodeId[node.id]=index}
    return{args,inputIndexByNodeId,widgetPipes,nextInputIndex:inputIndex,nextFd:fd};
  }

  buildGameCapturePipeInputs(graph,capture={},startInputIndex=0,startFd=3,fpsOverride=0) {
    const args=[],inputIndexByNodeId={},gamePipes=[];
    let inputIndex=Math.max(0,Number(startInputIndex)||0),fd=Math.max(3,Number(startFd)||3);
    const gameNodes=(graph?.nativeNodes||[]).filter(node=>node?.nativeType==="game"),byKey=new Map();
    if(!gameNodes.length)return{args,inputIndexByNodeId,gamePipes,nextInputIndex:inputIndex,nextFd:fd};
    const processId=clamp(capture.gameProcessId,1,0x7fffffff,0),processName=safeText(capture.gameProcessName,160),fps=clamp(fpsOverride||profileFor(graph?.profile||"1080p60").fps,15,60,60);
    if(this.capabilities.gameCaptureWgc!==true||!processId)return{args,inputIndexByNodeId,gamePipes,nextInputIndex:inputIndex,nextFd:fd};
    for(const node of gameNodes){
      const width=clamp(node.sourceWidth,64,3840,1920),height=clamp(node.sourceHeight,64,2160,1080),sourceKey=String(node.sourceId||node.id),key=`game:${sourceKey}:${processName||processId}:${width}x${height}@${fps}`;
      if(byKey.has(key)){inputIndexByNodeId[node.id]=byKey.get(key);continue}
      args.push("-f","rawvideo","-pixel_format","bgra","-video_size",`${width}x${height}`,"-framerate",String(fps),"-i",`pipe:${fd}`);
      byKey.set(key,inputIndex);inputIndexByNodeId[node.id]=inputIndex;gamePipes.push({fd,key,processId,processName,width,height,fps,cursor:capture.drawMouse!==false});inputIndex+=1;fd+=1;
    }
    return{args,inputIndexByNodeId,gamePipes,nextInputIndex:inputIndex,nextFd:fd};
  }

  buildLegacyGameCaptureWithAudio(capture={},fps=60,startFd=3) {
    if(this.capabilities.gameCaptureWgc!==true||!clamp(capture.gameProcessId,1,0x7fffffff,0))return null;
    const processId=clamp(capture.gameProcessId,1,0x7fffffff,0),processName=safeText(capture.gameProcessName,160),width=clamp(capture.gameWidth,64,3840,1920),height=clamp(capture.gameHeight,64,2160,1080),fd=Math.max(3,Number(startFd)||3),key=`game:primary:${processName||processId}:${width}x${height}@${clamp(fps,15,60,60)}`;
    const args=["-f","rawvideo","-pixel_format","bgra","-video_size",`${width}x${height}`,"-framerate",String(clamp(fps,15,60,60)),"-i",`pipe:${fd}`];
    let inputIndex=1,nextFd=fd+1;const audioInputs=[],gamePipes=[{fd,key,processId,processName,width,height,fps:clamp(fps,15,60,60),cursor:capture.drawMouse!==false}];
    if(this.hasStructuredAudioSources(capture)){const audio=this.buildStructuredAudioInputs(capture,inputIndex,nextFd);return{args:[...args,...audio.args],audioInputs:audio.audioInputs,hasAudio:audio.hasAudio,inputCount:audio.nextInputIndex,audioPipes:audio.audioPipes,gamePipes,nextFd:audio.nextFd,type:"game",fps:clamp(fps,15,60,60)}}
    const primary=cleanDeviceName(capture.audioDevice),secondary=cleanDeviceName(capture.audioDevice2);if(primary&&secondary&&primary===secondary)throw new Error("Audio 1 und Audio 2 dürfen nicht dasselbe Gerät verwenden.");
    if(primary){args.push("-f","dshow","-i",`audio=${escapeDshowName(primary)}`);audioInputs.push({index:inputIndex++,device:primary,volume:Number(capture.audioVolume??1),muted:capture.audioMuted===true,delayMs:Number(capture.audioDelayMs??0),bus:"audio1"})}
    if(secondary){args.push("-f","dshow","-i",`audio=${escapeDshowName(secondary)}`);audioInputs.push({index:inputIndex++,device:secondary,volume:Number(capture.audioVolume2??1),muted:capture.audioMuted2===true,delayMs:Number(capture.audioDelayMs2??0),bus:"audio2"})}
    return{args,audioInputs,hasAudio:audioInputs.length>0,inputCount:inputIndex,audioPipes:[],gamePipes,nextFd,type:"game",fps:clamp(fps,15,60,60)};
  }

  hasStructuredAudioSources(capture={}) {
    return Boolean(capture?.audioSources&&typeof capture.audioSources==="object"&&!Array.isArray(capture.audioSources));
  }

  buildStructuredAudioInputs(capture={},startInputIndex=0,startFd=3) {
    const sourceMap=this.hasStructuredAudioSources(capture)?capture.audioSources:{};
    const args=[],audioInputs=[],audioPipes=[];let inputIndex=Math.max(0,Number(startInputIndex)||0),fd=Math.max(3,Number(startFd)||3);
    const usedProcesses=new Set();
    for(const key of AUDIO_SOURCE_KEYS){
      const raw=sourceMap?.[key];if(!raw||raw.enabled===false)continue;
      const volume=Math.max(0,Math.min(2,Number.isFinite(Number(raw.volume))?Number(raw.volume):1)),muted=raw.muted===true,delayMs=clamp(raw.delayMs,0,2000,0);
      if(key==="mic"){
        const device=cleanDeviceName(raw.deviceName||raw.device||"");if(!device)continue;
        args.push("-f","dshow","-i",`audio=${escapeDshowName(device)}`);
        audioInputs.push({index:inputIndex++,device,volume,muted,delayMs,bus:key,key,title:AUDIO_SOURCE_TITLES[key],kind:"device"});
        continue;
      }
      const processId=clamp(raw.processId,1,0x7fffffff,0);if(!processId)continue;
      if(usedProcesses.has(processId))throw new Error("Dieselbe Anwendung darf nicht gleichzeitig mehreren Application-Audio-Bussen zugeordnet sein.");
      usedProcesses.add(processId);
      const processName=safeText(raw.processName,160);
      args.push("-f","s16le","-ar","48000","-ac","2","-i",`pipe:${fd}`);
      audioPipes.push({fd,key,processId,processName,includeTree:raw.includeTree!==false});
      audioInputs.push({index:inputIndex++,device:processName||`PID ${processId}`,processId,volume,muted,delayMs,bus:key,key,title:AUDIO_SOURCE_TITLES[key],kind:"process"});fd+=1;
    }
    return{args,audioInputs,audioPipes,hasAudio:audioInputs.length>0,nextInputIndex:inputIndex,nextFd:fd};
  }

  buildCaptureWithAudio(capture={},fps=60,startFd=3) {
    if(String(capture?.type||"")==="game"){
      const native=this.buildLegacyGameCaptureWithAudio(capture,fps,startFd);if(native)return native;
    }
    if(!this.hasStructuredAudioSources(capture))return{...this.buildCaptureArgs({...capture,fps}),audioPipes:[],gamePipes:[]};
    const visual=this.buildCaptureArgs({...capture,fps,audioDevice:"",audioDevice2:""});
    const audio=this.buildStructuredAudioInputs(capture,visual.inputCount||1,startFd);
    return{...visual,args:[...visual.args,...audio.args],audioInputs:audio.audioInputs,hasAudio:audio.hasAudio,inputCount:audio.nextInputIndex,audioPipes:audio.audioPipes,gamePipes:[],nextFd:audio.nextFd};
  }

  buildSceneCaptureArgs({scene={},capture={},profile="1080p60",mode="live"}={}) {
    if(this.platform!=="win32")throw new Error("Der lokale Scene Graph ist zunächst für Windows vorbereitet.");
    const graph=buildNativeSceneGraph(scene,{profile,mode});
    if(!graph.canComposeLocally)return {active:false,graph,args:[],audioInputs:[],hasAudio:false,inputIndexByNodeId:{},widgetPipes:[],gamePipes:[],inputCount:0,fps:profileFor(profile).fps,baseMode:"legacy",baseInputIndex:0,baseCrop:null};
    const fps=profileFor(profile).fps;
    if(graph.mode==="web_overlay"){
      const useNativeGame=String(capture?.type||"")==="game"&&this.capabilities.gameCaptureWgc===true&&clamp(capture.gameProcessId,1,0x7fffffff,0);
      if(useNativeGame){
        const processId=clamp(capture.gameProcessId,1,0x7fffffff,0),processName=safeText(capture.gameProcessName,160),width=clamp(capture.gameWidth,64,3840,1920),height=clamp(capture.gameHeight,64,2160,1080),fd=3,key=`game:primary:${processName||processId}:${width}x${height}@${fps}`;
        const baseArgs=["-f","rawvideo","-pixel_format","bgra","-video_size",`${width}x${height}`,"-framerate",String(fps),"-i",`pipe:${fd}`],gamePipes=[{fd,key,processId,processName,width,height,fps,cursor:capture.drawMouse!==false}];
        const widgets=this.buildWidgetPipeInputs(graph,1,fd+1),audio=this.buildAudioOnlyInputs(capture,widgets.nextInputIndex,widgets.nextFd);
        return{active:true,graph,args:[...baseArgs,...widgets.args,...audio.args],audioInputs:audio.audioInputs,hasAudio:audio.hasAudio,inputIndexByNodeId:widgets.inputIndexByNodeId,widgetPipes:widgets.widgetPipes,gamePipes,audioPipes:audio.audioPipes||[],inputCount:Number(audio.nextInputIndex??widgets.nextInputIndex??1),fps,baseMode:"capture",baseInputIndex:0,baseCrop:capture.crop||null};
      }
      const structured=this.hasStructuredAudioSources(capture);
      const legacy=this.buildCaptureArgs({...capture,fps,...(structured?{audioDevice:"",audioDevice2:""}:{})});
      const widgets=this.buildWidgetPipeInputs(graph,legacy.inputCount||1,3);
      const audio=structured?this.buildStructuredAudioInputs(capture,widgets.nextInputIndex,widgets.nextFd):{args:[],audioInputs:legacy.audioInputs,hasAudio:legacy.hasAudio,audioPipes:[],nextInputIndex:widgets.nextInputIndex,nextFd:widgets.nextFd};
      return{active:true,graph,args:[...legacy.args,...widgets.args,...audio.args],audioInputs:audio.audioInputs,hasAudio:audio.hasAudio,inputIndexByNodeId:widgets.inputIndexByNodeId,widgetPipes:widgets.widgetPipes,gamePipes:[],audioPipes:audio.audioPipes||[],inputCount:Number(audio.nextInputIndex??widgets.nextInputIndex??legacy.inputCount??1),fps,baseMode:"capture",baseInputIndex:0,baseCrop:capture.crop||null};
    }
    const args=[];
    const bg=/^#[0-9a-f]{6}$/i.test(String(graph.canvas?.background||""))?`0x${String(graph.canvas.background).slice(1)}`:"black";
    args.push("-re","-f","lavfi","-i",`color=c=${bg}:s=${graph.canvas.width}x${graph.canvas.height}:r=${fps}`);
    let inputIndex=1,nextFd=3;
    const sourceInputs=new Map(),inputIndexByNodeId={},gamePipes=[];
    const primary=cleanDeviceName(capture.audioDevice),secondary=cleanDeviceName(capture.audioDevice2);
    if(primary&&secondary&&primary===secondary)throw new Error("Audio 1 und Audio 2 dürfen nicht dasselbe Gerät verwenden.");
    for(const node of graph.nativeNodes){
      const sourceKey=String(node.sourceId||node.id);
      if(sourceInputs.has(sourceKey)){inputIndexByNodeId[node.id]=sourceInputs.get(sourceKey);continue}
      const type=node.nativeType;
      if(type==="screen"){
        args.push("-f","gdigrab","-framerate",String(fps),"-draw_mouse",capture.drawMouse===false?"0":"1");
        if(capture.region&&Number.isFinite(Number(capture.region.width))&&Number.isFinite(Number(capture.region.height))){
          const width=clamp(capture.region.width,64,7680,1920),height=clamp(capture.region.height,64,4320,1080),x=clamp(capture.region.x,-10000,10000,0),y=clamp(capture.region.y,-10000,10000,0);
          args.push("-offset_x",String(x),"-offset_y",String(y),"-video_size",`${width}x${height}`);node.sourceWidth=width;node.sourceHeight=height;
        }
        args.push("-i","desktop");
      }else if(type==="window"){
        const title=escapeGdiTitle(capture.windowTitle);
        if(!title)throw new Error("Für die Fenster-Quelle fehlt das lokale Fenster-Binding.");
        args.push("-f","gdigrab","-framerate",String(fps),"-draw_mouse",capture.drawMouse===false?"0":"1","-i",`title=${title}`);
      }else if(type==="game"){
        const processId=clamp(capture.gameProcessId,1,0x7fffffff,0),processName=safeText(capture.gameProcessName,160);
        if(this.capabilities.gameCaptureWgc===true&&processId){
          const width=clamp(node.sourceWidth,64,3840,1920),height=clamp(node.sourceHeight,64,2160,1080),key=`game:${sourceKey}:${processName||processId}:${width}x${height}@${fps}`;
          args.push("-f","rawvideo","-pixel_format","bgra","-video_size",`${width}x${height}`,"-framerate",String(fps),"-i",`pipe:${nextFd}`);
          gamePipes.push({fd:nextFd,key,processId,processName,width,height,fps,cursor:capture.drawMouse!==false});nextFd+=1;
        }else{
          const title=escapeGdiTitle(capture.windowTitle);
          if(!title)throw new Error("Für Game Capture fehlt eine lokale Spiel-Prozessbindung. Wähle im Launcher das laufende Spiel aus.");
          args.push("-f","gdigrab","-framerate",String(fps),"-draw_mouse",capture.drawMouse===false?"0":"1","-i",`title=${title}`);
        }
      }else if(type==="camera"){
        const videoDevice=cleanDeviceName(capture.videoDevice);
        if(!videoDevice)throw new Error("Für die Kamera-Quelle fehlt das lokale Videogerät.");
        args.push("-f","dshow","-framerate",String(fps),"-i",`video=${escapeDshowName(videoDevice)}`);
      }else continue;
      sourceInputs.set(sourceKey,inputIndex);inputIndexByNodeId[node.id]=inputIndex;inputIndex+=1;
    }
    const structured=this.hasStructuredAudioSources(capture),audioInputs=[];
    if(!structured&&primary){args.push("-f","dshow","-i",`audio=${escapeDshowName(primary)}`);audioInputs.push({index:inputIndex++,device:primary,volume:Number(capture.audioVolume??1),muted:capture.audioMuted===true,delayMs:Number(capture.audioDelayMs??0),bus:"audio1",key:"audio1",title:"Audio 1"});}
    if(!structured&&secondary){args.push("-f","dshow","-i",`audio=${escapeDshowName(secondary)}`);audioInputs.push({index:inputIndex++,device:secondary,volume:Number(capture.audioVolume2??1),muted:capture.audioMuted2===true,delayMs:Number(capture.audioDelayMs2??0),bus:"audio2",key:"audio2",title:"Audio 2"});}
    const widgets=this.buildWidgetPipeInputs(graph,inputIndex,nextFd);Object.assign(inputIndexByNodeId,widgets.inputIndexByNodeId);
    const structuredAudio=structured?this.buildStructuredAudioInputs(capture,widgets.nextInputIndex,widgets.nextFd):{args:[],audioInputs,hasAudio:audioInputs.length>0,audioPipes:[],nextInputIndex:widgets.nextInputIndex};
    return {active:true,graph,args:[...args,...widgets.args,...structuredAudio.args],audioInputs:structuredAudio.audioInputs,hasAudio:structuredAudio.hasAudio,inputIndexByNodeId,widgetPipes:widgets.widgetPipes,gamePipes,audioPipes:structuredAudio.audioPipes||[],inputCount:Number(structuredAudio.nextInputIndex??widgets.nextInputIndex??inputIndex),fps,baseMode:"canvas",baseInputIndex:0,baseCrop:null};
  }

  buildNativeSceneCaptureArgs(options={}) { return this.buildSceneCaptureArgs(options); }

  sceneBusKey(profile="1080p60",mode="live") { return `${mode==="recording"?"recording":"live"}:${safeText(profile,40)||"1080p60"}`; }

  videoOnlyCapture(capture={}) {
    return {...capture,audioDevice:"",audioDevice2:"",audioSources:{}};
  }

  buildSceneComposerArgs({scene={},capture={},profile="1080p60",mode="live"}={}) {
    const sceneCap=this.buildSceneCaptureArgs({scene,capture:this.videoOnlyCapture(capture),profile,mode});
    if(!sceneCap.active||!sceneCap.graph?.canComposeLocally)throw new Error("Diese Scene kann nicht lokal in den Hot-Switch-Compositor übernommen werden.");
    const video=compileSceneVideoFilters(sceneCap.graph,sceneCap.inputIndexByNodeId,{baseMode:sceneCap.baseMode,baseInputIndex:sceneCap.baseInputIndex,baseCrop:sceneCap.baseCrop});
    if(!video.videoLabel)throw new Error("Scene-Compositor konnte keinen Video-Ausgang erzeugen.");
    const p=profileFor(profile),bus={key:this.sceneBusKey(profile,mode),width:p.width,height:p.height,fps:p.fps,pixelFormat:"yuv420p",profile,mode:mode==="recording"?"recording":"live",sceneGraph:graphSummary(sceneCap.graph)};
    const scale=`[${video.videoLabel}]scale=${p.width}:${p.height}:force_original_aspect_ratio=decrease,pad=${p.width}:${p.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[cfs_bus_v]`;
    return{args:["-hide_banner","-loglevel","warning","-stats",...sceneCap.args,"-filter_complex",[...video.filters,scale].join(";"),"-map","[cfs_bus_v]","-an","-r",String(p.fps),"-pix_fmt","yuv420p","-f","rawvideo","pipe:1"],widgetPipes:sceneCap.widgetPipes||[],gamePipes:sceneCap.gamePipes||[],graph:sceneCap.graph,bus};
  }

  createSceneTransitionSnapshot(frame,bus={}) {
    const width=clamp(bus.width,320,7680,1920),height=clamp(bus.height,180,4320,1080),expected=frameSizeFor(width,height,"yuv420p");
    if(!Buffer.isBuffer(frame)||frame.length!==expected)throw new Error("Scene Transition Snapshot besitzt keine vollständige YUV420P-Framegröße.");
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-scene-transition-")),file=path.join(dir,"from.yuv");
    fs.writeFileSync(file,frame,{mode:0o600});
    let cleaned=false;
    return{file,cleanup:()=>{if(cleaned)return;cleaned=true;try{fs.rmSync(dir,{recursive:true,force:true})}catch{}}};
  }

  buildSceneTransitionComposerArgs({scene={},capture={},profile="1080p60",mode="live",transition={},fromFrame=null}={}) {
    const requested=normalizeSceneTransition(transition);
    if(requested.type==="cut"||this.capabilities.xfade!==true){const built=this.buildSceneComposerArgs({scene,capture,profile,mode});return{...built,transition:{requestedType:requested.type,effectiveType:"cut",durationMs:0,easing:requested.easing,fallback:requested.type!=="cut"?"xfade_unavailable":""}}}
    const effect=SCENE_XFADE_MAP[requested.type];if(!effect){const built=this.buildSceneComposerArgs({scene,capture,profile,mode});return{...built,transition:{requestedType:requested.type,effectiveType:"cut",durationMs:0,easing:requested.easing,fallback:"transition_unsupported"}}}
    const sceneCap=this.buildSceneCaptureArgs({scene,capture:this.videoOnlyCapture(capture),profile,mode});
    if(!sceneCap.active||!sceneCap.graph?.canComposeLocally)throw new Error("Diese Scene kann nicht lokal in den Transition-Compositor übernommen werden.");
    const video=compileSceneVideoFilters(sceneCap.graph,sceneCap.inputIndexByNodeId,{baseMode:sceneCap.baseMode,baseInputIndex:sceneCap.baseInputIndex,baseCrop:sceneCap.baseCrop});
    if(!video.videoLabel)throw new Error("Scene-Transition konnte keinen Video-Ausgang erzeugen.");
    const p=profileFor(profile),bus={key:this.sceneBusKey(profile,mode),width:p.width,height:p.height,fps:p.fps,pixelFormat:"yuv420p",profile,mode:mode==="recording"?"recording":"live",sceneGraph:graphSummary(sceneCap.graph)};
    const snapshot=this.createSceneTransitionSnapshot(fromFrame,bus),oldIndex=Math.max(0,Number(sceneCap.inputCount)||0),durationSec=(requested.durationMs/1000).toFixed(3);
    const newChain=`[${video.videoLabel}]fps=${p.fps},scale=${p.width}:${p.height}:force_original_aspect_ratio=decrease,pad=${p.width}:${p.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,settb=1/${p.fps},format=yuv420p[cfs_new_v]`;
    const oldChain=`[${oldIndex}:v]fps=${p.fps},scale=${p.width}:${p.height},setsar=1,settb=1/${p.fps},format=yuv420p[cfs_old_v]`;
    const xfade=`[cfs_old_v][cfs_new_v]xfade=transition=${effect}:duration=${durationSec}:offset=0,format=yuv420p[cfs_bus_v]`;
    const oldInput=["-r",String(p.fps),"-stream_loop","-1","-f","rawvideo","-pixel_format","yuv420p","-video_size",`${p.width}x${p.height}`,"-i",snapshot.file];
    return{args:["-hide_banner","-loglevel","warning","-stats",...sceneCap.args,...oldInput,"-filter_complex",[...video.filters,newChain,oldChain,xfade].join(";"),"-map","[cfs_bus_v]","-an","-r",String(p.fps),"-pix_fmt","yuv420p","-f","rawvideo","pipe:1"],widgetPipes:sceneCap.widgetPipes||[],gamePipes:sceneCap.gamePipes||[],graph:sceneCap.graph,bus,cleanupFns:[snapshot.cleanup],transition:{requestedType:requested.type,effectiveType:requested.type,durationMs:requested.durationMs,easing:requested.easing,effect,fallback:""}};
  }

  buildAudioOnlyInputs(capture={},startInputIndex=1,startFd=4) {
    if(this.hasStructuredAudioSources(capture))return this.buildStructuredAudioInputs(capture,startInputIndex,startFd);
    const args=[],audioInputs=[];let inputIndex=Math.max(0,Number(startInputIndex)||0);
    const primary=cleanDeviceName(capture.audioDevice),secondary=cleanDeviceName(capture.audioDevice2);
    if(primary&&secondary&&primary===secondary)throw new Error("Audio 1 und Audio 2 dürfen nicht dasselbe Gerät verwenden.");
    if(primary){args.push("-f","dshow","-i",`audio=${escapeDshowName(primary)}`);audioInputs.push({index:inputIndex++,device:primary,volume:Number(capture.audioVolume??1),muted:capture.audioMuted===true,delayMs:Number(capture.audioDelayMs??0),bus:"audio1",key:"audio1",title:"Audio 1"});}
    if(secondary){args.push("-f","dshow","-i",`audio=${escapeDshowName(secondary)}`);audioInputs.push({index:inputIndex++,device:secondary,volume:Number(capture.audioVolume2??1),muted:capture.audioMuted2===true,delayMs:Number(capture.audioDelayMs2??0),bus:"audio2",key:"audio2",title:"Audio 2"});}
    return{args,audioInputs,audioPipes:[],hasAudio:audioInputs.length>0,nextInputIndex:inputIndex,nextFd:startFd};
  }

  buildSceneBusCaptureArgs(capture={},bus={}) {
    const width=clamp(bus.width,320,7680,1920),height=clamp(bus.height,180,4320,1080),fps=clamp(bus.fps,1,60,60),videoFd=3;
    const args=["-f","rawvideo","-pixel_format","yuv420p","-video_size",`${width}x${height}`,"-framerate",String(fps),"-i",`pipe:${videoFd}`];
    const audio=this.buildAudioOnlyInputs(capture,1,4);
    return{args:[...args,...audio.args],audioInputs:audio.audioInputs,hasAudio:audio.hasAudio,inputCount:audio.nextInputIndex,audioPipes:audio.audioPipes||[],sceneVideoPipes:[{fd:videoFd,key:bus.key,width,height,fps,pixelFormat:"yuv420p"}]};
  }

  async spawnSceneComposer(built,{autoCommit=false,timeoutMs=9000}={}) {
    if(!this.ffmpegPath)throw new Error("FFmpeg ist für den Scene-Compositor nicht verfügbar.");
    const bus=built.bus;this.sceneFrameBusManager.ensureBus(bus);
    const widgetRows=Array.isArray(built.widgetPipes)?built.widgetPipes.filter(row=>Number.isInteger(Number(row?.fd))&&Number(row.fd)>=3):[];
    const gameRows=Array.isArray(built.gamePipes)?built.gamePipes.filter(row=>Number.isInteger(Number(row?.fd))&&Number(row.fd)>=3):[];
    if(widgetRows.length&&!this.widgetFrameSourceManager?.attach)throw new Error("Widget-Compositor ist im Launcher nicht verfügbar.");
    if(gameRows.length&&!this.gameCaptureSourceManager?.attach)throw new Error("Native Game Capture ist im Launcher nicht verfügbar.");
    if(gameRows.length)this.gameCaptureSourceManager.ensure(gameRows);
    const rows=[...widgetRows,...gameRows],fds=new Set();for(const row of rows){if(fds.has(Number(row.fd)))throw new Error(`Scene-Compositor Pipe-Konflikt auf FD ${row.fd}.`);fds.add(Number(row.fd))}
    const maxFd=rows.reduce((max,row)=>Math.max(max,Number(row.fd)),2),stdio=Array.from({length:maxFd+1},()=>"pipe");stdio[0]="pipe";stdio[1]="pipe";stdio[2]="pipe";
    const detachers=Array.isArray(built.cleanupFns)?built.cleanupFns.splice(0):[];let child;
    try{child=this.spawnFn(this.ffmpegPath,built.args,{windowsHide:true,stdio})}catch(error){for(const detach of detachers.splice(0))try{detach()}catch{};throw error}
    try{
      for(const pipe of widgetRows){const writable=child.stdio?.[Number(pipe.fd)];if(!writable)throw new Error(`Scene-Compositor Widget-Pipe ${pipe.fd} konnte nicht geöffnet werden.`);detachers.push(this.widgetFrameSourceManager.attach(pipe.key,writable,{fps:pipe.fps,width:pipe.width,height:pipe.height}))}
      for(const pipe of gameRows){const writable=child.stdio?.[Number(pipe.fd)];if(!writable)throw new Error(`Scene-Compositor Game-Pipe ${pipe.fd} konnte nicht geöffnet werden.`);detachers.push(this.gameCaptureSourceManager.attach(pipe.key,writable))}
    }catch(error){for(const detach of detachers.splice(0))try{detach()}catch{};try{child.kill?.("SIGTERM")}catch{};throw error}
    let stderr="";child.stderr?.on?.("data",chunk=>{stderr=(stderr+String(chunk)).slice(-12000)});
    const staged=this.sceneFrameBusManager.stageProducer(bus.key,child,{detachers,autoCommit,timeoutMs,label:`${safeText(built.graph?.sceneName,80)||safeText(built.graph?.sceneId,80)||"Scene"} · ${bus.profile} · ${bus.mode}`});
    try{await staged.ready;return{...staged,bus,graph:built.graph,child}}
    catch(error){throw new Error(`${error.message}${stderr.trim()?` · ${safeText(stderr.trim().split(/\r?\n/).slice(-1)[0],180)}`:""}`)}
  }

  collectWidgetSpecsForGraphs(graphs=[]) {
    const out=[],seen=new Set();for(const graph of graphs)for(const source of graph?.widgetSources||[]){if(!source?.key||seen.has(source.key))continue;seen.add(source.key);out.push(source)}return out;
  }

  activeSceneBusRequests(scene) {
    const requests=[];
    const targets=(Array.isArray(this.lastStartInput?.targets)?this.lastStartInput.targets:[]).filter(target=>target&&target.enabled!==false);
    const seen=new Set();
    for(const target of targets){const profile=target.profile||"1080p60",key=this.sceneBusKey(profile,"live");if(seen.has(key))continue;seen.add(key);requests.push({key,profile,mode:"live",graph:buildNativeSceneGraph(scene,{profile,mode:"live"})})}
    if(this.lastStartInput?.recording){const profile=this.lastStartInput?.output?.profile||"1080p60",key=this.sceneBusKey(profile,"recording");if(!seen.has(key)){seen.add(key);requests.push({key,profile,mode:"recording",graph:buildNativeSceneGraph(scene,{profile,mode:"recording"})})}}
    return requests;
  }

  async prepareInitialSceneBuses(scene) {
    if(!scene)return[];
    const requests=this.activeSceneBusRequests(scene),local=requests.filter(row=>row.graph.canComposeLocally);
    const specs=this.collectWidgetSpecsForGraphs(local.map(row=>row.graph));if(specs.length){if(!this.widgetFrameSourceManager?.prepare)throw new Error("Widget-Compositor ist im Launcher nicht verfügbar.");await this.widgetFrameSourceManager.prepare(specs)}
    const prepared=[];
    for(const request of local){const built=this.buildSceneComposerArgs({scene,capture:this.lastStartInput?.capture||{},profile:request.profile,mode:request.mode}),started=await this.spawnSceneComposer(built,{autoCommit:true});this.sceneBusMeta.set(request.key,{...built.bus,sceneId:safeText(scene?.id,120),sceneName:safeText(scene?.name,120),sceneGraph:graphSummary(built.graph)});prepared.push(started)}
    return prepared;
  }

  sceneFingerprint(scene={}) {
    const config=scene?.published_config&&typeof scene.published_config==="object"?scene.published_config:{};return `${safeText(scene?.id,120)}:${Number(scene?.version||0)}:${safeText(scene?.published_at||scene?.updated_at,80)}:${JSON.stringify(config).length}`;
  }

  scheduleSceneBusRecovery(event={}) {
    const key=safeText(event.key,160);if(!key||!this.desiredRunning||!this.lastStartInput?.scene||!this.sceneBusMeta.has(key)||this.sceneBusRecoveryTimers.has(key))return;
    const recover=async()=>{
      this.sceneBusRecoveryTimers.delete(key);if(!this.desiredRunning||!this.lastStartInput?.scene||!this.sceneBusMeta.has(key))return;
      if(this.sceneSwitchInFlight){const timer=setTimeout(()=>{this.sceneBusRecoveryTimers.delete(key);this.scheduleSceneBusRecovery({key})},1200);timer.unref?.();this.sceneBusRecoveryTimers.set(key,timer);return}
      const meta=this.sceneBusMeta.get(key);
      try{
        const graph=buildNativeSceneGraph(this.lastStartInput.scene,{profile:meta.profile,mode:meta.mode});
        const specs=this.collectWidgetSpecsForGraphs([graph]);if(specs.length&&this.widgetFrameSourceManager?.ensure)await this.widgetFrameSourceManager.ensure(specs);
        const built=this.buildSceneComposerArgs({scene:this.lastStartInput.scene,capture:this.lastStartInput.capture||{},profile:meta.profile,mode:meta.mode});await this.spawnSceneComposer(built,{autoCommit:true,timeoutMs:9000});
        this.sceneBusMeta.set(key,{...built.bus,sceneId:safeText(this.lastStartInput.scene?.id,120),sceneName:safeText(this.lastStartInput.scene?.name,120),sceneGraph:graphSummary(built.graph)});this.state.sceneRuntime={...this.state.sceneRuntime,buses:this.sceneFrameBusManager.snapshot().buses};this.emitState();
        this.logger?.info?.("Scene Frame Bus recovered",key);
      }catch(error){
        this.state.metrics.sceneSwitchFailures=Number(this.state.metrics.sceneSwitchFailures||0)+1;this.logger?.warn?.("Scene Frame Bus recovery failed",`${key}: ${error?.message||error}`);
        if(this.desiredRunning){const timer=setTimeout(()=>{this.sceneBusRecoveryTimers.delete(key);this.scheduleSceneBusRecovery({key})},3000);timer.unref?.();this.sceneBusRecoveryTimers.set(key,timer)}
      }
    };
    const timer=setTimeout(recover,700);timer.unref?.();this.sceneBusRecoveryTimers.set(key,timer);
  }

  async updateScene(scene,{source="runtime_sync",transition=null}={}) {
    if(!this.desiredRunning||!this.lastStartInput)throw new Error("Streaming Engine läuft nicht.");
    if(!scene||typeof scene!=="object")throw new Error("Neue Program-Scene fehlt.");
    if(this.sceneSwitchInFlight)return this.sceneSwitchInFlight;
    const current=this.lastStartInput.scene||null;if(this.sceneFingerprint(current)===this.sceneFingerprint(scene))return{changed:false,reason:"same_scene",state:this.snapshot()};
    this.sceneSwitchInFlight=(async()=>{
      const started=Date.now(),requests=this.activeSceneBusRequests(scene),runningBusKeys=new Set(this.sceneBusMeta.keys());
      const blockers=requests.filter(row=>runningBusKeys.has(row.key)&&!row.graph.canComposeLocally);
      if(blockers.length){this.state.metrics.sceneSwitchFailures=Number(this.state.metrics.sceneSwitchFailures||0)+1;throw new Error(`Hot Switch nicht möglich: ${blockers.map(row=>row.profile+"/"+row.mode).join(", ")} kann die neue Scene nicht lokal komponieren.`)}
      const missingBus=requests.filter(row=>!runningBusKeys.has(row.key));
      if(missingBus.length){this.state.metrics.sceneSwitchFailures=Number(this.state.metrics.sceneSwitchFailures||0)+1;throw new Error("Diese laufende Session wurde ohne Scene Frame Bus gestartet. Für diesen Wechsel ist ein kontrollierter Session-Neustart erforderlich.")}
      const specs=this.collectWidgetSpecsForGraphs(requests.map(row=>row.graph));if(specs.length){if(!this.widgetFrameSourceManager?.ensure)throw new Error("Widget-Compositor unterstützt kein Scene-Prewarming.");await this.widgetFrameSourceManager.ensure(specs)}
      const requestedTransition=normalizeSceneTransition(transition||this.lastStartInput?.transition||{type:"cut",duration_ms:0});
      const canAnimate=requestedTransition.type!=="cut"&&this.capabilities.xfade===true;
      const staged=[];
      try{
        for(const request of requests){
          const fromFrame=canAnimate?this.sceneFrameBusManager.currentFrame(request.key):null;
          const built=canAnimate?this.buildSceneTransitionComposerArgs({scene,capture:this.lastStartInput.capture||{},profile:request.profile,mode:request.mode,transition:requestedTransition,fromFrame}):this.buildSceneTransitionComposerArgs({scene,capture:this.lastStartInput.capture||{},profile:request.profile,mode:request.mode,transition:requestedTransition,fromFrame:null});
          const prepared=await this.spawnSceneComposer(built,{autoCommit:false,timeoutMs:Math.max(9000,Number(built.transition?.durationMs||0)+5000)});staged.push({request,built,prepared});
        }
        for(const row of staged)this.sceneFrameBusManager.commitProducer(row.built.bus.key,row.prepared.producerId);
      }catch(error){for(const row of staged)try{this.sceneFrameBusManager.abortPending(row.built.bus.key,"scene_switch_failed")}catch{};this.state.metrics.sceneSwitchFailures=Number(this.state.metrics.sceneSwitchFailures||0)+1;throw error}
      const appliedTransition=staged[0]?.built?.transition||{requestedType:requestedTransition.type,effectiveType:"cut",durationMs:0,easing:requestedTransition.easing,fallback:requestedTransition.type!=="cut"?"xfade_unavailable":""};
      this.lastStartInput={...this.lastStartInput,scene,transition:{type:requestedTransition.type,duration_ms:requestedTransition.durationMs,easing:requestedTransition.easing}};
      for(const row of staged)this.sceneBusMeta.set(row.built.bus.key,{...row.built.bus,sceneId:safeText(scene?.id,120),sceneName:safeText(scene?.name,120),sceneGraph:graphSummary(row.built.graph)});
      for(const item of this.processes.values()){if(!item.sceneBusKey)continue;const meta=this.sceneBusMeta.get(item.sceneBusKey);if(meta){item.sceneGraph=meta.sceneGraph;this.updateStateItem(item,false)}}
      if(this.widgetFrameSourceManager?.prepare)await this.widgetFrameSourceManager.prepare(specs);
      const elapsed=Date.now()-started,summary=requests[0]?.graph?graphSummary(requests[0].graph):null,switchedAt=new Date().toISOString();
      this.state.sceneGraph=summary;this.state.metrics.sceneSwitches=Number(this.state.metrics.sceneSwitches||0)+1;if(appliedTransition.effectiveType!=="cut")this.state.metrics.sceneTransitions=Number(this.state.metrics.sceneTransitions||0)+1;if(appliedTransition.fallback)this.state.metrics.sceneTransitionFallbacks=Number(this.state.metrics.sceneTransitionFallbacks||0)+1;this.state.sceneRuntime={mode:"frame_bus",sceneId:safeText(scene?.id,120),sceneName:safeText(scene?.name,120),lastSwitchAt:switchedAt,lastSwitchMs:elapsed,lastSwitchSource:safeText(source,80),lastTransition:{...appliedTransition,startedAt:switchedAt},buses:this.sceneFrameBusManager.snapshot().buses};this.emitState();
      return{changed:true,from:{id:safeText(current?.id,120),name:safeText(current?.name,120)},to:{id:safeText(scene?.id,120),name:safeText(scene?.name,120)},elapsedMs:elapsed,transition:{...appliedTransition},state:this.snapshot()};
    })();
    try{return await this.sceneSwitchInFlight}finally{this.sceneSwitchInFlight=null}
  }

  buildAudioMixPlan(captureInfo={}) {
    const inputs=Array.isArray(captureInfo.audioInputs)?captureInfo.audioInputs:[];
    if(!inputs.length)return {filters:[],label:"",buses:[],hasAudio:false};
    const filters=[],labels=[],buses=[];
    for(let i=0;i<inputs.length;i++){
      const item=inputs[i],volume=item.muted?0:Math.max(0,Math.min(2,Number.isFinite(Number(item.volume))?Number(item.volume):1)),delayMs=clamp(item.delayMs,0,2000,0),label=`cfs_a${i}`,chain=["aresample=48000"];
      if(delayMs>0)chain.push(`adelay=${delayMs}|${delayMs}`);
      chain.push(`volume=${volume.toFixed(3)}`);
      filters.push(`[${item.index}:a:0]${chain.join(",")}[${label}]`);labels.push(`[${label}]`);buses.push({bus:item.bus||`audio${i+1}`,device:item.device,volume,muted:item.muted===true,delayMs});
    }
    const output="cfs_audio";
    if(labels.length===1)filters.push(`${labels[0]}anull[${output}]`);else filters.push(`${labels.join("")}amix=inputs=${labels.length}:duration=longest:dropout_transition=2:normalize=0[${output}]`);
    return {filters,label:output,buses,hasAudio:true};
  }

  buildAudioMixArgs(captureInfo={}) {
    const plan=this.buildAudioMixPlan(captureInfo);
    if(!plan.hasAudio)return {args:[],label:"",buses:[]};
    return {args:["-filter_complex",plan.filters.join(";"),"-map","0:v:0","-map",`[${plan.label}]`],label:plan.label,buses:plan.buses};
  }

  buildRecordingAudioPlan(captureInfo={}, trackConfig={}) {
    const inputs=Array.isArray(captureInfo.audioInputs)?captureInfo.audioInputs:[];
    if(!inputs.length)return {filters:[],mapArgs:[],metadata:[],tracks:[],buses:[],hasAudio:false};
    const structured=inputs.some(item=>AUDIO_SOURCE_KEYS.includes(String(item?.key||item?.bus||"")));
    const requested={mix:trackConfig?.mix!==false};
    if(structured){for(const key of AUDIO_SOURCE_KEYS)requested[key]=trackConfig?.[key]!==false;}
    else{requested.audio1=trackConfig?.audio1!==false;requested.audio2=trackConfig?.audio2!==false;}
    if(!Object.values(requested).some(Boolean))requested.mix=true;
    const filters=[],mixLabels=[],directLabels=[],buses=[];
    for(let i=0;i<inputs.length;i++){
      const item=inputs[i],key=String(item.key||item.bus||(i===0?"audio1":"audio2")),wantsDirect=requested[key]===true,wantsMix=requested.mix===true;
      const volume=item.muted?0:Math.max(0,Math.min(2,Number.isFinite(Number(item.volume))?Number(item.volume):1)),delayMs=clamp(item.delayMs,0,2000,0),chain=["aresample=48000"];
      if(delayMs>0)chain.push(`adelay=${delayMs}|${delayMs}`);chain.push(`volume=${volume.toFixed(3)}`);
      const base=`cfs_rec_a${i}`,title=safeText(item.title,80)||(key==="audio1"?"Audio 1 · Mic/Mix":key==="audio2"?"Audio 2 · Desktop/Loopback":AUDIO_SOURCE_TITLES[key]||`Audio ${i+1}`);
      if(wantsMix&&wantsDirect){filters.push(`[${item.index}:a:0]${chain.join(",")},asplit=2[${base}_mix][${base}_track]`);mixLabels.push(`[${base}_mix]`);directLabels.push({label:`[${base}_track]`,title,key});}
      else if(wantsMix){filters.push(`[${item.index}:a:0]${chain.join(",")}[${base}_mix]`);mixLabels.push(`[${base}_mix]`);}
      else if(wantsDirect){filters.push(`[${item.index}:a:0]${chain.join(",")}[${base}_track]`);directLabels.push({label:`[${base}_track]`,title,key});}
      buses.push({bus:item.bus||key,key,device:item.device,processId:Number(item.processId||0),volume,muted:item.muted===true,delayMs});
    }
    const mapArgs=[],tracks=[];
    if(requested.mix&&mixLabels.length){const mixOut="cfs_rec_mix";if(mixLabels.length===1)filters.push(`${mixLabels[0]}anull[${mixOut}]`);else filters.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=2:normalize=0[${mixOut}]`);mapArgs.push("-map",`[${mixOut}]`);tracks.push({key:"mix",title:"Stream Mix"});}
    for(const row of directLabels){mapArgs.push("-map",row.label);tracks.push({key:row.key,title:row.title});}
    if(!tracks.length)return {filters:[],mapArgs:[],metadata:[],tracks:[],buses,hasAudio:false};
    const metadata=[];tracks.forEach((track,index)=>metadata.push(`-metadata:s:a:${index}`,`title=${track.title}`));
    return {filters,mapArgs,metadata,tracks,buses,hasAudio:true};
  }

  buildRecordingAudioArgs(captureInfo={}, trackConfig={}) {
    const plan=this.buildRecordingAudioPlan(captureInfo,trackConfig);
    if(!plan.hasAudio)return {args:[],tracks:[],buses:plan.buses,hasAudio:false};
    return {args:["-filter_complex",plan.filters.join(";"),"-map","0:v:0",...plan.mapArgs,...plan.metadata],tracks:plan.tracks,buses:plan.buses,hasAudio:true};
  }

  buildEncodingArgs({profile="1080p60",encoder="auto",bitrateKbps=6000,audioBitrateKbps=160,hasAudio=false,crop=null,videoPrepared=false}={}) {
    const p=profileFor(profile),selected=this.resolveEncoder(encoder),codec=ENCODER_MAP[selected]||ENCODER_MAP.software;
    const bitrate=clamp(bitrateKbps,1000,30000,6000),audio=clamp(audioBitrateKbps,64,320,160);
    const cropFilter=crop&&Number(crop.width)>0&&Number(crop.height)>0?`crop=${clamp(crop.width,64,7680,1920)}:${clamp(crop.height,64,4320,1080)}:${clamp(crop.x,0,10000,0)}:${clamp(crop.y,0,10000,0)},`:"";
    const vf=`${cropFilter}scale=${p.width}:${p.height}:force_original_aspect_ratio=decrease,pad=${p.width}:${p.height}:(ow-iw)/2:(oh-ih)/2`;
    const args=[...(videoPrepared?[]:["-vf",vf]),"-r",String(p.fps),"-c:v",codec,"-b:v",`${bitrate}k`,"-maxrate",`${bitrate}k`,"-bufsize",`${bitrate*2}k`,"-g",String(p.fps*2),"-pix_fmt","yuv420p"];
    if(selected==="software")args.push("-preset","veryfast","-tune","zerolatency");
    else if(selected==="nvenc")args.push("-preset","p4","-tune","ll","-rc","cbr");
    if(hasAudio)args.push("-c:a","aac","-b:a",`${audio}k`,`-ar`,`48000`,`-ac`,`2`);else args.push("-an");
    return {args,profile:p,encoder:selected,bitrateKbps:bitrate,audioBitrateKbps:audio};
  }

  buildStreamArgs({capture={},target={},credential={},scene=null,sceneBus=null}={}) {
    const profile=target.profile||"1080p60";
    const sceneCap=!sceneBus&&scene?this.buildSceneCaptureArgs({scene,capture,profile,mode:"live"}):{active:false,graph:null,widgetPipes:[]};
    let args,encoding,audioBuses=[],sceneGraph=sceneBus?.sceneGraph||sceneCap.graph?sceneBus?.sceneGraph||graphSummary(sceneCap.graph):null,widgetPipes=[],gamePipes=[],audioPipes=[],sceneVideoPipes=[];
    if(sceneBus){
      const cap=this.buildSceneBusCaptureArgs(capture,sceneBus),mix=this.buildAudioMixArgs(cap);
      encoding=this.buildEncodingArgs({profile,encoder:target.encoder||capture.encoder||"auto",bitrateKbps:target.bitrate_kbps,audioBitrateKbps:target.audio_bitrate_kbps,hasAudio:cap.hasAudio});
      args=["-hide_banner","-loglevel","info","-stats",...cap.args,...mix.args,...encoding.args];audioBuses=mix.buses;gamePipes=cap.gamePipes||[];audioPipes=cap.audioPipes||[];sceneVideoPipes=cap.sceneVideoPipes||[];
    }else if(sceneCap.active){
      const video=compileSceneVideoFilters(sceneCap.graph,sceneCap.inputIndexByNodeId,{baseMode:sceneCap.baseMode,baseInputIndex:sceneCap.baseInputIndex,baseCrop:sceneCap.baseCrop}),audio=this.buildAudioMixPlan(sceneCap);
      const filters=[...video.filters,...audio.filters];
      const maps=["-map",`[${video.videoLabel}]`,...(audio.hasAudio?["-map",`[${audio.label}]`]:[])];
      encoding=this.buildEncodingArgs({profile,encoder:target.encoder||capture.encoder||"auto",bitrateKbps:target.bitrate_kbps,audioBitrateKbps:target.audio_bitrate_kbps,hasAudio:audio.hasAudio,videoPrepared:true});
      args=["-hide_banner","-loglevel","info","-stats",...sceneCap.args,"-filter_complex",filters.join(";"),...maps,...encoding.args];audioBuses=audio.buses;widgetPipes=sceneCap.widgetPipes||[];gamePipes=sceneCap.gamePipes||[];audioPipes=sceneCap.audioPipes||[];
    }else{
      const cap=this.buildCaptureWithAudio(capture,profileFor(profile).fps,3),mix=this.buildAudioMixArgs(cap);
      encoding=this.buildEncodingArgs({profile,encoder:target.encoder||capture.encoder||"auto",bitrateKbps:target.bitrate_kbps,audioBitrateKbps:target.audio_bitrate_kbps,hasAudio:cap.hasAudio,crop:capture.crop});
      args=["-hide_banner","-loglevel","info","-stats",...cap.args,...mix.args,...encoding.args];audioBuses=mix.buses;audioPipes=cap.audioPipes||[];
    }
    const url=outputUrl(credential.serverUrl,credential.streamKey);
    args.push("-f","flv",url);
    return {args,secrets:[credential.serverUrl,credential.streamKey,url],profile:encoding.profile,encoder:encoding.encoder,audioBuses,sceneGraph,widgetPipes,gamePipes,audioPipes,sceneVideoPipes,sceneBusKey:sceneBus?.key||""};
  }

  buildRecordingArgs({capture={},output={},filePath="",scene=null,sceneBus=null}={}) {
    const profile=output.profile||"1080p60";
    const sceneCap=!sceneBus&&scene?this.buildSceneCaptureArgs({scene,capture,profile,mode:"recording"}):{active:false,graph:null,widgetPipes:[]};
    let args,encoding,audioBuses=[],audioTracks=[],sceneGraph=sceneBus?.sceneGraph||sceneCap.graph?sceneBus?.sceneGraph||graphSummary(sceneCap.graph):null,widgetPipes=[],gamePipes=[],audioPipes=[],sceneVideoPipes=[];
    if(sceneBus){
      const cap=this.buildSceneBusCaptureArgs(capture,sceneBus),recordingAudio=this.buildRecordingAudioArgs(cap,output.recording_tracks||{});
      encoding=this.buildEncodingArgs({profile,encoder:output.encoder||capture.encoder||"auto",bitrateKbps:output.bitrate_kbps,audioBitrateKbps:output.audio_bitrate_kbps,hasAudio:recordingAudio.hasAudio});
      args=["-hide_banner","-loglevel","info","-stats",...cap.args,...recordingAudio.args,...encoding.args];audioBuses=recordingAudio.buses;audioTracks=recordingAudio.tracks;gamePipes=cap.gamePipes||[];audioPipes=cap.audioPipes||[];sceneVideoPipes=cap.sceneVideoPipes||[];
    }else if(sceneCap.active){
      const video=compileSceneVideoFilters(sceneCap.graph,sceneCap.inputIndexByNodeId,{baseMode:sceneCap.baseMode,baseInputIndex:sceneCap.baseInputIndex,baseCrop:sceneCap.baseCrop}),audio=this.buildRecordingAudioPlan(sceneCap,output.recording_tracks||{}),filters=[...video.filters,...audio.filters];
      encoding=this.buildEncodingArgs({profile,encoder:output.encoder||capture.encoder||"auto",bitrateKbps:output.bitrate_kbps,audioBitrateKbps:output.audio_bitrate_kbps,hasAudio:audio.hasAudio,videoPrepared:true});
      args=["-hide_banner","-loglevel","info","-stats",...sceneCap.args,"-filter_complex",filters.join(";"),"-map",`[${video.videoLabel}]`,...audio.mapArgs,...audio.metadata,...encoding.args];audioBuses=audio.buses;audioTracks=audio.tracks;widgetPipes=sceneCap.widgetPipes||[];gamePipes=sceneCap.gamePipes||[];audioPipes=sceneCap.audioPipes||[];
    }else{
      const cap=this.buildCaptureWithAudio(capture,profileFor(profile).fps,3),recordingAudio=this.buildRecordingAudioArgs(cap,output.recording_tracks||{});
      encoding=this.buildEncodingArgs({profile,encoder:output.encoder||capture.encoder||"auto",bitrateKbps:output.bitrate_kbps,audioBitrateKbps:output.audio_bitrate_kbps,hasAudio:recordingAudio.hasAudio,crop:capture.crop});
      args=["-hide_banner","-loglevel","info","-stats",...cap.args,...recordingAudio.args,...encoding.args];audioBuses=recordingAudio.buses;audioTracks=recordingAudio.tracks;audioPipes=cap.audioPipes||[];
    }
    const format=output.recording_format==="mp4"?"mp4":"matroska";args.push("-f",format,filePath);
    return {args,profile:encoding.profile,encoder:encoding.encoder,audioBuses,audioTracks,sceneGraph,widgetPipes,gamePipes,audioPipes,sceneVideoPipes,sceneBusKey:sceneBus?.key||""};
  }

  recordingPath(format="mkv") {
    const ext=format==="mp4"?"mp4":"mkv";
    const stamp=new Date().toISOString().replace(/[:.]/g,"-");
    const dir=path.join(this.videosPath||process.cwd(),"CFS Creator Suite","Recordings");
    fs.mkdirSync(dir,{recursive:true});
    return path.join(dir,`cfs_stream_${stamp}.${ext}`);
  }

  parseProgress(line) {
    const text=String(line||"");
    const fps=Number(text.match(/fps=\s*([\d.]+)/)?.[1]||0);
    const bitrateText=text.match(/bitrate=\s*([\d.]+)kbits\/s/i)?.[1];
    const speed=Number(text.match(/speed=\s*([\d.]+)x/i)?.[1]||0);
    const dropped=Number(text.match(/drop=\s*(\d+)/i)?.[1]||0);
    const duplicated=Number(text.match(/dup=\s*(\d+)/i)?.[1]||0);
    return {fps:Number.isFinite(fps)?fps:0,bitrateKbps:bitrateText?Number(bitrateText):0,speed:Number.isFinite(speed)?speed:0,droppedFrames:Number.isFinite(dropped)?dropped:0,duplicatedFrames:Number.isFinite(duplicated)?duplicated:0};
  }

  launchProcess(id,args,{secrets=[],kind="stream",target=null,reconnect=true,runtime={},widgetPipes=[],gamePipes=[],audioPipes=[],sceneVideoPipes=[]}={}) {
    const item={id,kind,target,status:"starting",startedAt:new Date().toISOString(),lastError:"",reconnectAttempt:0,profile:safeText(runtime.profile,40),encoder:safeText(runtime.encoder,40),configuredBitrateKbps:clamp(runtime.bitrateKbps,0,30000,0),configuredAudioBitrateKbps:clamp(runtime.audioBitrateKbps,0,320,0),audioTracks:Array.isArray(runtime.audioTracks)?runtime.audioTracks.slice(0,8).map(track=>({key:safeText(track?.key,24),title:safeText(track?.title,80)})):[],sceneGraph:runtime.sceneGraph&&typeof runtime.sceneGraph==="object"?runtime.sceneGraph:null,sceneBusKey:safeText(runtime.sceneBusKey,160),metrics:{fps:0,bitrateKbps:0,speed:0,droppedFrames:0,duplicatedFrames:0},lastProgressAt:Date.now(),widgetPipeDetachers:[],gamePipeDetachers:[],audioPipeDetachers:[],sceneVideoPipeDetachers:[]};
    const widgetRows=Array.isArray(widgetPipes)?widgetPipes.filter(row=>Number.isInteger(Number(row?.fd))&&Number(row.fd)>=3):[];
    const gameRows=Array.isArray(gamePipes)?gamePipes.filter(row=>Number.isInteger(Number(row?.fd))&&Number(row.fd)>=3):[];
    const audioRows=Array.isArray(audioPipes)?audioPipes.filter(row=>Number.isInteger(Number(row?.fd))&&Number(row.fd)>=3):[];
    const sceneRows=Array.isArray(sceneVideoPipes)?sceneVideoPipes.filter(row=>Number.isInteger(Number(row?.fd))&&Number(row.fd)>=3):[];
    if(widgetRows.length&&!this.widgetFrameSourceManager?.attach)throw new Error("Widget-Compositor ist im Launcher nicht verfügbar.");
    if(gameRows.length&&!this.gameCaptureSourceManager?.attach)throw new Error("Native Game Capture ist im Launcher nicht verfügbar.");
    if(audioRows.length&&!this.applicationAudioSourceManager?.attach)throw new Error("Application Audio Capture ist im Launcher nicht verfügbar.");
    if(sceneRows.length&&!this.sceneFrameBusManager?.attach)throw new Error("Scene Frame Bus ist im Launcher nicht verfügbar.");
    const allPipes=[...widgetRows,...gameRows,...audioRows,...sceneRows],fds=new Set();for(const row of allPipes){if(fds.has(Number(row.fd)))throw new Error(`Interner Pipe-Konflikt auf FD ${row.fd}.`);fds.add(Number(row.fd));}
    const maxFd=allPipes.reduce((max,row)=>Math.max(max,Number(row.fd)),2),stdio=Array.from({length:maxFd+1},()=>"pipe");stdio[0]="pipe";stdio[1]="ignore";stdio[2]="pipe";
    if(gameRows.length)this.gameCaptureSourceManager.ensure(gameRows);
    const child=this.spawnFn(this.ffmpegPath,args,{windowsHide:true,stdio});
    item.child=child;
    try{
      for(const pipe of widgetRows){const writable=child.stdio?.[Number(pipe.fd)];if(!writable)throw new Error(`FFmpeg Widget-Pipe ${pipe.fd} konnte nicht geöffnet werden.`);item.widgetPipeDetachers.push(this.widgetFrameSourceManager.attach(pipe.key,writable,{fps:pipe.fps,width:pipe.width,height:pipe.height}))}
      for(const pipe of gameRows){const writable=child.stdio?.[Number(pipe.fd)];if(!writable)throw new Error(`FFmpeg Game-Capture-Pipe ${pipe.fd} konnte nicht geöffnet werden.`);item.gamePipeDetachers.push(this.gameCaptureSourceManager.attach(pipe.key,writable))}
      for(const pipe of audioRows){const writable=child.stdio?.[Number(pipe.fd)];if(!writable)throw new Error(`FFmpeg Audio-Pipe ${pipe.fd} konnte nicht geöffnet werden.`);item.audioPipeDetachers.push(this.applicationAudioSourceManager.attach(pipe.key,writable))}
      for(const pipe of sceneRows){const writable=child.stdio?.[Number(pipe.fd)];if(!writable)throw new Error(`FFmpeg Scene-Video-Pipe ${pipe.fd} konnte nicht geöffnet werden.`);item.sceneVideoPipeDetachers.push(this.sceneFrameBusManager.attach(pipe.key,writable))}
    }catch(error){for(const detach of [...item.widgetPipeDetachers.splice(0),...item.gamePipeDetachers.splice(0),...item.audioPipeDetachers.splice(0),...item.sceneVideoPipeDetachers.splice(0)])try{detach()}catch{};try{child.kill?.("SIGTERM")}catch{};throw error}
    this.processes.set(id,item);this.updateStateItem(item);
    child.stderr?.on?.("data",chunk=>{
      const clean=redactSecrets(String(chunk),secrets);
      const progress=this.parseProgress(clean);
      if(progress.fps||progress.bitrateKbps||progress.speed||progress.droppedFrames||progress.duplicatedFrames){item.metrics=progress;item.lastProgressAt=Date.now();}
      if(/frame=|size=/i.test(clean)){item.status="live";item.lastProgressAt=Date.now();}
      const tail=clean.trim().split(/\r?\n/).slice(-1)[0]||"";
      if(tail&&!/frame=/.test(tail))item.lastMessage=safeText(tail,260);
      this.updateStateItem(item,false);
      const streamDrops=Object.values(this.state.destinations||{}).reduce((sum,row)=>sum+Number(row?.metrics?.droppedFrames||0),0);
      const recordingDrops=Number(this.state.recording?.metrics?.droppedFrames||0);
      this.state.metrics.droppedFrames=streamDrops+recordingDrops;
      if(Date.now()-this.lastProgressEmitAt>=750){this.lastProgressEmitAt=Date.now();this.emitState();}
    });
    child.once("error",error=>{item.lastError=redactSecrets(error?.message||error,secrets);item.status="error";this.state.metrics.errors++;this.updateStateItem(item)});
    child.once("close",code=>{
      this.clearWatchdog(id);for(const detach of [...item.widgetPipeDetachers.splice(0),...item.gamePipeDetachers.splice(0),...item.audioPipeDetachers.splice(0),...item.sceneVideoPipeDetachers.splice(0)])try{detach()}catch{}
      const wasDesired=this.desiredRunning;
      this.processes.delete(id);
      item.child=null;
      const wasStopping=item.status==="stopping";
      if(wasStopping)item.status=code===0?"stopped":"error";else item.status=code===0?"stopped":"error";
      if(code!==0){item.lastError=item.lastError||`FFmpeg wurde mit Code ${code} beendet.`;if(!wasStopping)this.state.metrics.errors++}
      item.stoppedAt=new Date().toISOString();this.updateStateItem(item);
      if(kind==="recording"){
        let bytes=0,exists=false;try{exists=Boolean(item.filePath&&fs.existsSync(item.filePath));if(exists)bytes=Number(fs.statSync(item.filePath).size||0)}catch{}
        this.emit("recording-finalized",{ok:code===0&&exists&&bytes>0,code:Number(code??-1),filePath:item.filePath||"",bytes,startedAt:item.startedAt||null,stoppedAt:item.stoppedAt||null,profile:item.profile||"",encoder:item.encoder||"",audioTracks:Array.isArray(item.audioTracks)?item.audioTracks.map((track,index)=>({...track,streamIndex:index})):[],sceneGraph:item.sceneGraph||null,error:item.lastError||""});
      }
      if(wasDesired&&reconnect&&kind==="stream"&&target?.enabled!==false&&!this.pausedTargets.has(id))this.scheduleReconnect(item,target);
      this.recomputeStatus();
    });
    this.startWatchdog(item,secrets);
    this.recomputeStatus();
    return item;
  }

  startWatchdog(item,secrets=[]){
    if(!this.lastStartInput?.watchdog?.enabled)return;
    const timeoutMs=clamp(this.lastStartInput?.watchdog?.timeoutSec,10,60,18)*1000;
    const timer=setInterval(()=>{
      if(!this.desiredRunning||!item.child||!["starting","live"].includes(item.status))return;
      if(Date.now()-Number(item.lastProgressAt||0)<timeoutMs)return;
      item.lastError=`Watchdog: seit ${Math.round(timeoutMs/1000)} s kein FFmpeg-Fortschritt.`;
      item.status="error";
      this.state.metrics.watchdogRestarts=Number(this.state.metrics.watchdogRestarts||0)+1;
      this.updateStateItem(item);
      try{item.child.kill("SIGTERM")}catch(error){item.lastError=redactSecrets(error?.message||error,secrets)}
    },Math.max(3000,Math.min(5000,Math.round(timeoutMs/3))));
    timer.unref?.();
    this.watchdogTimers.set(item.id,timer);
  }

  clearWatchdog(id){const timer=this.watchdogTimers.get(id);if(timer)clearInterval(timer);this.watchdogTimers.delete(id)}

  updateStateItem(item,emit=true){
    const publicItem={id:item.id,kind:item.kind,status:item.status,startedAt:item.startedAt||null,stoppedAt:item.stoppedAt||null,lastError:safeText(item.lastError,260),lastMessage:safeText(item.lastMessage,260),reconnectAttempt:Number(item.reconnectAttempt||0),reconnectAt:item.reconnectAt||null,profile:safeText(item.profile,40),encoder:safeText(item.encoder,40),configuredBitrateKbps:Number(item.configuredBitrateKbps||0),configuredAudioBitrateKbps:Number(item.configuredAudioBitrateKbps||0),audioTracks:Array.isArray(item.audioTracks)?item.audioTracks.slice(0,8).map(track=>({key:safeText(track?.key,24),title:safeText(track?.title,80)})):[],sceneGraph:item.sceneGraph||null,sceneBusKey:safeText(item.sceneBusKey,160),metrics:{...item.metrics},provider:item.target?.provider||"",label:item.target?.label||item.id,...(item.kind==="recording"?{filePath:item.filePath||""}:{})};
    if(item.kind==="recording")this.state.recording=publicItem;else this.state.destinations[item.id]=publicItem;
    if(emit)this.emitState();
  }

  scheduleReconnect(item,target){
    const id=item.id;if(this.pausedTargets.has(id)||this.reconnectTimers.has(id))return;
    const attempt=clamp((item.reconnectAttempt||0)+1,1,99,1),delay=RECONNECT_DELAYS[Math.min(attempt-1,RECONNECT_DELAYS.length-1)];
    const reconnectAt=new Date(Date.now()+delay).toISOString();
    this.state.destinations[id]={...this.state.destinations[id],status:"reconnecting",reconnectAttempt:attempt,reconnectInMs:delay,reconnectAt};this.state.metrics.reconnects++;
    const timer=setTimeout(()=>{this.reconnectTimers.delete(id);if(!this.desiredRunning||!this.lastStartInput)return;try{this.startDestination(target,{reconnectAttempt:attempt})}catch(error){const current={...item,reconnectAttempt:attempt,status:"error",lastError:String(error?.message||error)};this.updateStateItem(current);this.scheduleReconnect(current,target)}},delay);
    timer.unref?.();this.reconnectTimers.set(id,timer);this.emitState();
  }

  async start(input={}){
    if(this.desiredRunning)throw new Error("Streaming Engine läuft bereits.");
    if(!this.ffmpegPath){const p=await this.probe();if(!p.available)throw new Error(p.error||"FFmpeg ist nicht verfügbar.")}
    if(this.platform!=="win32")throw new Error("Die echte Capture-Engine muss auf Windows gestartet werden.");
    const captureType=["screen","window","camera"].includes(input.capture?.type)?input.capture.type:"screen";
    const targets=(Array.isArray(input.targets)?input.targets:[]).filter(t=>t&&t.enabled!==false).slice(0,8);
    if(!targets.length&&!input.recording)throw new Error("Kein Streaming-Ziel oder Recording aktiviert.");
    const executionGraphs=[];
    if(input.scene){
      for(const target of targets)executionGraphs.push(buildNativeSceneGraph(input.scene,{profile:target.profile||"1080p60",mode:"live"}));
      if(input.recording)executionGraphs.push(buildNativeSceneGraph(input.scene,{profile:input.output?.profile||"1080p60",mode:"recording"}));
    }
    const localGraphs=executionGraphs.filter(graph=>graph.canComposeLocally);
    const nativeTypes=new Set(localGraphs.flatMap(graph=>(graph.nativeNodes||[]).map(node=>node.nativeType)));
    const usesLegacyCapture=!input.scene||executionGraphs.some(graph=>!graph.canComposeLocally||graph.mode==="web_overlay");
    const widgetSpecs=[];const widgetKeys=new Set();
    for(const graph of localGraphs)for(const source of graph.widgetSources||[]){if(widgetKeys.has(source.key))continue;widgetKeys.add(source.key);widgetSpecs.push(source)}
    if(widgetSpecs.length){if(!this.widgetFrameSourceManager?.prepare)throw new Error("Widget-Compositor ist im Launcher nicht verfügbar.");await this.widgetFrameSourceManager.prepare(widgetSpecs)}
    const structuredAudio=this.hasStructuredAudioSources(input.capture||{}),audioSourceMap=structuredAudio?input.capture.audioSources:{};
    const appAudioSpecs=AUDIO_SOURCE_KEYS.filter(key=>key!=="mic").map(key=>({key,...(audioSourceMap?.[key]||{})})).filter(row=>row.enabled!==false&&Number(row.processId)>0);
    if(appAudioSpecs.length){if(!this.applicationAudioSourceManager?.prepare)throw new Error("Application Audio Capture ist im Launcher nicht verfügbar.");const appProbe=this.applicationAudioSourceManager.probeRuntime?await this.applicationAudioSourceManager.probeRuntime():this.applicationAudioSourceManager.probe?.()||{available:false,error:"Application Audio Helper fehlt."};if(!appProbe.available||appProbe.runtimeVerified===false)throw new Error(appProbe.error||"Application Audio Helper ist nicht runtime-verifiziert.");this.applicationAudioSourceManager.prepare(appAudioSpecs)}
    const needsGdigrab=nativeTypes.has("screen")||nativeTypes.has("window")||nativeTypes.has("game")||(usesLegacyCapture&&["screen","window"].includes(captureType));
    const structuredMic=structuredAudio&&audioSourceMap?.mic?.enabled!==false&&Boolean(audioSourceMap?.mic?.deviceName||audioSourceMap?.mic?.device);
    const needsDshow=nativeTypes.has("camera")||(usesLegacyCapture&&captureType==="camera")||structuredMic||(!structuredAudio&&Boolean(input.capture?.audioDevice||input.capture?.audioDevice2));
    if(needsGdigrab&&!this.capabilities.gdigrab)throw new Error("Dieser FFmpeg-Build unterstützt gdigrab für Bildschirm-/Fenster-Capture nicht.");
    if(needsDshow&&!this.capabilities.dshow)throw new Error("Dieser FFmpeg-Build unterstützt dshow für Kamera/Audio nicht.");
    this.desiredRunning=true;this.lastStartInput=input;this.pausedTargets.clear();this.sceneBusMeta.clear();const sessionGraph=input.scene?graphSummary(buildNativeSceneGraph(input.scene,{profile:input.output?.profile||targets[0]?.profile||"1080p60",mode:"live"})):null;this.state={...this.state,status:"starting",error:"",startedAt:new Date().toISOString(),stoppedAt:null,capture:{type:input.capture?.type||"screen",windowTitle:safeText(input.capture?.windowTitle,120),displayId:safeText(input.capture?.displayId,80),region:input.capture?.region||null,crop:input.capture?.crop||null,audioDevice:safeText(input.capture?.audioDevice,120),audioDevice2:safeText(input.capture?.audioDevice2,120),audioSources:structuredAudio?Object.fromEntries(AUDIO_SOURCE_KEYS.map(key=>[key,{enabled:audioSourceMap?.[key]?.enabled!==false,kind:key==="mic"?"device":"process",deviceName:key==="mic"?safeText(audioSourceMap?.[key]?.deviceName||audioSourceMap?.[key]?.device,120):"",processId:key==="mic"?0:Number(audioSourceMap?.[key]?.processId||0),processName:key==="mic"?"":safeText(audioSourceMap?.[key]?.processName,120)}])):null},sceneGraph:sessionGraph,destinations:{},recording:null,sceneRuntime:{mode:"legacy",sceneId:safeText(input.scene?.id,120),sceneName:safeText(input.scene?.name,120),lastSwitchAt:null,lastSwitchMs:0,lastSwitchSource:"initial",lastTransition:null,buses:[]}};
    try{if(input.scene){await this.prepareInitialSceneBuses(input.scene);if(this.sceneBusMeta.size)this.state.sceneRuntime={...this.state.sceneRuntime,mode:"frame_bus",buses:this.sceneFrameBusManager.snapshot().buses}}}
    catch(error){this.desiredRunning=false;this.lastStartInput=null;this.sceneBusMeta.clear();try{this.sceneFrameBusManager?.releaseAll?.()}catch{}try{this.widgetFrameSourceManager?.releaseAll?.()}catch{}try{this.applicationAudioSourceManager?.releaseAll?.()}catch{};throw error}
    const failures=[];
    for(const target of targets){try{this.startDestination(target)}catch(error){failures.push({id:target.id,error:String(error?.message||error)});this.state.destinations[target.id]={id:target.id,status:"error",lastError:String(error?.message||error),label:target.label||target.id,provider:target.provider||""}}}
    if(input.recording){try{this.startRecording(input.output||{})}catch(error){failures.push({id:"recording",error:String(error?.message||error)})}}
    this.recomputeStatus();
    if(failures.length===targets.length+(input.recording?1:0)){this.desiredRunning=false;this.lastStartInput=null;this.sceneBusMeta.clear();try{this.sceneFrameBusManager?.releaseAll?.()}catch{}try{this.widgetFrameSourceManager?.releaseAll?.()}catch{}try{this.applicationAudioSourceManager?.releaseAll?.()}catch{};throw new Error(failures.map(x=>`${x.id}: ${x.error}`).join(" | "))}
    return this.snapshot();
  }

  startDestination(target,{reconnectAttempt=0}={}){
    if(!this.lastStartInput)throw new Error("Streaming-Startkonfiguration fehlt.");
    const id=safeText(target.id,64);if(!id)throw new Error("Streaming-Ziel-ID fehlt.");
    const credential=this.lastStartInput.credentials?.[id];
    if(!credential?.serverUrl||!credential?.streamKey)throw new Error(`Lokale Zugangsdaten für ${target.label||id} fehlen.`);
    const busKey=this.sceneBusKey(target.profile||"1080p60","live"),sceneBus=this.sceneBusMeta.get(busKey)||null;
    const built=this.buildStreamArgs({capture:this.lastStartInput.capture||{},target,credential,scene:this.lastStartInput.scene||null,sceneBus});
    const item=this.launchProcess(id,built.args,{secrets:built.secrets,kind:"stream",target,reconnect:true,widgetPipes:built.widgetPipes||[],gamePipes:built.gamePipes||[],audioPipes:built.audioPipes||[],sceneVideoPipes:built.sceneVideoPipes||[],runtime:{profile:target.profile||"1080p60",encoder:built.encoder,bitrateKbps:target.bitrate_kbps,audioBitrateKbps:target.audio_bitrate_kbps,sceneGraph:built.sceneGraph,sceneBusKey:built.sceneBusKey}});item.reconnectAttempt=reconnectAttempt;item.reconnectAt=null;this.updateStateItem(item);
    return item;
  }

  startRecording(output={}){
    if(!this.lastStartInput)throw new Error("Streaming-Startkonfiguration fehlt.");
    const filePath=this.recordingPath(output.recording_format||"mkv");
    const busKey=this.sceneBusKey(output.profile||"1080p60","recording"),sceneBus=this.sceneBusMeta.get(busKey)||null;
    const built=this.buildRecordingArgs({capture:this.lastStartInput.capture||{},output,filePath,scene:this.lastStartInput.scene||null,sceneBus});
    const item=this.launchProcess("recording",built.args,{kind:"recording",target:{label:"Recording"},reconnect:false,widgetPipes:built.widgetPipes||[],gamePipes:built.gamePipes||[],audioPipes:built.audioPipes||[],sceneVideoPipes:built.sceneVideoPipes||[],runtime:{profile:output.profile||"1080p60",encoder:built.encoder,bitrateKbps:output.bitrate_kbps,audioBitrateKbps:output.audio_bitrate_kbps,audioTracks:built.audioTracks||[],sceneGraph:built.sceneGraph,sceneBusKey:built.sceneBusKey}});item.filePath=filePath;this.state.recording={...this.state.recording,filePath};return item;
  }

  async stopTarget(targetId){
    const id=safeText(targetId,64);
    if(!id)throw new Error("Streaming-Ziel-ID fehlt.");
    this.pausedTargets.add(id);
    const reconnect=this.reconnectTimers.get(id);
    if(reconnect)clearTimeout(reconnect);
    this.reconnectTimers.delete(id);
    const item=this.processes.get(id);
    if(!item){
      const previous=this.state.destinations?.[id]||{id,label:id,provider:""};
      this.state.destinations[id]={...previous,status:"stopped",stoppedAt:new Date().toISOString(),reconnectInMs:0};
      this.recomputeStatus();this.emitState();return this.snapshot();
    }
    item.status="stopping";this.updateStateItem(item,false);
    await new Promise(resolve=>{
      const child=item.child;let done=false;
      const finish=()=>{if(done)return;done=true;resolve()};
      child?.once?.("close",finish);
      try{child?.stdin?.write?.("q\n")}catch{}
      const killer=setTimeout(()=>{try{child?.kill?.("SIGTERM")}catch{};setTimeout(()=>{try{child?.kill?.("SIGKILL")}catch{};finish()},900).unref?.()},2500);killer.unref?.();
    });
    this.recomputeStatus();return this.snapshot();
  }

  async startTarget(targetId){
    const id=safeText(targetId,64);
    if(!id)throw new Error("Streaming-Ziel-ID fehlt.");
    if(!this.desiredRunning||!this.lastStartInput)throw new Error("Streaming Engine läuft nicht.");
    const target=(Array.isArray(this.lastStartInput.targets)?this.lastStartInput.targets:[]).find(item=>String(item?.id||"")===id);
    if(!target)throw new Error("Streaming-Ziel ist in der laufenden Session nicht aktiviert.");
    if(this.processes.has(id))throw new Error("Dieses Streaming-Ziel läuft bereits.");
    const reconnect=this.reconnectTimers.get(id);if(reconnect)clearTimeout(reconnect);this.reconnectTimers.delete(id);
    this.pausedTargets.delete(id);
    this.startDestination(target,{reconnectAttempt:0});
    this.recomputeStatus();return this.snapshot();
  }

  async stop(){
    this.desiredRunning=false;this.lastStartInput=null;this.pausedTargets.clear();
    for(const timer of this.reconnectTimers.values())clearTimeout(timer);this.reconnectTimers.clear();
    for(const timer of this.sceneBusRecoveryTimers.values())clearTimeout(timer);this.sceneBusRecoveryTimers.clear();
    for(const timer of this.watchdogTimers.values())clearInterval(timer);this.watchdogTimers.clear();
    const waits=[];
    for(const item of this.processes.values()){
      item.status="stopping";this.updateStateItem(item,false);
      waits.push(new Promise(resolve=>{
        const child=item.child;let done=false;
        const finish=()=>{if(done)return;done=true;resolve()};
        child?.once?.("close",finish);
        try{child?.stdin?.write?.("q\n")}catch{}
        const killer=setTimeout(()=>{try{child?.kill?.("SIGTERM")}catch{};setTimeout(()=>{try{child?.kill?.("SIGKILL")}catch{};finish()},1200).unref?.()},3500);killer.unref?.();
      }));
    }
    await Promise.allSettled(waits);this.processes.clear();try{this.sceneFrameBusManager?.releaseAll?.()}catch{}this.sceneBusMeta.clear();try{this.widgetFrameSourceManager?.releaseAll?.()}catch{}try{this.applicationAudioSourceManager?.releaseAll?.()}catch{}try{this.gameCaptureSourceManager?.releaseAll?.()}catch{}this.state.status="idle";this.state.stoppedAt=new Date().toISOString();this.recomputeStatus();return this.snapshot();
  }

  recomputeStatus(){
    const active=[...this.processes.values()].filter(x=>["starting","live"].includes(x.status)).length;
    this.state.metrics.active=active;
    this.state.status=this.desiredRunning?(active?"running":"reconnecting"):"idle";
    this.emitState();
  }
  emitState(){this.emit("state",this.snapshot())}
  telemetry(){
    const snapshot=this.snapshot();
    const destinations={};
    let uploadKbps=0,liveTargets=0,minSpeed=null,totalFps=0,fpsRows=0;
    for(const [id,row] of Object.entries(snapshot.destinations||{})){
      const metrics=row?.metrics||{};
      const bitrate=Math.max(0,Number(metrics.bitrateKbps||row.configuredBitrateKbps||0));
      if(["starting","live","reconnecting"].includes(String(row?.status||"")))uploadKbps+=bitrate;
      if(row?.status==="live")liveTargets+=1;
      const speed=Number(metrics.speed||0);if(speed>0)minSpeed=minSpeed===null?speed:Math.min(minSpeed,speed);
      const fps=Number(metrics.fps||0);if(fps>0){totalFps+=fps;fpsRows+=1}
      destinations[id]={id:String(id).slice(0,64),label:safeText(row?.label,80),provider:safeText(row?.provider,32),status:safeText(row?.status,24),startedAt:row?.startedAt||null,stoppedAt:row?.stoppedAt||null,reconnectAttempt:Number(row?.reconnectAttempt||0),reconnectAt:row?.reconnectAt||null,profile:safeText(row?.profile,40),encoder:safeText(row?.encoder,40),configuredBitrateKbps:Number(row?.configuredBitrateKbps||0),metrics:{fps:Number(metrics.fps||0),bitrateKbps:Number(metrics.bitrateKbps||0),speed:Number(metrics.speed||0),droppedFrames:Number(metrics.droppedFrames||0),duplicatedFrames:Number(metrics.duplicatedFrames||0)}};
    }
    const recording=snapshot.recording?{status:safeText(snapshot.recording.status,24),startedAt:snapshot.recording.startedAt||null,stoppedAt:snapshot.recording.stoppedAt||null,profile:safeText(snapshot.recording.profile,40),encoder:safeText(snapshot.recording.encoder,40),metrics:{fps:Number(snapshot.recording.metrics?.fps||0),bitrateKbps:Number(snapshot.recording.metrics?.bitrateKbps||0),speed:Number(snapshot.recording.metrics?.speed||0),droppedFrames:Number(snapshot.recording.metrics?.droppedFrames||0),duplicatedFrames:Number(snapshot.recording.metrics?.duplicatedFrames||0)}}:null;
    return {schema:1,status:safeText(snapshot.status,24),available:snapshot.available===true,desiredRunning:snapshot.desiredRunning===true,checkedAt:snapshot.checkedAt||null,startedAt:snapshot.startedAt||null,stoppedAt:snapshot.stoppedAt||null,metrics:{active:Number(snapshot.metrics?.active||0),errors:Number(snapshot.metrics?.errors||0),reconnects:Number(snapshot.metrics?.reconnects||0),watchdogRestarts:Number(snapshot.metrics?.watchdogRestarts||0),droppedFrames:Number(snapshot.metrics?.droppedFrames||0),sceneSwitches:Number(snapshot.metrics?.sceneSwitches||0),sceneSwitchFailures:Number(snapshot.metrics?.sceneSwitchFailures||0),sceneTransitions:Number(snapshot.metrics?.sceneTransitions||0),sceneTransitionFallbacks:Number(snapshot.metrics?.sceneTransitionFallbacks||0),uploadKbps:Math.round(uploadKbps),liveTargets,encoderSpeed:minSpeed===null?0:Number(minSpeed.toFixed(2)),averageFps:fpsRows?Number((totalFps/fpsRows).toFixed(1)):0},sceneRuntime:snapshot.sceneRuntime||null,destinations,recording};
  }
  snapshot(){const busSnapshot=this.sceneFrameBusManager?.snapshot?.()||{buses:[]},gameCapture=this.gameCaptureSourceManager?.snapshot?.()||null;return JSON.parse(JSON.stringify({...this.state,gameCapture,sceneRuntime:{...(this.state.sceneRuntime||{}),buses:busSnapshot.buses||[]},capabilities:this.capabilities,desiredRunning:this.desiredRunning}))}
}

module.exports={StreamEngine,PROFILE_MAP,ENCODER_MAP,profileFor,outputUrl,redactSecrets,cleanDeviceName,normalizeSceneTransition};
