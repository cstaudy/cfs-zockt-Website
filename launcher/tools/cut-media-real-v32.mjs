import fs from "node:fs";import os from "node:os";import path from "node:path";import {spawnSync} from "node:child_process";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
if(spawnSync("ffmpeg",["-version"],{stdio:"ignore"}).status!==0){console.log(JSON.stringify({ok:true,skipped:true,reason:"ffmpeg unavailable"}));process.exit(0)}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-real-v32-")),source=path.join(dir,"source.mp4");
const make=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc=size=320x240:rate=30","-f","lavfi","-i","sine=frequency=550:sample_rate=48000","-t","4","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",source],{encoding:"utf8"});
if(make.status!==0)throw new Error(make.stderr||"source creation failed");

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),env:{...process.env,CFS_FFMPEG_PATH:"ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();
if(!probe.available||!probe.capabilities.xfade||!probe.capabilities.acrossfade)throw new Error("transition filters unavailable");
const job={id:"real32",manifest:{schema:3,project_title:"V32 Real",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"fade",transition_ms:250,encoder:"software",audio_normalize:true,audio_bitrate_kbps:160},clips:[
 {clip_id:"a",label:"one",in_ms:0,out_ms:1500,caption:"V32 ONE",caption_enabled:true,caption_position:"bottom",caption_size:30,caption_style:"box",audio_gain_db:2,audio_fade_in_ms:120,audio_fade_out_ms:180},
 {clip_id:"b",label:"two",in_ms:1800,out_ms:3400,caption:"V32 TWO",caption_enabled:true,caption_position:"top",caption_size:28,caption_style:"outline",audio_gain_db:-1,audio_fade_in_ms:100,audio_fade_out_ms:200}
]}};
const result=await engine.runJob({job,sourcePath:source});const reel=result.outputs.find(o=>o.kind==="reel");
if(!reel||!fs.existsSync(reel.filePath)||reel.bytes<=0)throw new Error("real transition reel missing");
console.log(JSON.stringify({ok:true,skipped:false,outputs:result.outputs.length,reel_bytes:reel.bytes,transition:"fade",audio:true}));
