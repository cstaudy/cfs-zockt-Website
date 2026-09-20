import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {ApplicationAudioSourceManager,MIN_WINDOWS_BUILD,PROCESS_LOOPBACK_PROTOCOL,parseWindowsBuild}=require('../src/application-audio-source-manager.js');
const here=path.dirname(fileURLToPath(import.meta.url));
const launcherRoot=path.resolve(here,'..');
const helperPath=process.env.CFS_AUDIO_LOOPBACK_PATH||path.join(launcherRoot,'vendor','audio','cfs-audio-loopback.exe');
const reportPath=path.join(launcherRoot,'reports','application-audio-windows-acceptance.json');

function argValue(name,fallback=''){
  const i=process.argv.indexOf(name);return i>=0&&i+1<process.argv.length?process.argv[i+1]:fallback;
}
function safeInt(value,min,max,fallback){const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback}
function runCaptureSmoke(file,pid,seconds){
  return new Promise(resolve=>{
    const started=Date.now();let bytes=0,stderr='',settled=false,child,timer=null;
    const finish=(extra={})=>{if(settled)return;settled=true;if(timer)clearTimeout(timer);resolve({bytes,durationMs:Date.now()-started,stderr:String(stderr||'').trim().slice(0,500),...extra})};
    try{child=spawn(file,['--pid',String(pid),'--include-tree','--stdout-s16le','--rate','48000','--channels','2'],{windowsHide:true,stdio:['ignore','pipe','pipe']})}catch(error){finish({ok:false,error:String(error?.message||error)});return}
    child.stdout.on('data',chunk=>{bytes+=chunk.length});
    child.stderr.on('data',chunk=>{stderr+=String(chunk).slice(0,4096)});
    child.once('error',error=>finish({ok:false,error:String(error?.message||error)}));
    child.once('close',code=>{if(!settled)finish({ok:bytes>0,exitCode:code,error:bytes>0?'':`Helper ended before PCM data was observed${stderr?`: ${stderr.trim()}`:''}`})});
    if(!settled)timer=setTimeout(()=>{try{child.kill()}catch{};setTimeout(()=>finish({ok:bytes>0,exitCode:null,error:bytes>0?'':'No PCM bytes observed during smoke window.'}),250).unref?.()},seconds*1000);
  });
}

const seconds=safeInt(argValue('--seconds','5'),1,30,5);
const pid=safeInt(argValue('--pid','0'),1,0x7fffffff,0);
const build=parseWindowsBuild(os.release());
const manager=new ApplicationAudioSourceManager({platform:process.platform,env:{...process.env,CFS_AUDIO_LOOPBACK_PATH:helperPath},osRelease:os.release()});
const doctor=await manager.doctor({timeoutMs:5000});
let capture=null;
if(pid&&doctor.ok)capture=await runCaptureSmoke(helperPath,pid,seconds);

const evidence={
  schema:1,
  pass:'21.10.16',
  checkedAt:new Date().toISOString(),
  platform:process.platform,
  arch:process.arch,
  windowsBuild:build,
  minimumWindowsBuild:MIN_WINDOWS_BUILD,
  helperPathExists:fs.existsSync(helperPath),
  helperProtocol:doctor.helper?.protocol||'',
  helperRuntimeVerified:doctor.helper?.runtimeVerified===true,
  targetProcessProvided:Boolean(pid),
  capture: capture?{ok:capture.ok===true,bytes:Number(capture.bytes||0),durationMs:Number(capture.durationMs||0),error:String(capture.error||capture.stderr||'').slice(0,500)}:null,
  checks:doctor.checks||[],
  ok:doctor.ok===true&&(!pid||capture?.ok===true)
};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(evidence,null,2)+'\n','utf8');

console.log(`[CFS] Windows build: ${build||'unknown'} (minimum ${MIN_WINDOWS_BUILD})`);
console.log(`[CFS] Helper protocol: ${evidence.helperProtocol||'not verified'} (expected ${PROCESS_LOOPBACK_PROTOCOL})`);
if(capture)console.log(`[CFS] Capture smoke: ${capture.ok?'PASS':'FAIL'} · ${capture.bytes} PCM bytes · ${capture.durationMs} ms`);
console.log(`[CFS] Evidence: ${reportPath}`);
console.log(evidence.ok?'[CFS] APPLICATION AUDIO ACCEPTANCE: PASS':'[CFS] APPLICATION AUDIO ACCEPTANCE: FAIL');
process.exitCode=evidence.ok?0:1;
