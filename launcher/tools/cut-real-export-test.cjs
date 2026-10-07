'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {CutMediaEngine}=require('../src/cut-media-engine');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfs-cut-real-'));
const ffmpeg=process.env.CFS_FFMPEG_PATH||'ffmpeg',ffprobe=process.env.CFS_FFPROBE_PATH||'ffprobe';
function run(exe,args){return execFileSync(exe,args,{timeout:90000,maxBuffer:4*1024*1024,encoding:'utf8',stdio:['ignore','pipe','pipe']});}
(async()=>{try{const source=path.join(dir,'source.mp4');run(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=25','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','4','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',source]);
const engine=new CutMediaEngine({outputRoot:path.join(dir,'out'),env:{...process.env,CFS_FFMPEG_PATH:ffmpeg}});const probe=await engine.probe();assert.equal(probe.available,true,'FFmpeg verfügbar');
const valid={manifest:{clips:[{in_ms:0,out_ms:1000}]}};
assert.equal((await engine.preflightJob({sourcePath:source,job:valid})).ok,true);
await assert.rejects(engine.preflightJob({sourcePath:source,job:{manifest:{clips:[{in_ms:0,out_ms:9000}]}}}),/Schnittbereich/);
await assert.rejects(engine.preflightJob({sourcePath:path.join(dir,'missing.mp4'),job:valid}),/Videodatei/);
assert.equal(engine.cancelCurrentJob(),false);
engine.exportActive=true;
const pending=engine.runProcess(ffmpeg,['-hide_banner','-loglevel','error','-re','-i',source,'-f','null','-'],{exportProcess:true,timeoutMs:10000});
assert.equal(engine.exportChildren.size,1);
assert.equal(engine.cancelCurrentJob(),true);
await assert.rejects(pending,e=>e.code==='cut_cancelled');
assert.equal(engine.exportChildren.size,0);engine.exportActive=false;
const result=await engine.runJob({sourcePath:source,job:{id:'real-export',manifest:{project_title:'Real Export Check',format:'landscape',export_preset:{width:640,height:360,fps:25,quality:'standard',mode:'both',transition:'cut',encoder:'software',music_enabled:true,music_mute:true,voiceover_enabled:true,voiceover_mute:true,music_tracks:[{id:'muted',enabled:true,mute:true}],voice_tracks:[{id:'muted',enabled:true,mute:true}],sfx_tracks:[{id:'muted',enabled:true,mute:true}]},clips:[{clip_id:'a',label:'Clip A',in_ms:0,out_ms:1500},{clip_id:'b',label:'Clip B',in_ms:2000,out_ms:3500}]}}});
assert.equal(result.outputs.length,3);for(const o of result.outputs){const media=JSON.parse(run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',o.filePath]));const video=media.streams.find(s=>s.codec_type==='video'),audio=media.streams.find(s=>s.codec_type==='audio');assert.ok(video&&audio,'Bild- und Tonspur vorhanden');assert.equal(video.width,640);assert.equal(video.height,360);assert.ok(Math.abs(Number(media.format.duration)-o.durationMs/1000)<.25,'Dauer stimmt');run(ffmpeg,['-v','error','-i',o.filePath,'-f','null','-']);}
assert.equal(engine.snapshot().status,'completed');console.log('PASS: Vorprüfung, ungültige Bereiche, fehlende Datei, echter Prozessabbruch, erneuter Export und stumme Spuren ohne Quelldateien; echter FFmpeg-Export – zwei Clips und ein Reel, 640×360, Bild/Ton, Laufzeit und vollständiges Dekodieren geprüft.');}finally{fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e.stderr||e);process.exitCode=1;});
