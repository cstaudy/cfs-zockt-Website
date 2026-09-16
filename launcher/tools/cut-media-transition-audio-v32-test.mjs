import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {EventEmitter} from "node:events";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-media-v32-")),source=path.join(dir,"source.mp4");
fs.writeFileSync(source,"source");const calls=[];

function fakeSpawn(command,args,options={}){
  calls.push({command,args:[...args],options});
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  process.nextTick(()=>{
    if(args.includes("-version")){child.stdout.emit("data",Buffer.from("ffmpeg version CFS-V32\n"));child.emit("close",0);return}
    if(args.includes("-filters")){child.stdout.emit("data",Buffer.from(" T.C drawtext V->V\n TS xfade VV->V\n T.C acrossfade AA->A\n TSC loudnorm A->A\n"));child.emit("close",0);return}
    if(args.includes("-encoders")){child.stdout.emit("data",Buffer.from(" V....D libx264\n V....D h264_nvenc\n V....D h264_qsv\n V....D h264_amf\n"));child.emit("close",0);return}
    if(args.includes("-frames:a")){child.emit("close",0);return}
    const output=args.at(-1),full=path.isAbsolute(output)?output:path.join(options.cwd||process.cwd(),output);
    fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,Buffer.alloc(args.includes("-filter_complex")?500:150));child.emit("close",0);
  });return child;
}

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),spawnImpl:fakeSpawn,env:{CFS_FFMPEG_PATH:"fake-ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();
if(!probe.capabilities.xfade||!probe.capabilities.acrossfade||!probe.capabilities.loudnorm)throw new Error("transition/audio capabilities");
if(!probe.capabilities.encoders.nvenc||!probe.capabilities.encoders.qsv||!probe.capabilities.encoders.amf)throw new Error("gpu encoder probe");

const job={id:"v32",manifest:{schema:3,project_title:"Transition Reel",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"dissolve",transition_ms:300,encoder:"software",audio_normalize:true,audio_bitrate_kbps:192},clips:[
 {clip_id:"a",label:"eins",in_ms:0,out_ms:1200,caption:"A",caption_enabled:true,caption_position:"bottom",caption_size:32,caption_style:"box",audio_gain_db:3,audio_fade_in_ms:200,audio_fade_out_ms:250},
 {clip_id:"b",label:"zwei",in_ms:1300,out_ms:2800,caption:"B",caption_enabled:false,audio_gain_db:-2,audio_fade_in_ms:100,audio_fade_out_ms:300}
]}};

const result=await engine.runJob({job,sourcePath:source});
if(result.outputs.length!==3||!result.outputs.some(o=>o.kind==="reel"))throw new Error("outputs");
const segmentCalls=calls.filter(c=>c.args.includes("-vf"));
if(segmentCalls.length!==2)throw new Error("segment count");
const audioArgs=segmentCalls[0].args.join(" ");
if(!audioArgs.includes("volume=3.0dB")||!audioArgs.includes("afade=t=in")||!audioArgs.includes("afade=t=out")||!audioArgs.includes("loudnorm=I=-16"))throw new Error("audio filters");
const reelCall=calls.find(c=>c.args.includes("-filter_complex"));
if(!reelCall)throw new Error("transition reel call");
const graph=reelCall.args[reelCall.args.indexOf("-filter_complex")+1];
if(!graph.includes("xfade=transition=dissolve")||!graph.includes("acrossfade=d=0.300"))throw new Error("transition graph");
const silentArgs=engine.buildArgs({sourcePath:source,clip:job.manifest.clips[0],manifest:job.manifest,outputPath:path.join(dir,"silent.mp4"),hasAudio:false});
if(!silentArgs.includes("anullsrc=channel_layout=stereo:sample_rate=48000")||!silentArgs.includes("1:a:0"))throw new Error("silent audio fallback");
const nvenc=engine.resolveEncoder({encoder:"nvenc",quality:"high"});if(nvenc.codec!=="h264_nvenc")throw new Error("nvenc select");

console.log(JSON.stringify({ok:true,transition:"dissolve",audio_filters:true,gpu_probe:true,outputs:result.outputs.length}));
