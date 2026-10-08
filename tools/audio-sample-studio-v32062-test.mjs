import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const lib = require(path.join(base, 'public/assets/js/audio-sample-core-v32062.js'));
const read = p => fs.readFileSync(path.join(base,p),'utf8');
let cases = 0;
function check(name, callback){ try{callback(); console.log('PASS',name);cases++}catch(e){console.error('FAIL',name);throw e} }
function fake(samples, sampleRate=8000) {
  return {numberOfChannels:samples.length, sampleRate, length:samples[0].length,
    duration:samples[0].length/sampleRate,getChannelData:i=>samples[i]};
}
function sine(frames,amp=0.5) {return Float32Array.from({length:frames},(_,i)=>Math.sin(2*Math.PI*i/100)*amp)}
check('Valid audio file formats and bounded file size',()=>{
  for (const ext of ['wav','mp3','ogg','m4a','aac','flac','opus','webm']) assert.equal(lib.checkFile({name:'alert.'+ext,size:1024,type:''}),true);
  assert.throws(()=>lib.checkFile({name:'fake.svg',size:100,type:'image/svg+xml'}),/Audiodatei/);
  assert.throws(()=>lib.checkFile({name:'x.wav',size:lib.MAX_FILE_BYTES+1,type:'audio/wav'}),/20 MB/);
  assert.throws(()=>lib.checkFile({name:'x.wav',size:1,type:'text/html'}),/keine Audiodatei/);
  assert.throws(()=>lib.checkFile({name:'x.wav',size:0,type:'audio/wav'}),/20 MB/);
});
check('Reject corrupt/oversized decoded buffers',()=>{
  assert.throws(()=>lib.validateBuffer(fake([new Float32Array(121*8000)])),/120 Sekunden/);
  assert.throws(()=>lib.validateBuffer(fake([sine(100),sine(100),sine(100)])),/Mono- und Stereo/);
  assert.throws(()=>lib.validateBuffer(fake([new Float32Array(0)])),/Originalsound/);
  assert.throws(()=>lib.validateBuffer({...fake([sine(100)]),sampleRate:4400}),/Abtastrate/);
});
check('Trim uses exact source frame window for mono',()=>{
  const input = fake([Float32Array.from([0,.1,.2,.3,.4,.5,.6,.7,.8,.9])]);
  const out = lib.process(input,{start:2/8000,end:7/8000,fadeIn:0,fadeOut:0,peakLimit:false});
  assert.equal(out.frames,5);assert.ok(Math.abs(out.channels[0][0]-.2)<1e-6);assert.ok(Math.abs(out.channels[0][4]-.6)<1e-6);
});
check('Stereo stays separated, with interleaved PCM encoding',()=>{
  const input = fake([Float32Array.from([1,.5]),Float32Array.from([-1,-.5])],44100);
  const out = lib.process(input,{start:0,end:2/44100,fadeIn:0,fadeOut:0,peakLimit:false});
  const bytes = lib.encodeWav(out),view=new DataView(bytes);
  assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint32(24,true),44100);
  assert.equal(view.getInt16(44,true),32767);assert.equal(view.getInt16(46,true),-32768);
  assert.equal(view.getInt16(48,true),16384);assert.equal(view.getInt16(50,true),-16384);
});
check('Fade-in and fade-out actually alter PCM samples',()=>{
  const input=fake([new Float32Array(8000).fill(.7)]);
  const out=lib.process(input,{start:0,end:1,fadeIn:.25,fadeOut:.25,peakLimit:false});
  assert.equal(out.channels[0][0],0);
  assert.ok(out.channels[0][800]>.2 && out.channels[0][800]<.3);
  assert.ok(out.channels[0][4000]>.69);
  assert.ok(out.channels[0][7200]<.3);
});
check('Gain changes PCM by correct decibels',()=>{
  const input=fake([new Float32Array(8000).fill(.25)]);
  const a=lib.process(input,{start:0,end:1,fadeIn:0,fadeOut:0,gainDb:6,peakLimit:false});
  const b=lib.process(input,{start:0,end:1,fadeIn:0,fadeOut:0,gainDb:-6,peakLimit:false});
  assert.ok(a.channels[0][4000]>.49 && a.channels[0][4000]<.51);
  assert.ok(b.channels[0][4000]>.12 && b.channels[0][4000]<.13);
});
check('Peak guard attenuates over-ceiling but never boosts quiet samples',()=>{
  const input=fake([new Float32Array(8000).fill(.99)]);
  const guarded=lib.process(input,{start:0,end:1,fadeIn:0,fadeOut:0,gainDb:6,peakLimit:true});
  assert.equal(guarded.limited,true);assert.ok(guarded.peak<.892 && guarded.peak>.890);
  const quiet=lib.process(fake([new Float32Array(8000).fill(.1)]),{start:0,end:1,fadeIn:0,fadeOut:0,peakLimit:true});
  assert.equal(quiet.limited,false);assert.ok(quiet.peak<.101);
});
check('PCM clips safely when peak guard is disabled',()=>{
  const out=lib.process(fake([new Float32Array(8000).fill(1)]),{start:0,end:1,fadeIn:0,fadeOut:0,gainDb:12,peakLimit:false});
  assert.equal(out.peak,1);assert.equal(out.channels[0][4000],1);
});
check('Selection prevents zero-length and clips over 30 seconds',()=>{
  const input=fake([sine(40*8000)]);
  assert.throws(()=>lib.sanitizeSelection(input,{start:3,end:3}),/Ende muss/);
  assert.throws(()=>lib.sanitizeSelection(input,{start:0,end:31}),/maximal 30 Sekunden/);
  assert.equal(lib.sanitizeSelection(input,{start:10,end:29}).frames,152000);
});
check('Unsafe slider values do not result in NaN gain',()=>{
  const out=lib.process(fake([sine(8000)]),{start:'oops',end:1,gainDb:'oops',fadeIn:NaN,fadeOut:Infinity});
  assert.ok(out.channels[0].every(Number.isFinite));
});
check('WAV RIFF PCM headers and body length match',()=>{
  const out=lib.process(fake([sine(500)],8000),{start:0,end:500/8000});
  const bytes=lib.encodeWav(out),view=new DataView(bytes);
  assert.equal(bytes.byteLength,44+500*2);
  assert.equal(Buffer.from(bytes,0,4).toString(),'RIFF');assert.equal(Buffer.from(bytes,8,4).toString(),'WAVE');
  assert.equal(view.getUint32(4,true),bytes.byteLength-8);assert.equal(view.getUint32(40,true),bytes.byteLength-44);
  assert.equal(view.getUint16(20,true),1);assert.equal(view.getUint16(34,true),16);
});
check('Preview buffer receives exact PCM values also used by WAV',()=>{
  const out=lib.process(fake([Float32Array.from([.1,.2,.3,.4])],8000),{start:0,end:4/8000,fadeIn:0,fadeOut:0});
  const copied=[];const fakeContext={createBuffer:(n,length,rate)=>{assert.equal(rate,8000);assert.equal(length,4);return {copyToChannel:(data,i)=>copied[i]=data}}};
  lib.buildPreviewBuffer(fakeContext,out);assert.deepEqual([...copied[0]],[...out.channels[0]]);
  const wav=lib.encodeWav(out),view=new DataView(wav);
  assert.ok(Math.abs(view.getInt16(46,true)/32767-copied[0][1])<1/32767);
});
check('Export filename strips unsafe characters',()=>{
  assert.equal(lib.safeFilename('../../<alarm> evil.mp3'),'alarm-evil-cfs-alert.wav');
  assert.equal(lib.safeFilename('😀😀.wav'),'alert-sound-cfs-alert.wav');
});
check('UI contains actual editor controls, local-only disclosure, and correct script loading order',()=>{
  const html=read('public/pages/audio-studio.html');const js=read('public/assets/js/audio-sample-studio-v32062.js');
  for(const id of ['alertToneStudio','toneFile','toneWave','toneStart','toneEnd','toneFadeIn','toneFadeOut','toneGain','tonePeakLimit','tonePlay','toneStop','toneDownload','toneStatus']) assert.ok(html.includes(`id="${id}"`),id);
  assert.ok(html.indexOf('audio-sample-core-v32062.js') < html.indexOf('audio-sample-studio-v32062.js'));
  assert.match(html,/kein Cloud-Upload/i);assert.match(html,/keine automatische Widget-Alert-Verknüpfung/i);
  assert.match(js,/decodeAudioData/);assert.match(js,/createBufferSource/);assert.match(js,/core\.process\(decoded,opts\(\)\)/);
  assert.match(js,/URL\.revokeObjectURL/);assert.ok(!js.includes('fetch('));
});
check('Existing preset forms stay unchanged; no schema/launcher changes',()=>{
  const html=read('public/pages/audio-studio.html'),js=read('public/assets/js/page-audio-studio.js');
  for(const name of ['master','voice','game','soundboard','preset_name']) assert.ok(html.includes(`name="${name}"`));
  assert.match(js,/\/api\/creator\/modules\/audio_studio\/state/);
  assert.match(html,/Voice Chain/);assert.match(html,/ROADMAP/);
});
check('Version scripts and accompanying assets',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'3.20.62');assert.match(pkg.scripts['check:v32062'],/audio-sample-studio-v32062-test/);
  assert.ok(fs.statSync(path.join(base,'public/assets/css/audio-sample-studio-v32062.css')).size>1000);
});
console.log(`\nAudio Sample Studio 3.20.62: ${cases}/${cases} PASS`);
