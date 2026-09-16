import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {EventEmitter} from "node:events";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-media-v31-")),source=path.join(dir,"source.mp4");
fs.writeFileSync(source,"source");
const calls=[];

function fakeSpawn(command,args,options={}){
  calls.push({command,args:[...args],options});
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  process.nextTick(()=>{
    if(args.includes("-version")){child.stdout.emit("data",Buffer.from("ffmpeg version CFS-V31\n"));child.emit("close",0);return}
    if(args.includes("-filters")){child.stdout.emit("data",Buffer.from(" T.C drawtext V->V Draw text\n TS xfade VV->V Cross fade\n T.C acrossfade AA->A Audio cross fade\n TSC loudnorm A->A Loudness\n"));child.emit("close",0);return}
    if(args.includes("-encoders")){child.stdout.emit("data",Buffer.from(" V....D libx264 H.264\n"));child.emit("close",0);return}
    if(args.includes("-frames:a")){child.emit("close",0);return}
    const output=args.at(-1);
    const full=path.isAbsolute(output)?output:path.join(options.cwd||process.cwd(),output);
    fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,Buffer.alloc(args.includes("concat")?333:111));
    child.emit("close",0);
  });
  return child;
}

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),spawnImpl:fakeSpawn,env:{CFS_FFMPEG_PATH:"fake-ffmpeg"},resourcesPath:"",execPath:""});
const probe=await engine.probe();
if(!probe.available||!probe.capabilities.drawtext)throw new Error("drawtext probe");

const job={id:"job-v31",manifest:{schema:2,project_title:"Creator Reel",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both"},clips:[
 {clip_id:"a",label:"eins",in_ms:0,out_ms:1000,caption:"Hallo: Creator",caption_enabled:true,caption_position:"bottom",caption_size:48,caption_style:"box"},
 {clip_id:"b",label:"zwei",in_ms:1000,out_ms:2200,caption:"Weiter",caption_enabled:true,caption_position:"top",caption_size:40,caption_style:"outline"}
]}};

const result=await engine.runJob({job,sourcePath:source});
if(result.outputs.length!==3||result.outputs.filter(o=>o.kind==="clip").length!==2||result.outputs.filter(o=>o.kind==="reel").length!==1)throw new Error("outputs");
const renderCalls=calls.filter(c=>!c.args.includes("-version")&&!c.args.includes("-filters")&&!c.args.includes("-encoders")&&!c.args.includes("-frames:a")&&!c.args.includes("concat"));
if(renderCalls.length!==2)throw new Error("clip renders");
if(!renderCalls[0].args.join(" ").includes("drawtext=")||!renderCalls[0].args.join(" ").includes("box=1"))throw new Error("caption args");
const concatCall=calls.find(c=>c.args.includes("concat"));if(!concatCall||!concatCall.options.cwd)throw new Error("concat");
if(engine.snapshot().phase!=="done"||engine.snapshot().progress!==100)throw new Error("final state");

console.log(JSON.stringify({ok:true,drawtext:true,clips:2,reel:1,mode:"both"}));
