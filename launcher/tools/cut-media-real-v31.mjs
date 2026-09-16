import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");

if(spawnSync("ffmpeg",["-version"],{stdio:"ignore"}).status!==0){
  console.log(JSON.stringify({ok:true,skipped:true,reason:"ffmpeg unavailable"}));process.exit(0);
}
const filters=spawnSync("ffmpeg",["-hide_banner","-filters"],{encoding:"utf8"});
if(!/(^|\s)drawtext(\s|$)/m.test(filters.stdout||filters.stderr||"")){
  console.log(JSON.stringify({ok:true,skipped:true,reason:"drawtext unavailable"}));process.exit(0);
}

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-real-v31-")),source=path.join(dir,"source.mp4");
const make=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc=size=320x240:rate=30","-f","lavfi","-i","sine=frequency=660:sample_rate=44100","-t","3","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",source],{encoding:"utf8"});
if(make.status!==0)throw new Error(make.stderr||"source creation failed");

const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),env:{...process.env,CFS_FFMPEG_PATH:"ffmpeg"},resourcesPath:"",execPath:""});
const job={id:"real-v31",manifest:{schema:2,project_title:"Caption Reel",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard",mode:"both"},clips:[
 {clip_id:"a",label:"first",in_ms:0,out_ms:900,caption:"CFS TEST 1",caption_enabled:true,caption_position:"bottom",caption_size:32,caption_style:"box"},
 {clip_id:"b",label:"second",in_ms:1100,out_ms:2100,caption:"CFS TEST 2",caption_enabled:true,caption_position:"top",caption_size:30,caption_style:"outline"}
]}};
const result=await engine.runJob({job,sourcePath:source});
const reel=result.outputs.find(o=>o.kind==="reel");
if(result.outputs.length!==3||!reel||!fs.existsSync(reel.filePath)||reel.bytes<=0)throw new Error("real reel output missing");
console.log(JSON.stringify({ok:true,skipped:false,outputs:result.outputs.length,reel_bytes:reel.bytes,drawtext:true}));
