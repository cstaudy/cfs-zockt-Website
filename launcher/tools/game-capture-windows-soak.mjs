import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {GameCaptureSourceManager,MIN_WINDOWS_BUILD,parseWindowsBuild,classifyExit}=require('../src/game-capture-source-manager.js');
const here=path.dirname(fileURLToPath(import.meta.url));
const launcherRoot=path.resolve(here,'..');
const helperPath=process.env.CFS_GAME_CAPTURE_PATH||path.join(launcherRoot,'vendor','game-capture','cfs-game-capture.exe');
const reportPath=path.join(launcherRoot,'reports','game-capture-windows-soak.json');

function argValue(name,fallback=''){const i=process.argv.indexOf(name);return i>=0&&i+1<process.argv.length?process.argv[i+1]:fallback}
function safeInt(value,min,max,fallback){const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

const pid=safeInt(argValue('--pid','0'),1,0x7fffffff,0);
const seconds=safeInt(argValue('--seconds','120'),10,3600,120);
const width=safeInt(argValue('--width','640'),64,3840,640);
const height=safeInt(argValue('--height','360'),64,2160,360);
const fps=safeInt(argValue('--fps','30'),15,60,30);
const stallTimeoutMs=safeInt(argValue('--stall-timeout-ms','5000'),2000,30000,5000);
const startTimeoutMs=safeInt(argValue('--start-timeout-ms','8000'),stallTimeoutMs,60000,Math.max(stallTimeoutMs,8000));

const manager=new GameCaptureSourceManager({platform:process.platform,env:{...process.env,CFS_GAME_CAPTURE_PATH:helperPath},osRelease:os.release()});
const doctor=await manager.doctor({timeoutMs:5000});
if(!pid){console.error('[CFS] --pid ist für den Game-Capture-Soak erforderlich.');process.exit(2)}
if(!doctor.ok){console.error('[CFS] Game-Capture Helper ist nicht runtime-verifiziert.');process.exit(1)}

const startedAt=Date.now(),deadline=startedAt+seconds*1000,frameBytes=width*height*4;
let totalBytes=0,totalFrames=0,restarts=0;const exits=[];
while(Date.now()<deadline){
  const remainingMs=deadline-Date.now();
  const result=await new Promise(resolve=>{
    let bytes=0,stderr='',settled=false,child,timer;
    const finish=(extra={})=>{if(settled)return;settled=true;if(timer)clearTimeout(timer);resolve({bytes,frames:Math.floor(bytes/frameBytes),stderr:String(stderr||'').trim().slice(-800),...extra})};
    try{child=spawn(helperPath,['--pid',String(pid),'--width',String(width),'--height',String(height),'--fps',String(fps),'--cursor','1','--stall-timeout-ms',String(stallTimeoutMs),'--start-timeout-ms',String(startTimeoutMs)],{windowsHide:true,stdio:['ignore','pipe','pipe']})}catch(error){finish({exitCode:null,error:String(error?.message||error),reason:'spawn_error'});return}
    child.stdout.on('data',chunk=>{bytes+=chunk.length});
    child.stderr.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-8192)});
    child.once('error',error=>finish({exitCode:null,error:String(error?.message||error),reason:'spawn_error'}));
    child.once('close',code=>finish({exitCode:code,reason:classifyExit(code,stderr),error:''}));
    timer=setTimeout(()=>{try{child.kill()}catch{};setTimeout(()=>finish({exitCode:null,reason:'soak_complete',error:''}),200).unref?.()},Math.max(250,remainingMs));
    timer.unref?.();
  });
  totalBytes+=result.bytes;totalFrames+=result.frames;
  if(result.reason==='soak_complete')break;
  exits.push({at:new Date().toISOString(),exitCode:result.exitCode,reason:result.reason,frames:result.frames,bytes:result.bytes,stderr:result.stderr,error:result.error||''});
  restarts+=1;
  if(Date.now()<deadline)await sleep(Math.min(1000,Math.max(250,deadline-Date.now())));
}

const evidence={schema:1,pass:'21.10.21',checkedAt:new Date().toISOString(),platform:process.platform,arch:process.arch,windowsBuild:parseWindowsBuild(os.release()),minimumWindowsBuild:MIN_WINDOWS_BUILD,helperPath,helperRuntimeVerified:doctor.helper?.runtimeVerified===true,targetPid:pid,durationMs:Date.now()-startedAt,width,height,fps,stallTimeoutMs,startTimeoutMs,totalBytes,totalFrames,restarts,exits,rawVideoPersisted:false,ok:doctor.ok===true&&totalFrames>0};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(evidence,null,2)+'\n','utf8');
console.log(`[CFS] Game capture soak: ${evidence.ok?'PASS':'FAIL'} · ${totalFrames} frame(s) · ${restarts} recovery restart(s) · ${evidence.durationMs} ms`);
for(const row of exits)console.log(`[CFS] Recovery: ${row.reason} · exit ${row.exitCode??'n/a'} · ${row.frames} frame(s)`);
console.log(`[CFS] Evidence: ${reportPath}`);
console.log('[CFS] Während des Soaks kannst du Alt-Tab, Minimieren und Fullscreen/Windowed-Wechsel testen. Es wird kein Rohvideo gespeichert.');
process.exitCode=evidence.ok?0:1;
