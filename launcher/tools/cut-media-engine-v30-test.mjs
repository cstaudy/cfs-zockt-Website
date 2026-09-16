import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {EventEmitter} from "node:events";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-media-engine-")),source=path.join(dir,"source.mp4");fs.writeFileSync(source,"source");
const calls=[];
function fakeSpawn(command,args){
  calls.push({command,args:[...args]});
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  process.nextTick(()=>{
    if(args.includes("-version")){child.stdout.emit("data",Buffer.from("ffmpeg version CFS-FAKE\n"));child.emit("close",0);return;}
    if(args.includes("-filters")){child.stdout.emit("data",Buffer.from(" T.C drawtext V->V Draw text\n TS xfade VV->V Cross fade\n T.C acrossfade AA->A Audio cross fade\n TSC loudnorm A->A Loudness\n"));child.emit("close",0);return;}
    if(args.includes("-encoders")){child.stdout.emit("data",Buffer.from(" V....D libx264 H.264\n"));child.emit("close",0);return;}
    if(args.includes("-frames:a")){child.emit("close",0);return;}
    const output=args.at(-1);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.alloc(123));child.emit("close",0);
  });
  return child;
}
const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),spawnImpl:fakeSpawn,env:{CFS_FFMPEG_PATH:"fake-ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();if(!probe.available||probe.ffmpegPath!=="fake-ffmpeg")throw new Error("probe");
const job={id:"job-1",manifest:{project_title:"TikTok Highlight",format:"vertical",export_preset:{width:1080,height:1920,fps:30,quality:"high"},clips:[{clip_id:"c1",label:"Intro",in_ms:1000,out_ms:2500},{clip_id:"c2",label:"Outro",in_ms:3000,out_ms:4000}]}};
const result=await engine.runJob({job,sourcePath:source});
if(result.outputs.length!==2||result.result.bytes!==246||result.result.duration_ms!==2500)throw new Error("result aggregation");
const renderCalls=calls.filter(c=>!c.args.includes("-version")&&!c.args.includes("-filters")&&!c.args.includes("-encoders")&&!c.args.includes("-frames:a"));if(renderCalls.length!==2)throw new Error("render count");
if(!renderCalls[0].args.join(" ").includes("scale=1080:1920")||!renderCalls[0].args.includes("libx264"))throw new Error("ffmpeg args");
if(engine.snapshot().status!=="completed"||engine.snapshot().progress!==100)throw new Error("state");
console.log(JSON.stringify({ok:true,clips:2,bytes:246,ffmpeg_args:true,progress:100}));
