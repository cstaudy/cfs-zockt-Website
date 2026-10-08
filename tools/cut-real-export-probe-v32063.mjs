import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {CutMediaEngine}=require('../launcher/src/cut-media-engine.js');
const command=(bin,args)=>spawnSync(bin,args,{encoding:'utf8',timeout:90000});
for(const bin of ['ffmpeg','ffprobe']){
  const result=command(bin,['-version']);if(result.status!==0){console.error(bin+' fehlt: realistischer Codec-Smoke-Test nicht möglich.');process.exit(2)}
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-cut-32063-'));
try{
  const src=path.join(dir,'source.mp4');
  const generate=command('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc=size=320x240:rate=30',
    '-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','2.5','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',src]);
  if(generate.status!==0)throw Error('Synthetic source failed: '+generate.stderr);
  const job={id:'cfs-probe-32063',manifest:{project_title:'Cut Studio Codec Probe',format:'vertical',export_preset:{width:360,height:640,fps:30,quality:'standard'},
    clips:[{clip_id:'probe',label:'Sync check',in_ms:500,out_ms:1600}]}};
  const engine=new CutMediaEngine({outputRoot:path.join(dir,'out'),env:{...process.env,CFS_FFMPEG_PATH:'ffmpeg'},resourcesPath:'',execPath:''});
  const result=await engine.runJob({job,sourcePath:src});
  if(result.outputs.length!==1)throw Error('Expected exactly one local export');
  const output=result.outputs[0].filePath;
  if(!fs.existsSync(output)||fs.statSync(output).size<1024)throw Error('Missing output');
  const probe=command('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name,width,height','-of','json',output]);
  if(probe.status!==0)throw Error('FFprobe failed: '+probe.stderr);
  const data=JSON.parse(probe.stdout),video=data.streams.find(s=>s.codec_type==='video'),audio=data.streams.find(s=>s.codec_type==='audio');
  if(!video||video.codec_name!=='h264'||video.width!==360||video.height!==640)throw Error('Video codec and dimensions invalid: '+JSON.stringify(video));
  if(!audio||audio.codec_name!=='aac')throw Error('Audio stream missing or not AAC: '+JSON.stringify(audio));
  const duration=Number(data.format.duration);
  if(!(duration>1.00&&duration<1.35))throw Error('Export duration out of range: '+duration);
  console.log(JSON.stringify({ok:true,platform:process.platform,launcher:'existing CutMediaEngine',ffmpeg_video:video.codec_name,ffmpeg_audio:audio.codec_name,dimensions:'360x640',duration_s:duration,bytes:Number(data.format.size),note:'synthetic local software export only; no Windows/hardware/OBS validation'}));
}finally{fs.rmSync(dir,{recursive:true,force:true})}
