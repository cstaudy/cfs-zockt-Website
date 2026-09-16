import fs from "node:fs";import os from "node:os";import path from "node:path";import {EventEmitter} from "node:events";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-engine-v33-")),source=path.join(dir,"source.mp4"),music=path.join(dir,"music.mp3");
fs.writeFileSync(source,"source");fs.writeFileSync(music,"music");const calls=[];

function fakeSpawn(command,args,options={}){
  calls.push({command,args:[...args],options});const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  process.nextTick(()=>{
    if(args.includes("-version")){child.stdout.emit("data",Buffer.from("ffmpeg version CFS-V33\n"));child.emit("close",0);return}
    if(args.includes("-filters")){child.stdout.emit("data",Buffer.from(" drawtext zoompan xfade acrossfade loudnorm amix\n"));child.emit("close",0);return}
    if(args.includes("-encoders")){child.stdout.emit("data",Buffer.from(" libx264 h264_nvenc\n"));child.emit("close",0);return}
    if(args.includes("-frames:a")){child.emit("close",0);return}
    const out=args.at(-1),full=path.isAbsolute(out)?out:path.join(options.cwd||process.cwd(),out);
    fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,Buffer.alloc(args.includes("amix=inputs=2")?777:args.includes("-filter_complex")?500:150));child.emit("close",0);
  });return child;
}

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),spawnImpl:fakeSpawn,env:{CFS_FFMPEG_PATH:"fake-ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();
if(!probe.capabilities.zoompan||!probe.capabilities.amix)throw new Error("V33 capabilities");

const job={id:"job33",manifest:{schema:4,project_title:"V33 Reel",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"fade",transition_ms:250,encoder:"software",audio_normalize:false,audio_bitrate_kbps:160,music_enabled:true,music_name:"music.mp3",music_gain_db:-14,music_start_ms:500,music_loop:true,music_fade_in_ms:300,music_fade_out_ms:400},clips:[
 {clip_id:"a",label:"A",in_ms:0,out_ms:1200,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:true,keyframe_zoom_start:1,keyframe_zoom_end:1.4,keyframe_pan_x_start:-.5,keyframe_pan_x_end:.5,keyframe_pan_y_start:0,keyframe_pan_y_end:.3,keyframe_easing:"ease_in_out"},
 {clip_id:"b",label:"B",in_ms:1300,out_ms:2700,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:false}
]}};

const result=await engine.runJob({job,sourcePath:source,musicPath:music});
if(result.outputs.length!==3||!result.outputs.some(x=>x.kind==="reel"))throw new Error("outputs");
const clipCall=calls.find(c=>c.args.includes("-vf")&&c.args[c.args.indexOf("-vf")+1].includes("zoompan="));
if(!clipCall)throw new Error("zoompan missing");
const vf=clipCall.args[clipCall.args.indexOf("-vf")+1];
if(!vf.includes("cos(PI")||!vf.includes("s=360x640"))throw new Error("keyframe expression");
const musicCall=calls.find(c=>c.args.some(a=>String(a).includes("amix=inputs=2")));
if(!musicCall)throw new Error("music amix missing");
const graph=musicCall.args[musicCall.args.indexOf("-filter_complex")+1];
if(!graph.includes("volume=-14.0dB")||!graph.includes("afade=t=in")||!graph.includes("afade=t=out"))throw new Error("music filters");
if(!musicCall.args.includes("-stream_loop")||!musicCall.args.includes("-ss"))throw new Error("music loop/start");
if(!result.result.note.includes("Keyframes")||!result.result.note.includes("Musikspur"))throw new Error("result note");

console.log(JSON.stringify({ok:true,zoompan:true,music_mix:true,outputs:result.outputs.length}));
