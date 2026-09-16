import fs from "node:fs";import os from "node:os";import path from "node:path";import {spawnSync} from "node:child_process";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
if(spawnSync("ffmpeg",["-version"],{stdio:"ignore"}).status!==0){console.log(JSON.stringify({ok:true,skipped:true,reason:"ffmpeg unavailable"}));process.exit(0)}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-real-v33-")),source=path.join(dir,"source.mp4"),music=path.join(dir,"music.wav");
let make=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc=size=320x240:rate=30","-f","lavfi","-i","sine=frequency=500:sample_rate=48000","-t","4","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",source],{encoding:"utf8"});
if(make.status!==0)throw new Error(make.stderr||"video source creation failed");
make=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","sine=frequency=220:sample_rate=48000","-t","5","-c:a","pcm_s16le",music],{encoding:"utf8"});
if(make.status!==0)throw new Error(make.stderr||"music creation failed");

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),env:{...process.env,CFS_FFMPEG_PATH:"ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();
if(!probe.available||!probe.capabilities.zoompan||!probe.capabilities.amix)throw new Error("V33 filters unavailable");
const job={id:"real33",manifest:{schema:4,project_title:"V33 Real",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"fade",transition_ms:250,encoder:"software",audio_normalize:false,audio_bitrate_kbps:160,music_enabled:true,music_name:"music.wav",music_gain_db:-18,music_start_ms:200,music_loop:true,music_fade_in_ms:250,music_fade_out_ms:400},clips:[
 {clip_id:"a",label:"zoom",in_ms:0,out_ms:1500,caption:"V33 KEYFRAME",caption_enabled:true,caption_position:"bottom",caption_size:28,caption_style:"box",audio_gain_db:0,audio_fade_in_ms:100,audio_fade_out_ms:100,keyframe_enabled:true,keyframe_zoom_start:1,keyframe_zoom_end:1.35,keyframe_pan_x_start:-.4,keyframe_pan_x_end:.4,keyframe_pan_y_start:0,keyframe_pan_y_end:.2,keyframe_easing:"ease_in_out"},
 {clip_id:"b",label:"static",in_ms:1800,out_ms:3400,caption:"MUSIC",caption_enabled:true,caption_position:"top",caption_size:28,caption_style:"outline",audio_gain_db:-1,audio_fade_in_ms:100,audio_fade_out_ms:150,keyframe_enabled:false}
]}};
const result=await engine.runJob({job,sourcePath:source,musicPath:music});const reel=result.outputs.find(o=>o.kind==="reel");
if(!reel||!fs.existsSync(reel.filePath)||reel.bytes<=0)throw new Error("real V33 reel missing");
console.log(JSON.stringify({ok:true,skipped:false,outputs:result.outputs.length,reel_bytes:reel.bytes,keyframes:true,music:true}));
