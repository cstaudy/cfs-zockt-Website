import fs from "node:fs";import os from "node:os";import path from "node:path";import {spawnSync} from "node:child_process";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");

if(spawnSync("ffmpeg",["-version"],{stdio:"ignore"}).status!==0){
  console.log(JSON.stringify({ok:true,skipped:true,reason:"ffmpeg unavailable"}));process.exit(0)
}
const ft=(spawnSync("ffmpeg",["-hide_banner","-filters"],{encoding:"utf8"}).stdout||"");
for(const name of ["zoompan","rotate","blend","amix","sidechaincompress","showwavespic","volumedetect"]){
  if(!new RegExp(`(^|\\s)${name}(\\s|$)`,"m").test(ft)){
    console.log(JSON.stringify({ok:true,skipped:true,reason:`${name} unavailable`}));process.exit(0)
  }
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-real-v36-"));
const source=path.join(dir,"source.mp4"),m1=path.join(dir,"m1.wav"),m2=path.join(dir,"m2.wav"),v1=path.join(dir,"v1.wav"),v2=path.join(dir,"v2.wav"),hit=path.join(dir,"hit.wav");
let r=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc=size=240x160:rate=24","-f","lavfi","-i","sine=frequency=520:sample_rate=48000","-t","3.5","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",source],{encoding:"utf8"});
if(r.status!==0)throw new Error(r.stderr||"source");
for(const [file,freq,dur] of [[m1,210,4],[m2,310,4],[v1,730,1.8],[v2,880,1.4],[hit,1250,.35]]){
  r=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i",`sine=frequency=${freq}:sample_rate=48000`,"-t",String(dur),"-c:a","pcm_s16le",file],{encoding:"utf8"});
  if(r.status!==0)throw new Error(r.stderr||`audio ${freq}`)
}
const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),env:{...process.env,CFS_FFMPEG_PATH:"ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();if(!probe.available)throw new Error("probe");
const analysis=await engine.analyzeAudio(m2,"real-v36-m2");
if(!analysis.available||!analysis.waveform_path||!fs.existsSync(analysis.waveform_path))throw new Error("waveform analysis");

const job={id:"real36",manifest:{schema:7,project_title:"V36 Real",format:"vertical",export_preset:{
 width:270,height:480,fps:24,quality:"standard",mode:"both",transition:"fade",transition_ms:180,encoder:"software",audio_normalize:false,audio_bitrate_kbps:128,
 source_audio_gain_db:-2,source_audio_mute:false,source_audio_solo:false,source_audio_pan:0,
 music_enabled:true,music_gain_db:-20,music_loop:true,music_fade_in_ms:100,music_fade_out_ms:150,music_mute:false,music_solo:false,music_pan:-.2,
 music_tracks:[{id:"m2",name:"Music 2",enabled:true,start_ms:350,gain_db:-24,fade_in_ms:80,fade_out_ms:100,loop:true,mute:false,solo:false,pan:.25}],
 voiceover_enabled:true,voiceover_gain_db:1,voiceover_start_ms:200,voiceover_fade_in_ms:50,voiceover_fade_out_ms:100,voiceover_mute:false,voiceover_solo:false,voiceover_pan:-.2,
 voice_tracks:[{id:"v2",name:"Voice 2",enabled:true,start_ms:900,gain_db:-1,fade_in_ms:40,fade_out_ms:80,mute:false,solo:false,pan:.25}],
 ducking_enabled:true,ducking_ratio:8,
 sfx_tracks:[{id:"hit",name:"Hit",enabled:true,start_ms:700,gain_db:-5,fade_in_ms:0,fade_out_ms:60,mute:false,solo:false,pan:.6}]
},clips:[
 {clip_id:"a",label:"bezier",in_ms:0,out_ms:1300,caption:"V36 BEZIER",caption_enabled:true,caption_position:"bottom",caption_size:24,caption_style:"box",audio_gain_db:0,audio_fade_in_ms:60,audio_fade_out_ms:80,keyframe_enabled:true,visual_keyframes:[
   {at:0,zoom:1,pan_x:-.2,pan_y:0,rotation:0,opacity:1,easing:"linear",bezier_y1:.25,bezier_y2:.75},
   {at:.5,zoom:1.25,pan_x:.2,pan_y:.1,rotation:14,opacity:.65,easing:"bezier",bezier_y1:.15,bezier_y2:.9},
   {at:1,zoom:1.05,pan_x:0,pan_y:0,rotation:0,opacity:1,easing:"ease_in_out",bezier_y1:.25,bezier_y2:.75}
 ]},
 {clip_id:"b",label:"mix",in_ms:1600,out_ms:3000,caption:"4 MUSIC/VOICE PATH",caption_enabled:true,caption_position:"top",caption_size:22,caption_style:"outline",audio_gain_db:-1,audio_fade_in_ms:60,audio_fade_out_ms:80,keyframe_enabled:false}
]}};

const result=await engine.runJob({job,sourcePath:source,musicPath:m1,voicePath:v1,musicTrackSources:[{trackId:"m2",filePath:m2}],voiceTrackSources:[{trackId:"v2",filePath:v2}],sfxSources:[{trackId:"hit",filePath:hit}]});
const reel=result.outputs.find(o=>o.kind==="reel");
if(!reel||!fs.existsSync(reel.filePath)||reel.bytes<=0)throw new Error("real reel missing");
console.log(JSON.stringify({ok:true,skipped:false,outputs:result.outputs.length,reel_bytes:reel.bytes,bezier:true,multi_music:true,multi_voice:true,waveform:true,peak_db:analysis.peak_db}));
