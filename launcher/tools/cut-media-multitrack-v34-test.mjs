import fs from "node:fs";import os from "node:os";import path from "node:path";import {EventEmitter} from "node:events";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-engine-v34-"));
const source=path.join(dir,"source.mp4"),music=path.join(dir,"music.wav"),voice=path.join(dir,"voice.wav"),boom=path.join(dir,"boom.wav"),ding=path.join(dir,"ding.wav");
for(const f of [source,music,voice,boom,ding])fs.writeFileSync(f,path.basename(f));
const calls=[];

function fakeSpawn(command,args,options={}){
  calls.push({command,args:[...args],options});const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  process.nextTick(()=>{
    if(args.includes("-version")){child.stdout.emit("data",Buffer.from("ffmpeg version CFS-V34\n"));child.emit("close",0);return}
    if(args.includes("-filters")){child.stdout.emit("data",Buffer.from(" drawtext zoompan xfade acrossfade loudnorm amix sidechaincompress\n"));child.emit("close",0);return}
    if(args.includes("-encoders")){child.stdout.emit("data",Buffer.from(" libx264\n"));child.emit("close",0);return}
    if(args.includes("-frames:a")){child.emit("close",0);return}
    const out=args.at(-1),full=path.isAbsolute(out)?out:path.join(options.cwd||process.cwd(),out);
    fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,Buffer.alloc(args.some(a=>String(a).includes("sidechaincompress"))?999:args.includes("-filter_complex")?600:180));child.emit("close",0);
  });return child;
}

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),spawnImpl:fakeSpawn,env:{CFS_FFMPEG_PATH:"fake-ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();
if(!probe.capabilities.sidechaincompress||!probe.capabilities.zoompan||!probe.capabilities.amix)throw new Error("capabilities");

const job={id:"v34",manifest:{schema:5,project_title:"V34 Reel",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both",transition:"fade",transition_ms:200,encoder:"software",audio_normalize:false,audio_bitrate_kbps:160,music_enabled:true,music_gain_db:-18,music_loop:true,music_fade_in_ms:100,music_fade_out_ms:200,voiceover_enabled:true,voiceover_gain_db:2,voiceover_start_ms:300,voiceover_fade_in_ms:50,voiceover_fade_out_ms:100,ducking_enabled:true,ducking_ratio:10,sfx_tracks:[
 {id:"boom",name:"Boom",enabled:true,start_ms:500,gain_db:-3,fade_in_ms:0,fade_out_ms:100},
 {id:"ding",name:"Ding",enabled:true,start_ms:1000,gain_db:-6,fade_in_ms:0,fade_out_ms:0}
]},clips:[
 {clip_id:"a",label:"A",in_ms:0,out_ms:1400,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:true,visual_keyframes:[
  {at:0,zoom:1,pan_x:-.4,pan_y:0,easing:"linear"},{at:.4,zoom:1.25,pan_x:0,pan_y:.2,easing:"ease_in_out"},{at:1,zoom:1.5,pan_x:.4,pan_y:0,easing:"linear"}]},
 {clip_id:"b",label:"B",in_ms:1500,out_ms:3000,caption:"",caption_enabled:false,audio_gain_db:0,audio_fade_in_ms:0,audio_fade_out_ms:0,keyframe_enabled:false}
]}};

const result=await engine.runJob({job,sourcePath:source,musicPath:music,voicePath:voice,sfxSources:[{trackId:"boom",filePath:boom},{trackId:"ding",filePath:ding}]});
if(result.outputs.length!==3)throw new Error("outputs");
const kfCall=calls.find(c=>c.args.includes("-vf")&&String(c.args[c.args.indexOf("-vf")+1]).includes("if(lte("));
if(!kfCall)throw new Error("piecewise keyframes");
const mixCall=calls.find(c=>c.args.some(a=>String(a).includes("sidechaincompress")));
if(!mixCall)throw new Error("sidechain mix");
const graph=mixCall.args[mixCall.args.indexOf("-filter_complex")+1];
if(!graph.includes("sidechaincompress=threshold=0.035:ratio=10.0")||!graph.includes("amix=inputs=5"))throw new Error("multitrack graph");
if(!graph.includes("adelay=300|300")||!graph.includes("adelay=500|500")||!graph.includes("adelay=1000|1000"))throw new Error("track timing");
if(!result.result.note.includes("Voiceover")||!result.result.note.includes("SFX 2")||!result.result.note.includes("Ducking"))throw new Error("result note");

console.log(JSON.stringify({ok:true,free_keyframes:true,tracks:5,ducking:true,outputs:3}));
