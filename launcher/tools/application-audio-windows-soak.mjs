import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {Writable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {ApplicationAudioSourceManager,MIN_WINDOWS_BUILD,parseWindowsBuild}=require('../src/application-audio-source-manager.js');
const here=path.dirname(fileURLToPath(import.meta.url));
const launcherRoot=path.resolve(here,'..');
const helperPath=process.env.CFS_AUDIO_LOOPBACK_PATH||path.join(launcherRoot,'vendor','audio','cfs-audio-loopback.exe');
const reportPath=path.join(launcherRoot,'reports','application-audio-windows-soak.json');
const keys=['game','discord','music','alerts'];

function argValue(name,fallback=''){
  const i=process.argv.indexOf(name);return i>=0&&i+1<process.argv.length?process.argv[i+1]:fallback;
}
function hasArg(name){return process.argv.includes(name)}
function safeInt(value,min,max,fallback){const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback}
function listWindowsProcesses(){
  if(process.platform!=='win32')return Promise.resolve([]);
  const command='Get-Process | Where-Object { $_.Id -gt 0 -and $_.ProcessName } | Select-Object Id,ProcessName,MainWindowTitle | Sort-Object ProcessName,Id | ConvertTo-Json -Compress';
  return new Promise(resolve=>{
    execFile('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',command],{windowsHide:true,timeout:7000,maxBuffer:2*1024*1024},(error,stdout)=>{
      if(error){resolve([]);return}
      try{const parsed=JSON.parse(String(stdout||'[]')||'[]'),rows=Array.isArray(parsed)?parsed:(parsed?[parsed]:[]);resolve(rows.map(row=>({id:Number(row?.Id||0),name:String(row?.ProcessName||''),title:String(row?.MainWindowTitle||'')})).filter(row=>row.id>0&&row.name))}catch{resolve([])}
    });
  });
}

const seconds=safeInt(argValue('--seconds','120'),10,7200,120);
const allowSilent=hasArg('--allow-silent');
const current=await listWindowsProcesses();
const specs=[];
for(const key of keys){
  const pid=safeInt(argValue(`--${key}-pid`,'0'),1,0x7fffffff,0);
  if(!pid)continue;
  const row=current.find(item=>item.id===pid)||null;
  const explicitName=String(argValue(`--${key}-name`,'')).trim();
  const processName=explicitName||row?.name||'';
  if(!processName){console.error(`[CFS] ${key}: Prozessname konnte für PID nicht bestimmt werden. --${key}-name angeben.`);process.exitCode=2;process.exit()}
  specs.push({key,processId:pid,processName,includeTree:true});
}
if(!specs.length){
  console.error('[CFS] Mindestens eine Quelle angeben, z. B. --game-pid 1234.');
  process.exitCode=2;
}else{
  const manager=new ApplicationAudioSourceManager({platform:process.platform,env:{...process.env,CFS_AUDIO_LOOPBACK_PATH:helperPath},osRelease:os.release(),processResolver:listWindowsProcesses});
  const doctor=await manager.doctor({timeoutMs:5000});
  const sinkStats=new Map();
  const detachers=[];
  if(doctor.ok){
    manager.prepare(specs);
    for(const spec of specs){
      const stats={writes:0,bytes:0,lastWriteAt:0};sinkStats.set(spec.key,stats);
      const sink=new Writable({write(chunk,_enc,callback){stats.writes++;stats.bytes+=chunk.length;stats.lastWriteAt=Date.now();callback();}});
      detachers.push(manager.attach(spec.key,sink));
    }
    const deadline=Date.now()+seconds*1000;
    while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,1000));await manager.monitorTick();}
  }
  const snapshot=manager.snapshot();
  for(const detach of detachers)try{detach()}catch{}
  manager.releaseAll();
  const sources=(snapshot.sources||[]).map(source=>({
    key:source.key,
    helperPcmBytes:Number(source.bytes||0),
    continuityBytes:Number(source.continuityBytes||0),
    helperRestarts:Number(source.helperRestarts||0),
    processRebinds:Number(source.processRebinds||0),
    waitingForProcess:source.waitingForProcess===true,
    processState:String(source.processState||''),
    sinkBytes:Number(sinkStats.get(source.key)?.bytes||0),
    sinkWrites:Number(sinkStats.get(source.key)?.writes||0),
    error:String(source.error||'').slice(0,240)
  }));
  const sourcePass=sources.length===specs.length&&sources.every(source=>!source.waitingForProcess&&(allowSilent||source.helperPcmBytes>0));
  const evidence={
    schema:1,
    pass:'21.10.17',
    checkedAt:new Date().toISOString(),
    platform:process.platform,
    arch:process.arch,
    windowsBuild:parseWindowsBuild(os.release()),
    minimumWindowsBuild:MIN_WINDOWS_BUILD,
    durationSeconds:seconds,
    allowSilent,
    sourceCount:specs.length,
    helperRuntimeVerified:doctor.ok===true,
    recovery:snapshot.recovery||{},
    sources,
    rawAudioPersisted:false,
    ok:doctor.ok===true&&sourcePass
  };
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});
  fs.writeFileSync(reportPath,JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log(`[CFS] Application Audio Soak: ${seconds}s · ${specs.length} Quelle(n)`);
  for(const source of sources)console.log(`[CFS] ${source.key.toUpperCase()}: helper=${source.helperPcmBytes} B · continuity=${source.continuityBytes} B · rebind=${source.processRebinds} · restart=${source.helperRestarts}`);
  console.log(`[CFS] Evidence: ${reportPath}`);
  console.log(evidence.ok?'[CFS] APPLICATION AUDIO SOAK: PASS':'[CFS] APPLICATION AUDIO SOAK: FAIL');
  process.exitCode=evidence.ok?0:1;
}
