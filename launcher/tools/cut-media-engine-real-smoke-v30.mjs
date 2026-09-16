import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{CutMediaEngine}=require("../src/cut-media-engine.js");
const probe=spawnSync("ffmpeg",["-version"],{stdio:"ignore"});
if(probe.status!==0){console.log(JSON.stringify({ok:true,skipped:true,reason:"ffmpeg unavailable"}));process.exit(0)}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-real-media-")),source=path.join(dir,"source.mp4");
const make=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc=size=320x240:rate=30","-f","lavfi","-i","sine=frequency=880:sample_rate=44100","-t","2","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",source],{encoding:"utf8"});
if(make.status!==0)throw new Error(make.stderr||"source creation failed");
const engine=new CutMediaEngine({outputRoot:path.join(dir,"exports"),env:{...process.env,CFS_FFMPEG_PATH:"ffmpeg"},resourcesPath:"",execPath:""});
const job={id:"real-job",manifest:{project_title:"Real Smoke",format:"vertical",export_preset:{width:360,height:640,fps:30,quality:"standard"},clips:[{clip_id:"a",label:"first",in_ms:0,out_ms:800},{clip_id:"b",label:"second",in_ms:900,out_ms:1700}]}};
const result=await engine.runJob({job,sourcePath:source});
if(result.outputs.length!==2||result.outputs.some(o=>!fs.existsSync(o.filePath)||o.bytes<=0))throw new Error("real outputs missing");
console.log(JSON.stringify({ok:true,skipped:false,clips:result.outputs.length,bytes:result.result.bytes,codec:result.result.codec}));
