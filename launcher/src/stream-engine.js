const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");

const PROFILE_MAP = Object.freeze({
  "1080p60":{width:1920,height:1080,fps:60},
  "1080p30":{width:1920,height:1080,fps:30},
  "720p60":{width:1280,height:720,fps:60},
  "vertical1080p60":{width:1080,height:1920,fps:60}
});
const ENCODER_MAP = Object.freeze({software:"libx264",nvenc:"h264_nvenc",amd:"h264_amf",qsv:"h264_qsv"});
const RECONNECT_DELAYS = [1500, 3000, 6000, 12000, 20000, 30000];

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

class StreamEngine extends EventEmitter {
  constructor({logger=null, resourcesPath="", videosPath="", platform=process.platform, env=process.env, spawnFn=spawn}={}) {
    super();
    this.logger=logger;
    this.resourcesPath=resourcesPath;
    this.videosPath=videosPath;
    this.platform=platform;
    this.env=env;
    this.spawnFn=spawnFn;
    this.ffmpegPath="";
    this.capabilities={gdigrab:false,dshow:false,encoders:{software:true,nvenc:false,amd:false,qsv:false}};
    this.processes=new Map();
    this.reconnectTimers=new Map();
    this.watchdogTimers=new Map();
    this.pausedTargets=new Set();
    this.lastProgressEmitAt=0;
    this.desiredRunning=false;
    this.lastStartInput=null;
    this.state={status:"idle",available:false,checkedAt:null,error:"",startedAt:null,stoppedAt:null,capture:null,recording:null,destinations:{},metrics:{active:0,errors:0,reconnects:0,watchdogRestarts:0,droppedFrames:0}};
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
        const deviceText=`${devices.stdout}\n${devices.stderr}`;
        const encoderText=`${encoders.stdout}\n${encoders.stderr}`;
        this.ffmpegPath=candidate.path;
        this.capabilities={
          gdigrab:/\bgdigrab\b/i.test(deviceText),
          dshow:/\bdshow\b/i.test(deviceText),
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
    const type=["screen","window","camera"].includes(input.type)?input.type:"screen";
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
      return {args,hasAudio:audioInputs.length>0,audioInputs,type,fps};
    }
    if(type==="window"){
      const title=escapeGdiTitle(input.windowTitle);
      if(!title)throw new Error("Für Fenster-Capture fehlt der Fenstertitel.");
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
    return {args,hasAudio:audioInputs.length>0,audioInputs,type,fps};
  }

  buildAudioMixArgs(captureInfo={}) {
    const inputs=Array.isArray(captureInfo.audioInputs)?captureInfo.audioInputs:[];
    if(!inputs.length)return {args:[],label:"",buses:[]};
    const filters=[];
    const labels=[];
    const buses=[];
    for(let i=0;i<inputs.length;i++){
      const item=inputs[i];
      const volume=item.muted?0:Math.max(0,Math.min(2,Number.isFinite(Number(item.volume))?Number(item.volume):1));
      const delayMs=clamp(item.delayMs,0,2000,0);
      const label=`cfs_a${i}`;
      const chain=["aresample=48000"];
      if(delayMs>0)chain.push(`adelay=${delayMs}|${delayMs}`);
      chain.push(`volume=${volume.toFixed(3)}`);
      filters.push(`[${item.index}:a:0]${chain.join(",")}[${label}]`);
      labels.push(`[${label}]`);
      buses.push({bus:item.bus||`audio${i+1}`,device:item.device,volume,muted:item.muted===true,delayMs});
    }
    const output="cfs_audio";
    if(labels.length===1)filters.push(`${labels[0]}anull[${output}]`);
    else filters.push(`${labels.join("")}amix=inputs=${labels.length}:duration=longest:dropout_transition=2:normalize=0[${output}]`);
    return {args:["-filter_complex",filters.join(";"),"-map","0:v:0","-map",`[${output}]`],label:output,buses};
  }

  buildRecordingAudioArgs(captureInfo={}, trackConfig={}) {
    const inputs=Array.isArray(captureInfo.audioInputs)?captureInfo.audioInputs:[];
    if(!inputs.length)return {args:[],tracks:[],buses:[],hasAudio:false};
    const requested={
      mix:trackConfig?.mix!==false,
      audio1:trackConfig?.audio1!==false,
      audio2:trackConfig?.audio2!==false
    };
    if(!Object.values(requested).some(Boolean))requested.mix=true;

    const filters=[];
    const mixLabels=[];
    const directLabels=[];
    const buses=[];
    for(let i=0;i<inputs.length;i++){
      const item=inputs[i];
      const key=i===0?"audio1":"audio2";
      const wantsDirect=requested[key]===true;
      const wantsMix=requested.mix===true;
      const volume=item.muted?0:Math.max(0,Math.min(2,Number.isFinite(Number(item.volume))?Number(item.volume):1));
      const delayMs=clamp(item.delayMs,0,2000,0);
      const chain=["aresample=48000"];
      if(delayMs>0)chain.push(`adelay=${delayMs}|${delayMs}`);
      chain.push(`volume=${volume.toFixed(3)}`);
      const base=`cfs_rec_a${i}`;
      if(wantsMix&&wantsDirect){
        filters.push(`[${item.index}:a:0]${chain.join(",")},asplit=2[${base}_mix][${base}_track]`);
        mixLabels.push(`[${base}_mix]`);
        directLabels.push({label:`[${base}_track]`,title:i===0?"Audio 1 · Mic/Mix":"Audio 2 · Desktop/Loopback",key});
      }else if(wantsMix){
        filters.push(`[${item.index}:a:0]${chain.join(",")}[${base}_mix]`);
        mixLabels.push(`[${base}_mix]`);
      }else if(wantsDirect){
        filters.push(`[${item.index}:a:0]${chain.join(",")}[${base}_track]`);
        directLabels.push({label:`[${base}_track]`,title:i===0?"Audio 1 · Mic/Mix":"Audio 2 · Desktop/Loopback",key});
      }
      buses.push({bus:item.bus||key,device:item.device,volume,muted:item.muted===true,delayMs});
    }

    const maps=["-map","0:v:0"];
    const tracks=[];
    if(requested.mix&&mixLabels.length){
      const mixOut="cfs_rec_mix";
      if(mixLabels.length===1)filters.push(`${mixLabels[0]}anull[${mixOut}]`);
      else filters.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=2:normalize=0[${mixOut}]`);
      maps.push("-map",`[${mixOut}]`);
      tracks.push({key:"mix",title:"Stream Mix"});
    }
    for(const row of directLabels){
      maps.push("-map",row.label);
      tracks.push({key:row.key,title:row.title});
    }
    if(!tracks.length)return {args:[],tracks:[],buses,hasAudio:false};
    const metadata=[];
    tracks.forEach((track,index)=>metadata.push(`-metadata:s:a:${index}`,`title=${track.title}`));
    return {args:["-filter_complex",filters.join(";"),...maps,...metadata],tracks,buses,hasAudio:true};
  }

  buildEncodingArgs({profile="1080p60",encoder="auto",bitrateKbps=6000,audioBitrateKbps=160,hasAudio=false,crop=null}={}) {
    const p=profileFor(profile),selected=this.resolveEncoder(encoder),codec=ENCODER_MAP[selected]||ENCODER_MAP.software;
    const bitrate=clamp(bitrateKbps,1000,30000,6000),audio=clamp(audioBitrateKbps,64,320,160);
    const cropFilter=crop&&Number(crop.width)>0&&Number(crop.height)>0?`crop=${clamp(crop.width,64,7680,1920)}:${clamp(crop.height,64,4320,1080)}:${clamp(crop.x,0,10000,0)}:${clamp(crop.y,0,10000,0)},`:"";
    const vf=`${cropFilter}scale=${p.width}:${p.height}:force_original_aspect_ratio=decrease,pad=${p.width}:${p.height}:(ow-iw)/2:(oh-ih)/2`;
    const args=["-vf",vf,"-r",String(p.fps),"-c:v",codec,"-b:v",`${bitrate}k`,"-maxrate",`${bitrate}k`,"-bufsize",`${bitrate*2}k`,"-g",String(p.fps*2),"-pix_fmt","yuv420p"];
    if(selected==="software")args.push("-preset","veryfast","-tune","zerolatency");
    else if(selected==="nvenc")args.push("-preset","p4","-tune","ll","-rc","cbr");
    if(hasAudio)args.push("-c:a","aac","-b:a",`${audio}k`,`-ar`,`48000`,`-ac`,`2`);else args.push("-an");
    return {args,profile:p,encoder:selected,bitrateKbps:bitrate,audioBitrateKbps:audio};
  }

  buildStreamArgs({capture={},target={},credential={}}={}) {
    const profile=target.profile||"1080p60";
    const cap=this.buildCaptureArgs({...capture,fps:profileFor(profile).fps});
    const mix=this.buildAudioMixArgs(cap);
    const encoding=this.buildEncodingArgs({profile,encoder:target.encoder||capture.encoder||"auto",bitrateKbps:target.bitrate_kbps,audioBitrateKbps:target.audio_bitrate_kbps,hasAudio:cap.hasAudio,crop:capture.crop});
    const url=outputUrl(credential.serverUrl,credential.streamKey);
    return {args:["-hide_banner","-loglevel","info","-stats",...cap.args,...mix.args,...encoding.args,"-f","flv",url],secrets:[credential.serverUrl,credential.streamKey,url],profile:encoding.profile,encoder:encoding.encoder,audioBuses:mix.buses};
  }

  buildRecordingArgs({capture={},output={},filePath=""}={}) {
    const profile=output.profile||"1080p60";
    const cap=this.buildCaptureArgs({...capture,fps:profileFor(profile).fps});
    const recordingAudio=this.buildRecordingAudioArgs(cap,output.recording_tracks||{});
    const encoding=this.buildEncodingArgs({profile,encoder:output.encoder||capture.encoder||"auto",bitrateKbps:output.bitrate_kbps,audioBitrateKbps:output.audio_bitrate_kbps,hasAudio:recordingAudio.hasAudio,crop:capture.crop});
    const format=output.recording_format==="mp4"?"mp4":"matroska";
    return {args:["-hide_banner","-loglevel","info","-stats",...cap.args,...recordingAudio.args,...encoding.args,"-f",format,filePath],profile:encoding.profile,encoder:encoding.encoder,audioBuses:recordingAudio.buses,audioTracks:recordingAudio.tracks};
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

  launchProcess(id,args,{secrets=[],kind="stream",target=null,reconnect=true,runtime={}}={}) {
    const item={id,kind,target,status:"starting",startedAt:new Date().toISOString(),lastError:"",reconnectAttempt:0,profile:safeText(runtime.profile,40),encoder:safeText(runtime.encoder,40),configuredBitrateKbps:clamp(runtime.bitrateKbps,0,30000,0),configuredAudioBitrateKbps:clamp(runtime.audioBitrateKbps,0,320,0),audioTracks:Array.isArray(runtime.audioTracks)?runtime.audioTracks.slice(0,3).map(track=>({key:safeText(track?.key,24),title:safeText(track?.title,80)})):[],metrics:{fps:0,bitrateKbps:0,speed:0,droppedFrames:0,duplicatedFrames:0},lastProgressAt:Date.now()};
    const child=this.spawnFn(this.ffmpegPath,args,{windowsHide:true,stdio:["pipe","ignore","pipe"]});
    item.child=child;this.processes.set(id,item);this.updateStateItem(item);
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
      this.clearWatchdog(id);
      const wasDesired=this.desiredRunning;
      this.processes.delete(id);
      item.child=null;
      if(item.status!=="stopping")item.status=code===0?"stopped":"error";
      if(code!==0&&item.status!=="stopping"){item.lastError=item.lastError||`FFmpeg wurde mit Code ${code} beendet.`;this.state.metrics.errors++}
      item.stoppedAt=new Date().toISOString();this.updateStateItem(item);
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
    const publicItem={id:item.id,kind:item.kind,status:item.status,startedAt:item.startedAt||null,stoppedAt:item.stoppedAt||null,lastError:safeText(item.lastError,260),lastMessage:safeText(item.lastMessage,260),reconnectAttempt:Number(item.reconnectAttempt||0),reconnectAt:item.reconnectAt||null,profile:safeText(item.profile,40),encoder:safeText(item.encoder,40),configuredBitrateKbps:Number(item.configuredBitrateKbps||0),configuredAudioBitrateKbps:Number(item.configuredAudioBitrateKbps||0),audioTracks:Array.isArray(item.audioTracks)?item.audioTracks.slice(0,3).map(track=>({key:safeText(track?.key,24),title:safeText(track?.title,80)})):[],metrics:{...item.metrics},provider:item.target?.provider||"",label:item.target?.label||item.id};
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
    if(["screen","window"].includes(captureType)&&!this.capabilities.gdigrab)throw new Error("Dieser FFmpeg-Build unterstützt gdigrab für Bildschirm-/Fenster-Capture nicht.");
    if((captureType==="camera"||input.capture?.audioDevice||input.capture?.audioDevice2)&&!this.capabilities.dshow)throw new Error("Dieser FFmpeg-Build unterstützt dshow für Kamera/Audio nicht.");
    const targets=(Array.isArray(input.targets)?input.targets:[]).filter(t=>t&&t.enabled!==false).slice(0,8);
    if(!targets.length&&!input.recording)throw new Error("Kein Streaming-Ziel oder Recording aktiviert.");
    this.desiredRunning=true;this.lastStartInput=input;this.pausedTargets.clear();this.state={...this.state,status:"starting",error:"",startedAt:new Date().toISOString(),stoppedAt:null,capture:{type:input.capture?.type||"screen",windowTitle:safeText(input.capture?.windowTitle,120),displayId:safeText(input.capture?.displayId,80),region:input.capture?.region||null,crop:input.capture?.crop||null,audioDevice:safeText(input.capture?.audioDevice,120),audioDevice2:safeText(input.capture?.audioDevice2,120)},destinations:{},recording:null};
    const failures=[];
    for(const target of targets){try{this.startDestination(target)}catch(error){failures.push({id:target.id,error:String(error?.message||error)});this.state.destinations[target.id]={id:target.id,status:"error",lastError:String(error?.message||error),label:target.label||target.id,provider:target.provider||""}}}
    if(input.recording){try{this.startRecording(input.output||{})}catch(error){failures.push({id:"recording",error:String(error?.message||error)})}}
    this.recomputeStatus();
    if(failures.length===targets.length+(input.recording?1:0)){this.desiredRunning=false;throw new Error(failures.map(x=>`${x.id}: ${x.error}`).join(" | "))}
    return this.snapshot();
  }

  startDestination(target,{reconnectAttempt=0}={}){
    if(!this.lastStartInput)throw new Error("Streaming-Startkonfiguration fehlt.");
    const id=safeText(target.id,64);if(!id)throw new Error("Streaming-Ziel-ID fehlt.");
    const credential=this.lastStartInput.credentials?.[id];
    if(!credential?.serverUrl||!credential?.streamKey)throw new Error(`Lokale Zugangsdaten für ${target.label||id} fehlen.`);
    const built=this.buildStreamArgs({capture:this.lastStartInput.capture||{},target,credential});
    const item=this.launchProcess(id,built.args,{secrets:built.secrets,kind:"stream",target,reconnect:true,runtime:{profile:target.profile||"1080p60",encoder:built.encoder,bitrateKbps:target.bitrate_kbps,audioBitrateKbps:target.audio_bitrate_kbps}});item.reconnectAttempt=reconnectAttempt;item.reconnectAt=null;this.updateStateItem(item);
    return item;
  }

  startRecording(output={}){
    if(!this.lastStartInput)throw new Error("Streaming-Startkonfiguration fehlt.");
    const filePath=this.recordingPath(output.recording_format||"mkv");
    const built=this.buildRecordingArgs({capture:this.lastStartInput.capture||{},output,filePath});
    const item=this.launchProcess("recording",built.args,{kind:"recording",target:{label:"Recording"},reconnect:false,runtime:{profile:output.profile||"1080p60",encoder:built.encoder,bitrateKbps:output.bitrate_kbps,audioBitrateKbps:output.audio_bitrate_kbps,audioTracks:built.audioTracks||[]}});item.filePath=filePath;this.state.recording={...this.state.recording,filePath};return item;
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
    await Promise.allSettled(waits);this.processes.clear();this.state.status="idle";this.state.stoppedAt=new Date().toISOString();this.recomputeStatus();return this.snapshot();
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
    return {schema:1,status:safeText(snapshot.status,24),available:snapshot.available===true,desiredRunning:snapshot.desiredRunning===true,checkedAt:snapshot.checkedAt||null,startedAt:snapshot.startedAt||null,stoppedAt:snapshot.stoppedAt||null,metrics:{active:Number(snapshot.metrics?.active||0),errors:Number(snapshot.metrics?.errors||0),reconnects:Number(snapshot.metrics?.reconnects||0),watchdogRestarts:Number(snapshot.metrics?.watchdogRestarts||0),droppedFrames:Number(snapshot.metrics?.droppedFrames||0),uploadKbps:Math.round(uploadKbps),liveTargets,encoderSpeed:minSpeed===null?0:Number(minSpeed.toFixed(2)),averageFps:fpsRows?Number((totalFps/fpsRows).toFixed(1)):0},destinations,recording};
  }
  snapshot(){return JSON.parse(JSON.stringify({...this.state,capabilities:this.capabilities,desiredRunning:this.desiredRunning}))}
}

module.exports={StreamEngine,PROFILE_MAP,ENCODER_MAP,profileFor,outputUrl,redactSecrets,cleanDeviceName};
