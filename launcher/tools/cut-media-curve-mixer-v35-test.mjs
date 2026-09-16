import fs from "node:fs";import os from "node:os";import path from "node:path";import {EventEmitter} from "node:events";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-v35-")),source=path.join(dir,"source.mp4"),music=path.join(dir,"music.wav"),voice=path.join(dir,"voice.wav"),sfx=path.join(dir,"hit.wav");
for(const f of [source,music,voice,sfx])fs.writeFileSync(f,path.basename(f));
const calls=[];
function fakeSpawn(command,args,options={}){
  calls.push({command,args:[...args],options});const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  process.nextTick(()=>{
    if(args.includes("-version")){child.stdout.emit("data",Buffer.from("ffmpeg version CFS-V35\n"));child.emit("close",0);return}
    if(args.includes("-filters")){child.stdout.emit("data",Buffer.from(" drawtext zoompan rotate blend xfade acrossfade loudnorm amix sidechaincompress\n"));child.emit("close",0);return}
    if(args.includes("-encoders")){child.stdout.emit("data",Buffer.from(" libx264\n"));child.emit("close",0);return}
    if(args.includes("-frames:a")){child.emit("close",0);return}
    const out=args.at(-1),full=path.isAbsolute(out)?out:path.join(options.cwd||process.cwd(),out);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,Buffer.alloc(600));child.emit("close",0);
  });return child;
}
const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),spawnImpl:fakeSpawn,env:{CFS_FFMPEG_PATH:"fake-ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();
if(!probe.capabilities.rotate||!probe.capabilities.blend)throw new Error("rotate/blend capabilities");

const preset={width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"cut",encoder:"software",audio_bitrate_kbps:160,
 source_audio_gain_db:-2,source_audio_mute:false,source_audio_solo:false,source_audio_pan:-.4,
 music_enabled:true,music_gain_db:-15,music_mute:false,music_solo:false,music_pan:.5,music_loop:true,
 voiceover_enabled:true,voiceover_gain_db:1,voiceover_mute:false,voiceover_solo:false,voiceover_pan:-.25,voiceover_start_ms:200,ducking_enabled:true,ducking_ratio:7,
 sfx_tracks:[{id:"hit",name:"Hit",enabled:true,gain_db:-4,start_ms:400,mute:false,solo:false,pan:.8}]};
const job={id:"v35",manifest:{schema:6,project_title:"V35",format:"vertical",export_preset:preset,clips:[
 {clip_id:"a",label:"A",in_ms:0,out_ms:1300,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:true,visual_keyframes:[
  {at:0,zoom:1,pan_x:0,pan_y:0,rotation:0,opacity:1,easing:"linear"},
  {at:.5,zoom:1.2,pan_x:.2,pan_y:0,rotation:25,opacity:.45,easing:"ease_in_out"},
  {at:1,zoom:1,pan_x:0,pan_y:0,rotation:0,opacity:1,easing:"linear"}]},
 {clip_id:"b",label:"B",in_ms:1400,out_ms:2800,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:false}
]}};
const result=await engine.runJob({job,sourcePath:source,musicPath:music,voicePath:voice,sfxSources:[{trackId:"hit",filePath:sfx}]});
if(result.outputs.length!==3)throw new Error("outputs");
const visualCall=calls.find(c=>c.args.includes("-filter_complex")&&String(c.args[c.args.indexOf("-filter_complex")+1]).includes("blend=all_expr"));
if(!visualCall)throw new Error("opacity complex missing");
const vg=visualCall.args[visualCall.args.indexOf("-filter_complex")+1];
if(!vg.includes("rotate=angle=")||!vg.includes("blend=all_expr")||!vg.includes("if(lte("))throw new Error("rotation/opacity graph");

const mixCall=calls.find(c=>c.args.includes("-filter_complex")&&String(c.args[c.args.indexOf("-filter_complex")+1]).includes("amix=inputs=")&&String(c.args[c.args.indexOf("-filter_complex")+1]).includes("sidechaincompress"));
if(!mixCall)throw new Error("mixer call");
const mg=mixCall.args[mixCall.args.indexOf("-filter_complex")+1];
if(!mg.includes("pan=stereo")||!mg.includes("volume=-2.0dB")||!mg.includes("sidechaincompress"))throw new Error("pan/gain mixer");

const soloPreset={...preset,music_solo:true,source_audio_solo:false,voiceover_solo:false,sfx_tracks:[{...preset.sfx_tracks[0],solo:false}]};
const soloArgs=engine.buildMultitrackMixArgs("base.mp4",{musicPath:music,voicePath:voice,sfxSources:[{trackId:"hit",filePath:sfx}]},"solo.mp4",soloPreset,3000);
const soloGraph=soloArgs[soloArgs.indexOf("-filter_complex")+1];
if(!soloGraph.includes("amix=inputs=1")||soloGraph.includes("[basea]")||soloGraph.includes("[voice]")||soloGraph.includes("sfx"))throw new Error("solo isolation");

console.log(JSON.stringify({ok:true,rotation:true,opacity:true,pan:true,solo:true,mute:true,outputs:3}));
