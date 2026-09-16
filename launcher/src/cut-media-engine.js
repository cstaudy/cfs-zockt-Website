"use strict";

const fs=require("node:fs");
const path=require("node:path");
const {spawn}=require("node:child_process");
const EventEmitter=require("node:events");

function safeName(value,fallback="clip"){
  const out=String(value||"").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
  return out||fallback;
}
function positiveInt(value,fallback,min=1,max=10000){
  const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function clamp(value,min,max,fallback){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function formatSeconds(ms){return(Math.max(0,Number(ms)||0)/1000).toFixed(3)}
function escapeDrawtext(value){
  return String(value??"")
    .replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/:/g,"\\:")
    .replace(/,/g,"\\,").replace(/\[/g,"\\[").replace(/\]/g,"\\]")
    .replace(/\r?\n/g," ");
}
function uniqueCandidates(items){
  const seen=new Set(),out=[];
  for(const item of items){
    const key=String(item?.path||"");if(!key||seen.has(key))continue;
    seen.add(key);out.push(item);
  }
  return out;
}

class CutMediaEngine extends EventEmitter{
  constructor({outputRoot,logger=null,spawnImpl=spawn,env=process.env,platform=process.platform,resourcesPath="",execPath=process.execPath}={}){
    super();
    this.outputRoot=outputRoot||path.join(process.cwd(),"cfs-cut-exports");
    this.logger=logger;
    this.spawnImpl=spawnImpl;
    this.env=env||{};
    this.platform=platform;
    this.resourcesPath=resourcesPath||"";
    this.execPath=execPath||"";
    this.ffmpegPath=null;
    this.state={
      status:"idle",available:false,ffmpegPath:"",ffmpegSource:"",version:"",
      capabilities:{
        drawtext:false,concat:true,xfade:false,acrossfade:false,loudnorm:false,zoompan:false,rotate:false,blend:false,amix:false,sidechaincompress:false,
        encoders:{software:true,nvenc:false,qsv:false,amf:false}
      },
      jobId:null,clipIndex:0,clipCount:0,progress:0,phase:"idle",mode:"clips",
      encoder:"software",transition:"cut",lastOutputDir:"",error:"",checkedAt:null
    };
  }
  snapshot(){
    return{
      ...this.state,
      capabilities:{
        ...(this.state.capabilities||{}),
        encoders:{...(this.state.capabilities?.encoders||{})}
      }
    }
  }
  emitState(patch={}){this.state={...this.state,...patch};this.emit("state",this.snapshot());return this.snapshot()}
  candidates(){
    const exe=this.platform==="win32"?"ffmpeg.exe":"ffmpeg";
    const list=[];
    if(this.env.CFS_FFMPEG_PATH)list.push({path:String(this.env.CFS_FFMPEG_PATH),source:"env"});
    if(this.resourcesPath){
      list.push({path:path.join(this.resourcesPath,"ffmpeg",exe),source:"bundled"});
      list.push({path:path.join(this.resourcesPath,"bin",exe),source:"bundled"});
      list.push({path:path.join(this.resourcesPath,exe),source:"bundled"});
    }
    if(this.execPath)list.push({path:path.join(path.dirname(this.execPath),exe),source:"app"});
    list.push({path:exe,source:"path"});
    return uniqueCandidates(list);
  }
  runProcess(command,args,{timeoutMs=0,onStderr=null,cwd=null}={}){
    return new Promise((resolve,reject)=>{
      let settled=false,stderr="",stdout="";
      const child=this.spawnImpl(command,args,{windowsHide:true,stdio:["ignore","pipe","pipe"],...(cwd?{cwd}:{})});
      let timer=null;
      if(timeoutMs>0)timer=setTimeout(()=>{if(!settled){try{child.kill("SIGKILL")}catch{};settled=true;reject(new Error("Prozess-Timeout."))}},timeoutMs);
      child.stdout?.on?.("data",chunk=>{stdout+=String(chunk);if(stdout.length>60000)stdout=stdout.slice(-60000)});
      child.stderr?.on?.("data",chunk=>{const text=String(chunk);stderr+=text;if(stderr.length>60000)stderr=stderr.slice(-60000);onStderr?.(text)});
      child.once("error",error=>{if(settled)return;settled=true;if(timer)clearTimeout(timer);reject(error)});
      child.once("close",code=>{if(settled)return;settled=true;if(timer)clearTimeout(timer);if(code===0)resolve({code,stdout,stderr});else reject(Object.assign(new Error(`FFmpeg wurde mit Code ${code} beendet.`),{code,stderr,stdout}))});
    });
  }
  async probe(){
    this.emitState({status:"probing",phase:"probe",error:""});
    for(const candidate of this.candidates()){
      try{
        const versionResult=await this.runProcess(candidate.path,["-version"],{timeoutMs:3500});
        const first=String(versionResult.stdout||versionResult.stderr||"").split(/\r?\n/).find(Boolean)||"ffmpeg";
        let filterText="",encoderText="";
        try{
          const filters=await this.runProcess(candidate.path,["-hide_banner","-filters"],{timeoutMs:5000});
          filterText=String(filters.stdout||filters.stderr||"");
        }catch{}
        try{
          const encoders=await this.runProcess(candidate.path,["-hide_banner","-encoders"],{timeoutMs:5000});
          encoderText=String(encoders.stdout||encoders.stderr||"");
        }catch{}
        const capabilities={
          drawtext:/(^|\s)drawtext(\s|$)/m.test(filterText),
          concat:true,
          xfade:/(^|\s)xfade(\s|$)/m.test(filterText),
          acrossfade:/(^|\s)acrossfade(\s|$)/m.test(filterText),
          loudnorm:/(^|\s)loudnorm(\s|$)/m.test(filterText),
          zoompan:/(^|\s)zoompan(\s|$)/m.test(filterText),
          rotate:/(^|\s)rotate(\s|$)/m.test(filterText),
          blend:/(^|\s)blend(\s|$)/m.test(filterText),
          amix:/(^|\s)amix(\s|$)/m.test(filterText),
          sidechaincompress:/(^|\s)sidechaincompress(\s|$)/m.test(filterText),
          encoders:{
            software:/(^|\s)libx264(\s|$)/m.test(encoderText)||!encoderText,
            nvenc:/(^|\s)h264_nvenc(\s|$)/m.test(encoderText),
            qsv:/(^|\s)h264_qsv(\s|$)/m.test(encoderText),
            amf:/(^|\s)h264_amf(\s|$)/m.test(encoderText)
          }
        };
        this.ffmpegPath=candidate.path;
        return this.emitState({
          status:"idle",phase:"idle",available:true,ffmpegPath:candidate.path,ffmpegSource:candidate.source,
          version:first.slice(0,240),capabilities,checkedAt:new Date().toISOString(),error:""
        });
      }catch{}
    }
    this.ffmpegPath=null;
    return this.emitState({
      status:"idle",phase:"idle",available:false,ffmpegPath:"",ffmpegSource:"",version:"",
      capabilities:{drawtext:false,concat:false,xfade:false,acrossfade:false,loudnorm:false,zoompan:false,rotate:false,blend:false,amix:false,sidechaincompress:false,encoders:{software:true,nvenc:false,qsv:false,amf:false}},
      checkedAt:new Date().toISOString(),
      error:"FFmpeg wurde nicht gefunden. Installiere FFmpeg, setze CFS_FFMPEG_PATH oder stage ffmpeg.exe für den Windows-Build."
    });
  }
  async probeSourceAudio(sourcePath){
    try{
      await this.runProcess(this.ffmpegPath,[
        "-hide_banner","-loglevel","error","-i",sourcePath,
        "-map","0:a:0","-frames:a","1","-f","null","-"
      ],{timeoutMs:15000});
      return true;
    }catch{return false}
  }
  async analyzeAudio(sourcePath,key="audio"){
    if(!sourcePath||!fs.existsSync(sourcePath))throw new Error("Lokale Audiodatei fehlt.");
    if(!this.ffmpegPath){const probe=await this.probe();if(!probe.available)return{available:false,peak_db:null,mean_db:null,duration_ms:null,waveform_path:"",analyzed_at:new Date().toISOString()}}
    let peak=null,mean=null,durationMs=null;
    try{
      const result=await this.runProcess(this.ffmpegPath,["-hide_banner","-i",sourcePath,"-af","volumedetect","-f","null","-"],{timeoutMs:120000});
      const log=String(result.stderr||"");
      const peakMatch=log.match(/max_volume:\s*(-?[\d.]+)\s*dB/i),meanMatch=log.match(/mean_volume:\s*(-?[\d.]+)\s*dB/i),durationMatch=log.match(/Duration:\s*(\d+):(\d+):([\d.]+)/i);
      if(peakMatch)peak=Number(peakMatch[1]);
      if(meanMatch)mean=Number(meanMatch[1]);
      if(durationMatch)durationMs=Math.round((Number(durationMatch[1])*3600+Number(durationMatch[2])*60+Number(durationMatch[3]))*1000);
    }catch{}
    let waveformPath="";
    try{
      const dir=path.join(this.outputRoot,"_analysis");
      fs.mkdirSync(dir,{recursive:true});
      waveformPath=path.join(dir,`${safeName(key,"audio")}-waveform.png`);
      await this.runProcess(this.ffmpegPath,[
        "-hide_banner","-loglevel","error","-y","-i",sourcePath,
        "-filter_complex","aformat=channel_layouts=mono,showwavespic=s=640x96:split_channels=0",
        "-frames:v","1",waveformPath
      ],{timeoutMs:120000});
      if(!fs.existsSync(waveformPath))waveformPath="";
    }catch{waveformPath=""}
    return{available:peak!==null||mean!==null||Boolean(waveformPath),peak_db:peak,mean_db:mean,duration_ms:durationMs,waveform_path:waveformPath,analyzed_at:new Date().toISOString()};
  }
  captionFilter(clip){
    if(!clip?.caption_enabled||!String(clip.caption||"").trim())return"";
    const value=escapeDrawtext(clip.caption);
    const size=positiveInt(clip.caption_size,52,18,120);
    const position=["top","center","bottom"].includes(String(clip.caption_position||""))?String(clip.caption_position):"bottom";
    const style=["box","outline","clean"].includes(String(clip.caption_style||""))?String(clip.caption_style):"box";
    const y=position==="top"?"h*0.08":position==="center"?"(h-text_h)/2":"h-text_h-h*0.08";
    const styleArgs=style==="box"
      ?":box=1:boxcolor=black@0.68:boxborderw=18"
      :style==="outline"
        ?":borderw=4:bordercolor=black@0.92"
        :":shadowx=2:shadowy=2:shadowcolor=black@0.9";
    return `drawtext=text='${value}':expansion=none:fontcolor=white:fontsize=${size}:x=(w-text_w)/2:y=${y}${styleArgs}`;
  }
  normalizedKeyframePoints(clip={}){
    const raw=Array.isArray(clip.visual_keyframes)?clip.visual_keyframes:[];
    const points=raw.slice(0,8).map(p=>({
      at:clamp(p?.at,0,1,0),
      zoom:clamp(p?.zoom,1,2.5,1),
      pan_x:clamp(p?.pan_x,-1,1,0),
      pan_y:clamp(p?.pan_y,-1,1,0),
      rotation:clamp(p?.rotation,-180,180,0),
      opacity:clamp(p?.opacity,0,1,1),
      easing:["linear","ease_in_out","bezier"].includes(String(p?.easing||""))?String(p.easing):"linear",
      bezier_y1:clamp(p?.bezier_y1,0,1,.25),
      bezier_y2:clamp(p?.bezier_y2,0,1,.75)
    })).sort((a,b)=>a.at-b.at);
    const dedup=[];
    for(const point of points){
      if(dedup.length&&Math.abs(dedup.at(-1).at-point.at)<.0001)dedup[dedup.length-1]=point;
      else dedup.push(point);
    }
    if(dedup.length>=2){
      if(dedup[0].at>0)dedup.unshift({...dedup[0],at:0});
      if(dedup.at(-1).at<1)dedup.push({...dedup.at(-1),at:1});
      return dedup.slice(0,8);
    }
    return[
      {at:0,zoom:clamp(clip.keyframe_zoom_start,1,2.5,1),pan_x:clamp(clip.keyframe_pan_x_start,-1,1,0),pan_y:clamp(clip.keyframe_pan_y_start,-1,1,0),rotation:0,opacity:1,easing:"linear",bezier_y1:.25,bezier_y2:.75},
      {at:1,zoom:clamp(clip.keyframe_zoom_end,1,2.5,1),pan_x:clamp(clip.keyframe_pan_x_end,-1,1,0),pan_y:clamp(clip.keyframe_pan_y_end,-1,1,0),rotation:0,opacity:1,easing:["linear","ease_in_out","bezier"].includes(String(clip.keyframe_easing||""))?String(clip.keyframe_easing):"linear",bezier_y1:.25,bezier_y2:.75}
    ];
  }
  keyframePiecewise(points,key,progress){
    const segment=(a,b)=>{
      const span=Math.max(.0001,b.at-a.at);
      const local=`max(0,min(1,((${progress})-${a.at.toFixed(4)})/${span.toFixed(4)}))`;
      const eased=b.easing==="ease_in_out"
        ?`(0.5-0.5*cos(PI*(${local})))`
        :b.easing==="bezier"
          ?`(3*(1-(${local}))*(1-(${local}))*(${local})*${clamp(b.bezier_y1,0,1,.25).toFixed(3)}+3*(1-(${local}))*(${local})*(${local})*${clamp(b.bezier_y2,0,1,.75).toFixed(3)}+(${local})*(${local})*(${local}))`
          :`(${local})`;
      const fallback=key==="opacity"?1:0,from=Number(a[key]??fallback),to=Number(b[key]??fallback);
      return`${from.toFixed(4)}+((${(to-from).toFixed(4)})*${eased})`;
    };
    let expr=Number(points.at(-1)?.[key]||0).toFixed(4);
    for(let i=points.length-2;i>=0;i--){
      const a=points[i],b=points[i+1];
      expr=`if(lte(${progress},${b.at.toFixed(4)}),${segment(a,b)},${expr})`;
    }
    return expr;
  }
  keyframeFilter(clip,width,height,fps,durationMs){
    if(!clip?.keyframe_enabled)return"";
    const frames=Math.max(2,Math.round((Math.max(100,Number(durationMs||100))/1000)*fps));
    const progress=`min(1,on/${frames-1})`;
    const points=this.normalizedKeyframePoints(clip);
    const zoom=this.keyframePiecewise(points,"zoom",progress);
    const panX=this.keyframePiecewise(points,"pan_x",progress);
    const panY=this.keyframePiecewise(points,"pan_y",progress);
    const x=`max(0,min(iw-iw/zoom,(iw-iw/zoom)/2*(1+(${panX}))))`;
    const y=`max(0,min(ih-ih/zoom,(ih-ih/zoom)/2*(1+(${panY}))))`;
    return`zoompan=z='${zoom}':x='${x}':y='${y}':d=1:s=${width}x${height}:fps=${fps}`;
  }
  audioFilters(clip,durationMs,preset={}){
    const filters=["aresample=48000","aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"];
    const gain=clamp(clip?.audio_gain_db,-24,12,0);
    if(Math.abs(gain)>0.01)filters.push(`volume=${gain.toFixed(1)}dB`);
    const durationSec=Math.max(.1,Number(durationMs||0)/1000);
    const fadeIn=Math.min(durationSec-.02,Math.max(0,Number(clip?.audio_fade_in_ms||0)/1000));
    const fadeOut=Math.min(durationSec-.02,Math.max(0,Number(clip?.audio_fade_out_ms||0)/1000));
    if(fadeIn>.01)filters.push(`afade=t=in:st=0:d=${fadeIn.toFixed(3)}`);
    if(fadeOut>.01)filters.push(`afade=t=out:st=${Math.max(0,durationSec-fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`);
    if(preset.audio_normalize===true)filters.push("loudnorm=I=-16:LRA=11:TP=-1.5");
    return filters;
  }
  resolveEncoder(preset={}){
    const requested=["software","nvenc","qsv","amf"].includes(String(preset.encoder||""))?String(preset.encoder):"software";
    const available=this.state.capabilities?.encoders||{};
    if(requested!=="software"&&!available[requested]){
      throw new Error(`Der gewählte Hardware-Encoder ${requested.toUpperCase()} ist in diesem FFmpeg-Build nicht verfügbar.`);
    }
    const quality=preset.quality==="standard"?24:20;
    if(requested==="nvenc")return{key:"nvenc",codec:"h264_nvenc",args:["-preset","p5","-cq",String(quality),"-b:v","0"]};
    if(requested==="qsv")return{key:"qsv",codec:"h264_qsv",args:["-preset","medium","-global_quality",String(quality)]};
    if(requested==="amf")return{key:"amf",codec:"h264_amf",args:["-quality","balanced","-rc","cqp","-qp_i",String(quality),"-qp_p",String(quality),"-qp_b",String(quality)]};
    return{key:"software",codec:"libx264",args:["-preset","medium","-crf",String(quality)]};
  }
  buildArgs({sourcePath,clip,manifest,outputPath,hasAudio=true}){
    const preset=manifest?.export_preset||{};
    const width=positiveInt(preset.width,manifest?.format==="landscape"?1920:1080,64,7680);
    const height=positiveInt(preset.height,manifest?.format==="landscape"?1080:1920,64,7680);
    const fps=positiveInt(preset.fps,30,24,60);
    const bitrate=positiveInt(preset.audio_bitrate_kbps,160,96,320);
    const start=Math.max(0,Number(clip.in_ms||0));
    const end=Math.max(start+100,Number(clip.out_ms||start+100));
    const duration=end-start,durationSec=Math.max(.1,duration/1000);
    const points=this.normalizedKeyframePoints(clip);
    const filters=[`scale=${width}:${height}:force_original_aspect_ratio=decrease`,`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`];
    const keyframe=this.keyframeFilter(clip,width,height,fps,duration);
    if(keyframe)filters.push(keyframe);else filters.push(`fps=${fps}`);

    const wantsRotation=clip?.keyframe_enabled&&points.some(p=>Math.abs(Number(p.rotation||0))>.01);
    const wantsOpacity=clip?.keyframe_enabled&&points.some(p=>Number(p.opacity??1)<.999);
    if(wantsRotation){
      const rotation=this.keyframePiecewise(points,"rotation",`min(1,t/${durationSec.toFixed(4)})`);
      filters.push(`rotate=angle='(${rotation})*PI/180':fillcolor=black:ow=iw:oh=ih`);
    }
    const caption=this.captionFilter(clip);if(caption)filters.push(caption);

    const audio=this.audioFilters(clip,duration,preset),encoder=this.resolveEncoder(preset);
    const args=["-hide_banner","-loglevel","warning","-y","-ss",formatSeconds(start),"-i",sourcePath];
    if(!hasAudio)args.push("-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=48000");
    args.push("-t",formatSeconds(duration));

    if(wantsOpacity){
      const opacity=this.keyframePiecewise(points,"opacity",`min(1,T/${durationSec.toFixed(4)})`);
      const graph=[
        `[0:v]${filters.join(",")}[vproc]`,
        `color=c=black:s=${width}x${height}:r=${fps}:d=${durationSec.toFixed(3)}[vbg]`,
        `[vproc][vbg]blend=all_expr='A*(${opacity})+B*(1-(${opacity}))':shortest=1[vout]`
      ].join(";");
      args.push("-filter_complex",graph,"-map","[vout]");
    }else{
      args.push("-map","0:v:0","-vf",filters.join(","));
    }
    args.push(
      "-map",hasAudio?"0:a:0":"1:a:0","-af",audio.join(","),
      "-c:v",encoder.codec,...encoder.args,"-pix_fmt","yuv420p",
      "-c:a","aac","-b:a",`${bitrate}k`,"-ar","48000","-ac","2","-movflags","+faststart",
      outputPath
    );
    return args;
  }
  panFilter(value=0){
    const pan=clamp(value,-1,1,0),left=pan<=0?1:1-pan,right=pan>=0?1:1+pan;
    return`pan=stereo|c0=${left.toFixed(3)}*c0|c1=${right.toFixed(3)}*c1`;
  }
  buildTimelineAudioChain(inputLabel,{durationSec,gainDb=0,startMs=0,fadeInMs=0,fadeOutMs=0,pan=0}={}){
    const filters=[
      "aresample=48000",
      "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo",
      `atrim=duration=${Math.max(.1,durationSec).toFixed(3)}`,
      "asetpts=PTS-STARTPTS"
    ];
    if(Math.abs(Number(gainDb||0))>.01)filters.push(`volume=${Number(gainDb).toFixed(1)}dB`);
    if(Math.abs(Number(pan||0))>.001)filters.push(this.panFilter(pan));
    const fadeIn=Math.min(durationSec-.02,Math.max(0,Number(fadeInMs||0)/1000));
    const fadeOut=Math.min(durationSec-.02,Math.max(0,Number(fadeOutMs||0)/1000));
    if(fadeIn>.01)filters.push(`afade=t=in:st=0:d=${fadeIn.toFixed(3)}`);
    if(fadeOut>.01)filters.push(`afade=t=out:st=${Math.max(0,durationSec-fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`);
    const delay=Math.max(0,Math.round(Number(startMs||0)));
    if(delay>0)filters.push(`adelay=${delay}|${delay}`);
    filters.push(`apad=whole_dur=${durationSec.toFixed(3)}`);
    return`[${inputLabel}]${filters.join(",")}`;
  }
  buildMultitrackMixArgs(baseReelPath,{musicPath=null,voicePath=null,musicTrackSources=[],voiceTrackSources=[],sfxSources=[]}={},outputPath,preset={},durationMs=0){
    const bitrate=positiveInt(preset.audio_bitrate_kbps,160,96,320),durationSec=Math.max(.1,Number(durationMs||0)/1000);
    const extraMusicMeta=(Array.isArray(preset.music_tracks)?preset.music_tracks:[]).filter(t=>t?.enabled!==false);
    const extraVoiceMeta=(Array.isArray(preset.voice_tracks)?preset.voice_tracks:[]).filter(t=>t?.enabled!==false);
    const sfxMeta=(Array.isArray(preset.sfx_tracks)?preset.sfx_tracks:[]).filter(t=>t?.enabled!==false);

    const candidates=[
      {kind:"source",id:"source",exists:true,mute:preset.source_audio_mute===true,solo:preset.source_audio_solo===true},
      {kind:"music",id:"music_primary",exists:Boolean(musicPath&&preset.music_enabled===true),mute:preset.music_mute===true,solo:preset.music_solo===true},
      ...extraMusicMeta.map(meta=>({kind:"music_extra",id:String(meta.id),meta,source:musicTrackSources.find(s=>String(s.trackId)===String(meta.id)),exists:Boolean(musicTrackSources.find(s=>String(s.trackId)===String(meta.id))?.filePath),mute:meta.mute===true,solo:meta.solo===true})),
      {kind:"voice",id:"voice_primary",exists:Boolean(voicePath&&preset.voiceover_enabled===true),mute:preset.voiceover_mute===true,solo:preset.voiceover_solo===true},
      ...extraVoiceMeta.map(meta=>({kind:"voice_extra",id:String(meta.id),meta,source:voiceTrackSources.find(s=>String(s.trackId)===String(meta.id)),exists:Boolean(voiceTrackSources.find(s=>String(s.trackId)===String(meta.id))?.filePath),mute:meta.mute===true,solo:meta.solo===true})),
      ...sfxMeta.map(meta=>({kind:"sfx",id:String(meta.id),meta,source:sfxSources.find(s=>String(s.trackId)===String(meta.id)),exists:Boolean(sfxSources.find(s=>String(s.trackId)===String(meta.id))?.filePath),mute:meta.mute===true,solo:meta.solo===true}))
    ];
    const anySolo=candidates.some(c=>c.exists&&c.solo===true&&c.mute!==true);
    const active=candidates.filter(c=>c.exists&&c.mute!==true&&(!anySolo||c.solo===true));

    const args=["-hide_banner","-loglevel","warning","-y","-i",baseReelPath],inputs=[];let inputIndex=1;
    for(const item of active){
      if(item.kind==="source")continue;
      if(item.kind==="music"){
        if(preset.music_loop!==false)args.push("-stream_loop","-1");
        const seek=Math.max(0,Number(preset.music_start_ms||0));if(seek>0)args.push("-ss",formatSeconds(seek));
        args.push("-i",musicPath);inputs.push({...item,index:inputIndex++});
      }else if(item.kind==="music_extra"){
        if(item.meta?.loop!==false)args.push("-stream_loop","-1");
        args.push("-i",item.source.filePath);inputs.push({...item,index:inputIndex++});
      }else if(item.kind==="voice"){
        args.push("-i",voicePath);inputs.push({...item,index:inputIndex++});
      }else{
        args.push("-i",item.source.filePath);inputs.push({...item,index:inputIndex++});
      }
    }

    const graph=[],mixLabels=[],musicLabels=[],voiceMixLabels=[],voiceSideLabels=[];
    if(active.some(c=>c.kind==="source")){
      const chain=this.buildTimelineAudioChain("0:a",{durationSec,gainDb:clamp(preset.source_audio_gain_db,-24,12,0),pan:clamp(preset.source_audio_pan,-1,1,0)});
      graph.push(`${chain}[basea]`);mixLabels.push("basea");
    }

    const wantsDucking=preset.ducking_enabled===true&&active.some(c=>c.kind==="music"||c.kind==="music_extra")&&active.some(c=>c.kind==="voice"||c.kind==="voice_extra");

    for(const input of inputs){
      const m=input.meta||{};
      if(input.kind==="music"||input.kind==="music_extra"){
        const primary=input.kind==="music";
        const chain=this.buildTimelineAudioChain(`${input.index}:a`,{
          durationSec,
          gainDb:clamp(primary?preset.music_gain_db:m.gain_db,-36,12,primary?-18:-18),
          startMs:primary?0:Math.max(0,Number(m.start_ms||0)),
          fadeInMs:Math.max(0,Number(primary?preset.music_fade_in_ms:m.fade_in_ms||0)),
          fadeOutMs:Math.max(0,Number(primary?preset.music_fade_out_ms:m.fade_out_ms||0)),
          pan:clamp(primary?preset.music_pan:m.pan,-1,1,0)
        });
        const label=`music${input.index}`;graph.push(`${chain}[${label}]`);musicLabels.push(label);
      }else if(input.kind==="voice"||input.kind==="voice_extra"){
        const primary=input.kind==="voice";
        const chain=this.buildTimelineAudioChain(`${input.index}:a`,{
          durationSec,
          gainDb:clamp(primary?preset.voiceover_gain_db:m.gain_db,-24,12,0),
          startMs:Math.max(0,Number(primary?preset.voiceover_start_ms:m.start_ms||0)),
          fadeInMs:Math.max(0,Number(primary?preset.voiceover_fade_in_ms:m.fade_in_ms||0)),
          fadeOutMs:Math.max(0,Number(primary?preset.voiceover_fade_out_ms:m.fade_out_ms||0)),
          pan:clamp(primary?preset.voiceover_pan:m.pan,-1,1,0)
        });
        if(wantsDucking){
          const mixLabel=`voice${input.index}mix`,sideLabel=`voice${input.index}sc`;
          graph.push(`${chain},asplit=2[${mixLabel}][${sideLabel}]`);voiceMixLabels.push(mixLabel);voiceSideLabels.push(sideLabel);
        }else{
          const label=`voice${input.index}`;graph.push(`${chain}[${label}]`);voiceMixLabels.push(label);
        }
      }else if(input.kind==="sfx"){
        const chain=this.buildTimelineAudioChain(`${input.index}:a`,{
          durationSec,gainDb:clamp(m.gain_db,-36,12,-6),startMs:Math.max(0,Number(m.start_ms||0)),
          fadeInMs:Math.max(0,Number(m.fade_in_ms||0)),fadeOutMs:Math.max(0,Number(m.fade_out_ms||0)),pan:clamp(m.pan,-1,1,0)
        });
        const label=`sfx${input.index}`;graph.push(`${chain}[${label}]`);mixLabels.push(label);
      }
    }

    if(musicLabels.length){
      let musicBus=musicLabels[0];
      if(musicLabels.length>1){
        musicBus="musicbus";
        graph.push(`${musicLabels.map(l=>`[${l}]`).join("")}amix=inputs=${musicLabels.length}:duration=longest:dropout_transition=2:normalize=0[${musicBus}]`);
      }
      if(wantsDucking&&voiceSideLabels.length){
        let sideBus=voiceSideLabels[0];
        if(voiceSideLabels.length>1){
          sideBus="voicesidebus";
          graph.push(`${voiceSideLabels.map(l=>`[${l}]`).join("")}amix=inputs=${voiceSideLabels.length}:duration=longest:dropout_transition=2:normalize=0[${sideBus}]`);
        }
        const ratio=clamp(preset.ducking_ratio,2,20,8);
        graph.push(`[${musicBus}][${sideBus}]sidechaincompress=threshold=0.035:ratio=${ratio.toFixed(1)}:attack=20:release=350[musicduck]`);
        mixLabels.push("musicduck");
      }else mixLabels.push(musicBus);
    }
    mixLabels.push(...voiceMixLabels);

    if(!mixLabels.length){
      graph.push("[0:a]volume=0,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[silent]");
      mixLabels.push("silent");
    }
    graph.push(`${mixLabels.map(label=>`[${label}]`).join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=2:normalize=0[mix]`);
    args.push("-filter_complex",graph.join(";"),"-map","0:v:0","-map","[mix]","-c:v","copy","-c:a","aac","-b:a",`${bitrate}k`,"-ar","48000","-ac","2","-movflags","+faststart",outputPath);
    return args;
  }
  buildMusicMixArgs(baseReelPath,musicPath,outputPath,preset={},durationMs=0){
    return this.buildMultitrackMixArgs(baseReelPath,{musicPath},outputPath,preset,durationMs);
  }
  transitionName(value){
    return["fade","dissolve","wipeleft","wiperight","slideleft","slideright"].includes(String(value||""))?String(value):"fade";
  }
  transitionDurationMs(preset,segments){
    if(String(preset.transition||"cut")==="cut"||segments.length<2)return 0;
    const requested=clamp(preset.transition_ms,100,1500,350);
    const shortest=Math.min(...segments.map(s=>Math.max(100,Number(s.durationMs||100))));
    return Math.max(80,Math.min(requested,Math.floor(shortest*.45)));
  }
  buildTransitionReelArgs(segments,reelName,preset={}){
    const encoder=this.resolveEncoder(preset);
    const bitrate=positiveInt(preset.audio_bitrate_kbps,160,96,320);
    const transition=this.transitionName(preset.transition);
    const transitionMs=this.transitionDurationMs(preset,segments);
    const fps=positiveInt(preset.fps,30,24,60);
    const d=(transitionMs/1000).toFixed(3);
    const args=["-hide_banner","-loglevel","warning","-filter_complex_threads","1","-y"];
    for(const item of segments)args.push("-i",item.fileName);

    const graph=[];
    for(let i=0;i<segments.length;i++){
      graph.push(`[${i}:v]fps=${fps}[v${i}]`);
      graph.push(`[${i}:a]aresample=48000[a${i}]`);
    }
    let video="v0",audio="a0",timeline=Math.max(.1,segments[0].durationMs/1000);
    for(let i=1;i<segments.length;i++){
      const outV=`vx${i}`,outA=`ax${i}`;
      const offset=Math.max(0,timeline-transitionMs/1000);
      graph.push(`[${video}][v${i}]xfade=transition=${transition}:duration=${d}:offset=${offset.toFixed(3)}[${outV}]`);
      graph.push(`[${audio}][a${i}]acrossfade=d=${d}:c1=tri:c2=tri[${outA}]`);
      timeline=timeline+Math.max(.1,segments[i].durationMs/1000)-transitionMs/1000;
      video=outV;audio=outA;
    }
    args.push(
      "-filter_complex",graph.join(";"),
      "-map",`[${video}]`,"-map",`[${audio}]`,
      "-c:v",encoder.codec,...encoder.args,"-pix_fmt","yuv420p",
      "-c:a","aac","-b:a",`${bitrate}k`,"-ar","48000","-ac","2","-movflags","+faststart",
      reelName
    );
    return{args,durationMs:Math.round(timeline*1000),transitionMs};
  }
  buildConcatArgs(listFile,reelName){
    return["-hide_banner","-loglevel","warning","-y","-f","concat","-safe","0","-i",listFile,"-c","copy","-movflags","+faststart",reelName];
  }
  async runJob({job,sourcePath,musicPath=null,voicePath=null,musicTrackSources=[],voiceTrackSources=[],sfxSources=[]}={}){
    if(this.state.status==="processing")throw new Error("Die Media Engine verarbeitet bereits einen Job.");
    if(!job?.id)throw new Error("Cut-Job fehlt.");
    if(!sourcePath||!fs.existsSync(sourcePath))throw new Error("Lokale Quelldatei fehlt.");
    const manifest=job.manifest||{},preset=manifest.export_preset||{};
    const clips=Array.isArray(manifest.clips)?manifest.clips:[];
    if(!clips.length)throw new Error("Der Cut-Job enthält keine Clips.");
    if(!this.ffmpegPath){const probe=await this.probe();if(!probe.available)throw new Error(probe.error)}

    const wantsCaptions=clips.some(clip=>clip?.caption_enabled&&String(clip.caption||"").trim());
    const wantsKeyframes=clips.some(clip=>clip?.keyframe_enabled===true);
    const wantsRotation=clips.some(clip=>clip?.keyframe_enabled===true&&(Array.isArray(clip.visual_keyframes)?clip.visual_keyframes:[]).some(point=>Math.abs(Number(point?.rotation||0))>.01));
    const wantsOpacity=clips.some(clip=>clip?.keyframe_enabled===true&&(Array.isArray(clip.visual_keyframes)?clip.visual_keyframes:[]).some(point=>Number(point?.opacity??1)<.999));
    const wantsMusic=preset.music_enabled===true&&["reel","both"].includes(String(preset.mode||"clips"));
    const wantsVoice=preset.voiceover_enabled===true&&["reel","both"].includes(String(preset.mode||"clips"));
    const reelMode=["reel","both"].includes(String(preset.mode||"clips"));
    const wantedMusicTracks=(Array.isArray(preset.music_tracks)?preset.music_tracks:[]).filter(track=>track?.enabled!==false&&reelMode);
    const wantedVoiceTracks=(Array.isArray(preset.voice_tracks)?preset.voice_tracks:[]).filter(track=>track?.enabled!==false&&reelMode);
    const wantedSfx=(Array.isArray(preset.sfx_tracks)?preset.sfx_tracks:[]).filter(track=>track?.enabled!==false&&reelMode);
    const wantsSfx=wantedSfx.length>0;
    const wantsExtraAudio=wantsMusic||wantsVoice||wantedMusicTracks.length>0||wantedVoiceTracks.length>0||wantsSfx;
    if(wantsCaptions&&!this.state.capabilities?.drawtext)throw new Error("Dieser FFmpeg-Build unterstützt den benötigten drawtext-Filter für Caption Burn-in nicht.");
    if(wantsKeyframes&&!this.state.capabilities?.zoompan)throw new Error("Dieser FFmpeg-Build unterstützt den benötigten zoompan-Filter für visuelle Keyframes nicht.");
    if(wantsRotation&&!this.state.capabilities?.rotate)throw new Error("Dieser FFmpeg-Build unterstützt den benötigten rotate-Filter für Rotation-Keyframes nicht.");
    if(wantsOpacity&&!this.state.capabilities?.blend)throw new Error("Dieser FFmpeg-Build unterstützt den benötigten blend-Filter für Opacity-Keyframes nicht.");
    if(preset.audio_normalize===true&&!this.state.capabilities?.loudnorm)throw new Error("Dieser FFmpeg-Build unterstützt loudnorm für die Audio-Normalisierung nicht.");
    if(wantsExtraAudio&&!this.state.capabilities?.amix)throw new Error("Dieser FFmpeg-Build unterstützt amix für den lokalen Mehrspur-Audio-Mix nicht.");
    if(wantsMusic&&(!musicPath||!fs.existsSync(musicPath)))throw new Error("Für diesen Reel-Job ist eine lokale Musikdatei erforderlich.");
    if(wantsVoice&&(!voicePath||!fs.existsSync(voicePath)))throw new Error("Für diesen Reel-Job ist eine lokale Voiceover-Datei erforderlich.");
    if((wantsMusic||wantedMusicTracks.length)&&(wantsVoice||wantedVoiceTracks.length)&&preset.ducking_enabled===true&&!this.state.capabilities?.sidechaincompress)throw new Error("Dieser FFmpeg-Build unterstützt sidechaincompress für Voiceover-Ducking nicht.");
    for(const track of wantedMusicTracks){
      const source=(Array.isArray(musicTrackSources)?musicTrackSources:[]).find(item=>String(item.trackId)===String(track.id));
      if(!source?.filePath||!fs.existsSync(source.filePath))throw new Error(`Lokale zusätzliche Musikdatei fehlt: ${track.name||track.id}`);
    }
    for(const track of wantedVoiceTracks){
      const source=(Array.isArray(voiceTrackSources)?voiceTrackSources:[]).find(item=>String(item.trackId)===String(track.id));
      if(!source?.filePath||!fs.existsSync(source.filePath))throw new Error(`Lokale zusätzliche Voice-Datei fehlt: ${track.name||track.id}`);
    }
    for(const track of wantedSfx){
      const source=(Array.isArray(sfxSources)?sfxSources:[]).find(item=>String(item.trackId)===String(track.id));
      if(!source?.filePath||!fs.existsSync(source.filePath))throw new Error(`Lokale SFX-Datei fehlt: ${track.name||track.id}`);
    }

    const mode=["clips","reel","both"].includes(String(preset.mode||""))?String(preset.mode):"clips";
    const transition=["cut","fade","dissolve","wipeleft","wiperight","slideleft","slideright"].includes(String(preset.transition||""))?String(preset.transition):"cut";
    if(transition!=="cut"&&mode!=="clips"&&(!this.state.capabilities?.xfade||!this.state.capabilities?.acrossfade)){
      throw new Error("Dieser FFmpeg-Build unterstützt die benötigten xfade/acrossfade Filter für Reel-Übergänge nicht.");
    }
    const encoder=this.resolveEncoder(preset);
    const hasAudio=await this.probeSourceAudio(sourcePath);
    const jobDir=path.join(this.outputRoot,`${safeName(manifest.project_title,"project")}-${safeName(job.id,"job")}`);
    const segmentDir=mode==="reel"?path.join(jobDir,"_segments"):jobDir;
    fs.mkdirSync(segmentDir,{recursive:true});

    const segments=[],finalOutputs=[];
    this.emitState({
      status:"processing",phase:"clips",mode,encoder:encoder.key,transition,
      jobId:String(job.id),clipIndex:0,clipCount:clips.length,progress:0,lastOutputDir:jobDir,error:""
    });
    try{
      for(let i=0;i<clips.length;i++){
        const clip=clips[i];
        const outputName=`${String(i+1).padStart(2,"0")}-${safeName(clip.label,`clip-${i+1}`)}.mp4`;
        const outputPath=path.join(segmentDir,outputName);
        this.emitState({phase:"clips",clipIndex:i+1,progress:Math.round((i/clips.length)*80)});
        const args=this.buildArgs({sourcePath,clip,manifest,outputPath,hasAudio});
        await this.runProcess(this.ffmpegPath,args,{timeoutMs:30*60*1000});
        const stat=fs.statSync(outputPath);
        const item={kind:"clip",filePath:outputPath,fileName:outputName,bytes:stat.size,durationMs:Math.max(100,Number(clip.out_ms||0)-Number(clip.in_ms||0))};
        segments.push(item);
        if(mode!=="reel")finalOutputs.push(item);
      }

      let reelDuration=0,usedTransitionMs=0;
      if(mode==="reel"||mode==="both"){
        this.emitState({phase:"reel",progress:86});
        const reelName=`${safeName(manifest.project_title,"project")}-reel.mp4`;
        const reelPath=path.join(jobDir,reelName);
        const baseReelName=wantsExtraAudio?`_base-${reelName}`:reelName;
        const baseReelPath=path.join(jobDir,baseReelName);

        if(segments.length===1){
          fs.copyFileSync(segments[0].filePath,baseReelPath);
          reelDuration=segments[0].durationMs;
        }else if(transition==="cut"){
          const listName="_cfs_concat.txt",listPath=path.join(segmentDir,listName);
          fs.writeFileSync(listPath,segments.map(item=>`file '${item.fileName}'`).join("\n")+"\n","utf8");
          await this.runProcess(this.ffmpegPath,this.buildConcatArgs(listName,baseReelPath),{timeoutMs:30*60*1000,cwd:segmentDir});
          reelDuration=segments.reduce((sum,o)=>sum+o.durationMs,0);
          try{fs.unlinkSync(listPath)}catch{}
        }else{
          const built=this.buildTransitionReelArgs(segments,baseReelName,preset);
          usedTransitionMs=built.transitionMs;
          await this.runProcess(this.ffmpegPath,built.args,{timeoutMs:30*60*1000,cwd:segmentDir});
          reelDuration=built.durationMs;
        }

        if(wantsExtraAudio){
          this.emitState({phase:"mix",progress:94});
          await this.runProcess(this.ffmpegPath,this.buildMultitrackMixArgs(baseReelPath,{musicPath:wantsMusic?musicPath:null,voicePath:wantsVoice?voicePath:null,musicTrackSources:wantedMusicTracks.length?musicTrackSources:[],voiceTrackSources:wantedVoiceTracks.length?voiceTrackSources:[],sfxSources:wantsSfx?sfxSources:[]},reelPath,preset,reelDuration),{timeoutMs:30*60*1000});
          try{fs.unlinkSync(baseReelPath)}catch{}
        }

        const stat=fs.statSync(reelPath);
        finalOutputs.push({kind:"reel",filePath:reelPath,fileName:reelName,bytes:stat.size,durationMs:reelDuration});
        if(mode==="reel"){try{fs.rmSync(segmentDir,{recursive:true,force:true})}catch{}}
      }

      const bytes=finalOutputs.reduce((sum,o)=>sum+o.bytes,0);
      const durationMs=mode==="both"
        ?finalOutputs.filter(o=>o.kind==="reel").reduce((sum,o)=>sum+o.durationMs,0)
        :finalOutputs.reduce((sum,o)=>sum+o.durationMs,0);
      this.emitState({status:"completed",phase:"done",progress:100,clipIndex:clips.length,lastOutputDir:jobDir,error:""});
      return{
        outputDir:jobDir,outputs:finalOutputs,
        result:{
          output_name:path.basename(jobDir),duration_ms:durationMs,bytes,
          codec:`${encoder.codec}/aac`,
          note:`${finalOutputs.length} finale Datei(en) lokal exportiert · Modus ${mode} · Encoder ${encoder.key.toUpperCase()} · Übergang ${transition}${usedTransitionMs?` ${usedTransitionMs}ms`:""}${wantsCaptions?" · Captions":""}${wantsKeyframes?" · Keyframes":""}${preset.audio_normalize?" · Audio normalisiert":""}${wantsMusic?" · Musikspur":""}${wantsVoice?" · Voiceover":""}${wantedMusicTracks.length?` · Musik+${wantedMusicTracks.length}`:""}${wantedVoiceTracks.length?` · Voice+${wantedVoiceTracks.length}`:""}${wantsSfx?` · SFX ${wantedSfx.length}`:""}${(wantsMusic||wantedMusicTracks.length)&&(wantsVoice||wantedVoiceTracks.length)&&preset.ducking_enabled?" · Ducking":""}.`
        }
      };
    }catch(error){
      this.logger?.error?.("Cut Media Engine Fehler",{jobId:job.id,error:String(error?.message||error)});
      this.emitState({status:"failed",phase:"failed",error:String(error?.message||error)});
      throw error;
    }
  }
}

module.exports={CutMediaEngine,safeName,escapeDrawtext};
