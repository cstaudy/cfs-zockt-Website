import fs from "node:fs";import os from "node:os";import path from "node:path";import {EventEmitter} from "node:events";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-engine-v36-"));
const names=["source.mp4","music1.wav","music2.wav","music3.wav","voice1.wav","voice2.wav","voice3.wav","hit.wav"];
const paths=Object.fromEntries(names.map(n=>[n,path.join(dir,n)]));for(const f of Object.values(paths))fs.writeFileSync(f,path.basename(f));
const calls=[];
function fakeSpawn(command,args,options={}){
  calls.push({command,args:[...args],options});const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  process.nextTick(()=>{
    if(args.includes("-version")){child.stdout.emit("data",Buffer.from("ffmpeg version CFS-V36\n"));child.emit("close",0);return}
    if(args.includes("-filters")){child.stdout.emit("data",Buffer.from(" drawtext zoompan rotate blend xfade acrossfade loudnorm amix sidechaincompress showwavespic volumedetect\n"));child.emit("close",0);return}
    if(args.includes("-encoders")){child.stdout.emit("data",Buffer.from(" libx264\n"));child.emit("close",0);return}
    if(args.includes("-frames:a")){child.emit("close",0);return}
    if(args.includes("volumedetect")){
      child.stderr.emit("data",Buffer.from("Duration: 00:00:05.00\n[Parsed_volumedetect] mean_volume: -12.3 dB\n[Parsed_volumedetect] max_volume: -1.2 dB\n"));
      child.emit("close",0);return;
    }
    const out=args.at(-1),full=path.isAbsolute(out)?out:path.join(options.cwd||process.cwd(),out);
    fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,Buffer.alloc(args.some(a=>String(a).includes("showwavespic"))?200:800));child.emit("close",0);
  });return child;
}
const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),spawnImpl:fakeSpawn,env:{CFS_FFMPEG_PATH:"fake-ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();if(!probe.available)throw new Error("probe");

const analysis=await engine.analyzeAudio(paths["music2.wav"],"p36-m2");
if(analysis.peak_db!==-1.2||analysis.mean_db!==-12.3||analysis.duration_ms!==5000||!analysis.waveform_path||!fs.existsSync(analysis.waveform_path))throw new Error("audio analysis");

const preset={width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"cut",encoder:"software",audio_bitrate_kbps:160,
 source_audio_gain_db:0,source_audio_mute:false,source_audio_solo:false,source_audio_pan:0,
 music_enabled:true,music_gain_db:-18,music_loop:true,music_mute:false,music_solo:false,music_pan:0,
 music_tracks:[
  {id:"m2",name:"M2",enabled:true,start_ms:200,gain_db:-14,fade_in_ms:100,fade_out_ms:200,loop:true,mute:false,solo:false,pan:-.4},
  {id:"m3",name:"M3",enabled:true,start_ms:500,gain_db:-20,fade_in_ms:0,fade_out_ms:100,loop:false,mute:false,solo:false,pan:.5}
 ],
 voiceover_enabled:true,voiceover_gain_db:0,voiceover_start_ms:150,voiceover_mute:false,voiceover_solo:false,voiceover_pan:0,
 voice_tracks:[
  {id:"v2",name:"V2",enabled:true,start_ms:600,gain_db:2,fade_in_ms:50,fade_out_ms:100,mute:false,solo:false,pan:-.3},
  {id:"v3",name:"V3",enabled:true,start_ms:1000,gain_db:-1,fade_in_ms:0,fade_out_ms:100,mute:false,solo:false,pan:.3}
 ],
 ducking_enabled:true,ducking_ratio:9,
 sfx_tracks:[{id:"hit",name:"Hit",enabled:true,start_ms:800,gain_db:-5,mute:false,solo:false,pan:.7}]
};
const job={id:"v36",manifest:{schema:7,project_title:"V36 Reel",format:"vertical",export_preset:preset,clips:[
 {clip_id:"a",label:"A",in_ms:0,out_ms:1300,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:true,visual_keyframes:[
  {at:0,zoom:1,pan_x:0,pan_y:0,rotation:0,opacity:1,easing:"linear",bezier_y1:.25,bezier_y2:.75},
  {at:.5,zoom:1.35,pan_x:.2,pan_y:0,rotation:12,opacity:.7,easing:"bezier",bezier_y1:.1,bezier_y2:.9},
  {at:1,zoom:1,pan_x:0,pan_y:0,rotation:0,opacity:1,easing:"linear",bezier_y1:.25,bezier_y2:.75}
 ]},
 {clip_id:"b",label:"B",in_ms:1400,out_ms:2800,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:false}
]}};
const result=await engine.runJob({job,sourcePath:paths["source.mp4"],musicPath:paths["music1.wav"],voicePath:paths["voice1.wav"],musicTrackSources:[{trackId:"m2",filePath:paths["music2.wav"]},{trackId:"m3",filePath:paths["music3.wav"]}],voiceTrackSources:[{trackId:"v2",filePath:paths["voice2.wav"]},{trackId:"v3",filePath:paths["voice3.wav"]}],sfxSources:[{trackId:"hit",filePath:paths["hit.wav"]}]});
if(result.outputs.length!==3)throw new Error("outputs");
const visualCall=calls.find(c=>c.args.includes("-filter_complex")&&String(c.args[c.args.indexOf("-filter_complex")+1]).includes("blend=all_expr"));
if(!visualCall)throw new Error("visual graph");
const vg=visualCall.args[visualCall.args.indexOf("-filter_complex")+1];if(!vg.includes("3*(1-(")||!vg.includes("*0.100"))throw new Error("bezier graph");
const mixCall=calls.find(c=>c.args.includes("-filter_complex")&&String(c.args[c.args.indexOf("-filter_complex")+1]).includes("[musicbus]"));
if(!mixCall)throw new Error("music bus");
const mg=mixCall.args[mixCall.args.indexOf("-filter_complex")+1];
if(!mg.includes("[voicesidebus]")||!mg.includes("sidechaincompress=threshold=0.035:ratio=9.0")||!mg.includes("amix=inputs=6"))throw new Error("multitrack bus graph");
console.log(JSON.stringify({ok:true,bezier:true,music_tracks:3,voice_tracks:3,waveform:true,peak:true,outputs:3}));
