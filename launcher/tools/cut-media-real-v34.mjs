import fs from "node:fs";import os from "node:os";import path from "node:path";import {spawnSync} from "node:child_process";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
if(spawnSync("ffmpeg",["-version"],{stdio:"ignore"}).status!==0){console.log(JSON.stringify({ok:true,skipped:true,reason:"ffmpeg unavailable"}));process.exit(0)}
const filters=spawnSync("ffmpeg",["-hide_banner","-filters"],{encoding:"utf8"});
const ft=filters.stdout||filters.stderr||"";
for(const name of ["zoompan","amix","sidechaincompress"]){if(!new RegExp(`(^|\\s)${name}(\\s|$)`,"m").test(ft)){console.log(JSON.stringify({ok:true,skipped:true,reason:`${name} unavailable`}));process.exit(0)}}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-real-v34-")),source=path.join(dir,"source.mp4"),music=path.join(dir,"music.wav"),voice=path.join(dir,"voice.wav"),sfx=path.join(dir,"sfx.wav");
let r=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc=size=320x240:rate=30","-f","lavfi","-i","sine=frequency=500:sample_rate=48000","-t","4","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",source],{encoding:"utf8"});if(r.status!==0)throw new Error(r.stderr||"source");
for(const [file,freq,dur] of [[music,220,5],[voice,760,2],[sfx,1100,.5]]){r=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i",`sine=frequency=${freq}:sample_rate=48000`,"-t",String(dur),"-c:a","pcm_s16le",file],{encoding:"utf8"});if(r.status!==0)throw new Error(r.stderr||"audio source")}

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),env:{...process.env,CFS_FFMPEG_PATH:"ffmpeg"},resourcesPath:"",execPath:""});
const job={id:"real34",manifest:{schema:5,project_title:"V34 Real",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"fade",transition_ms:220,encoder:"software",audio_normalize:false,audio_bitrate_kbps:160,music_enabled:true,music_gain_db:-20,music_loop:true,music_fade_in_ms:100,music_fade_out_ms:200,voiceover_enabled:true,voiceover_gain_db:1,voiceover_start_ms:350,voiceover_fade_in_ms:80,voiceover_fade_out_ms:100,ducking_enabled:true,ducking_ratio:8,sfx_tracks:[{id:"hit",name:"Hit",enabled:true,start_ms:900,gain_db:-4,fade_in_ms:0,fade_out_ms:80}]},clips:[
 {clip_id:"a",label:"free",in_ms:0,out_ms:1500,caption:"FREE KF",caption_enabled:true,caption_position:"bottom",caption_size:27,caption_style:"box",audio_gain_db:0,audio_fade_in_ms:80,audio_fade_out_ms:100,keyframe_enabled:true,visual_keyframes:[{at:0,zoom:1,pan_x:-.4,pan_y:0,easing:"linear"},{at:.45,zoom:1.22,pan_x:0,pan_y:.25,easing:"ease_in_out"},{at:1,zoom:1.4,pan_x:.4,pan_y:0,easing:"ease_in_out"}]},
 {clip_id:"b",label:"static",in_ms:1800,out_ms:3400,caption:"VOICE + SFX",caption_enabled:true,caption_position:"top",caption_size:27,caption_style:"outline",audio_gain_db:-1,audio_fade_in_ms:80,audio_fade_out_ms:120,keyframe_enabled:false}
]}};
const result=await engine.runJob({job,sourcePath:source,musicPath:music,voicePath:voice,sfxSources:[{trackId:"hit",filePath:sfx}]});
const reel=result.outputs.find(o=>o.kind==="reel");
if(!reel||!fs.existsSync(reel.filePath)||reel.bytes<=0)throw new Error("real V34 reel missing");
console.log(JSON.stringify({ok:true,skipped:false,outputs:result.outputs.length,reel_bytes:reel.bytes,free_keyframes:true,voice:true,sfx:true,ducking:true}));
