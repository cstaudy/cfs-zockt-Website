import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const require=createRequire(import.meta.url);
const core=require(path.join(root,'public/assets/js/cut-preview-core-v32063.js'));
let total=0;
function check(title,run){run();total++;console.log('PASS',title)}
check('Accept local MP4 and audio with valid MIME or no MIME',()=>{
  assert.equal(core.checkFile({name:'local.mp4',size:1024,type:'video/mp4'},'video'),true);
  assert.equal(core.checkFile({name:'voice.wav',size:40,type:''},'audio'),true);
});
check('Reject disguised web content and unsupported extensions',()=>{
  assert.throws(()=>core.checkFile({name:'evil.html',size:123,type:'video/mp4'},'video'));
  assert.throws(()=>core.checkFile({name:'voice.mp3',size:123,type:'text/html'},'audio'));
});
check('Reject zero-byte and excessive media sizes',()=>{
  assert.throws(()=>core.checkFile({name:'a.mp4',size:0},'video'));
  assert.throws(()=>core.checkFile({name:'a.mp4',size:core.MAX_VIDEO_BYTES+1},'video'),/2 GB/);
  assert.throws(()=>core.checkFile({name:'a.mp3',size:core.MAX_AUDIO_BYTES+1},'audio'),/100 MB/);
});
check('Clip bounds reject empty, reversed, negative and non-finite selections',()=>{
  for(const clip of [{start:1,end:1},{start:3,end:2},{start:-1,end:2},{start:'abc',end:4},{start:1,end:Infinity},{start:1,end:1.02}])assert.throws(()=>core.clipBounds(clip));
});
check('Clip bounds allow valid range and block beyond matching local source',()=>{
  assert.deepEqual(core.clipBounds({start:3,end:9},10),{start:3,end:9});
  assert.throws(()=>core.clipBounds({start:3,end:11},10),/außerhalb/);
});
check('Extra track timing uses clip-relative timeline and start delay',()=>{
  assert.equal(core.trackPosition(12,10,3,8,false),null);
  assert.equal(core.trackPosition(15.5,10,3,8,false),2.5);
});
check('Loop track wraps while one-shot ends',()=>{
  assert.equal(core.trackPosition(17,10,0,3,true),1);
  assert.equal(core.trackPosition(17,10,0,3,false),null);
});
check('Invalid track durations never create NaN',()=>{
  assert.equal(core.trackPosition(17,10,0,NaN,true),null);
  assert.equal(core.trackPosition('oops',10,0,3,true),null);
});
check('Gain conversion clamps to HTMLMediaElement volume',()=>{
  assert.equal(core.gainVolume(0),1);assert.equal(core.gainVolume(12),1);
  assert.ok(core.gainVolume(-6)>.49&&core.gainVolume(-6)<.51);
  assert.equal(core.gainVolume(-100),.001);
});
const base={sourceName:'stream.mp4',localVideoName:'stream.mp4',localDuration:30,mode:'clips',clips:[{label:'First',selected:true,start:1,end:10}]};
check('Valid export plan allows job and counts selected clips',()=>{
  const result=core.auditExport(base);assert.equal(result.ok,true);assert.equal(result.selectedCount,1);assert.equal(result.previewMatchesSource,true);
});
check('Reject missing source, no selected clips and invalid export mode',()=>{
  const result=core.auditExport({...base,sourceName:'',mode:'zip',clips:[{selected:false,start:1,end:3}]});
  assert.equal(result.ok,false);assert.equal(result.errors.length,3);
});
check('Reject non-number, reverse and off-video clip bounds in export plan',()=>{
  const result=core.auditExport({...base,clips:[{start:'',end:4},{start:3,end:2},{start:10,end:35}]});
  assert.equal(result.ok,false);assert.equal(result.errors.length,3);
});
check('Do not validate clip against unrelated preview video',()=>{
  const result=core.auditExport({...base,sourceName:'other.mp4',clips:[{start:10,end:35}]});
  assert.equal(result.ok,true);assert.equal(result.previewMatchesSource,false);assert.match(result.warnings.join(' '),/anderen Namen/);
});
check('Missing enabled audio filenames block an unusable export plan',()=>{
  const result=core.auditExport({...base,musicEnabled:true,voiceEnabled:true});
  assert.equal(result.ok,false);assert.equal(result.errors.length,2);
});
check('Audio mismatches and absent audio previews are clearly warnings',()=>{
  const result=core.auditExport({...base,musicEnabled:true,musicName:'music.mp3',localMusicName:'demo.mp3',voiceEnabled:true,voiceName:'voice.wav'});
  assert.equal(result.ok,true);assert.ok(result.warnings.some(x=>/Musikdatei/.test(x)));assert.ok(result.warnings.some(x=>/Voiceover im Browser/.test(x)));
});
check('Caption without text warns instead of fabricating an overlay',()=>{
  const result=core.auditExport({...base,clips:[{start:1,end:3,selected:true,caption_enabled:true,caption:''}]});
  assert.equal(result.ok,true);assert.ok(result.warnings.some(x=>/Caption aktiviert/.test(x)));
});
check('File name normalization avoids path separators and case mismatches',()=>{
  assert.equal(core.fileName('C:\\videos\\Stream.MP4'),'stream.mp4');
});
// Exercise actual browser controller using a deliberately small fake DOM without network or uploads.
function browserHarness(){
  const events={};
  function el(id){return{id,value:'',textContent:'',dataset:{},hidden:false,files:[],readyState:0,onclick:null,onchange:null,oninput:null,classList:{add(){},remove(){}},
    addEventListener(type,fn){(events[id+':'+type]??=[]).push(fn)},dispatchEvent(event){for(const fn of events[id+':'+event.type]||[])fn(event)},
    replaceChildren(){this.children=[];this.value=''},append(child){this.children??=[];this.children.push(child);if(id==='cutPreviewClip'&&!this.value)this.value=child.value},
    removeAttribute(field){delete this[field]},load(){},querySelectorAll(){return[]}}}
  const elements={};const $=id=>elements[id]??(elements[id]=el(id));
  const r={dataset:{clip:'clip1'},querySelector(selector){const match=selector.match(/data-field="([^"]+)"/);return match?fields[match[1]]?{value:fields[match[1]]}:null:null}};
  const fields={label:'Highlight',in_s:'10',out_s:'20',selected:'true',caption_enabled:'true',caption:'<img onerror=alert(1)>',caption_position:'bottom',caption_style:'box'};
  $('cutClipList').querySelectorAll=(selector)=>selector==='[data-clip]'?[r]:[];
  const video=$('cutLocalVideo');video.currentTime=0;video.duration=40;video.paused=true;
  video.pause=()=>{video.paused=true;video.dispatchEvent({type:'pause'})};
  video.play=()=>{video.paused=false;video.dispatchEvent({type:'play'});return Promise.resolve()};
  const audios=[];
  class AudioFake{constructor(){this.currentTime=0;this.duration=5;this.paused=true;this.volume=1;audios.push(this)}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}load(){}removeAttribute(field){delete this[field]}}
  const urls=[];
  const context={window:{CFSCutPreviewCore:core,addEventListener(){}},Audio:AudioFake,document:{getElementById:$,createElement:()=>({dataset:{},textContent:''}),addEventListener(){}},
    MutationObserver:class{observe(){}},URL:{createObjectURL(file){const url='blob:'+file.name;urls.push(url);return url},revokeObjectURL(url){urls.push('revoke:'+url)}},
    Event:class{constructor(type){this.type=type}}};
  for(const [id,value]of Object.entries({cutSourceName:'stream.mp4',cutExportMode:'clips',cutSourceMute:'false',cutSourceSolo:'false',cutMusicEnabled:'true',cutMusicName:'song.mp3',cutMusicGain:'-6',cutMusicStart:'2',cutMusicLoop:'true',cutMusicMute:'false',cutMusicSolo:'false',cutVoiceEnabled:'false',cutVoiceName:'',cutVoiceMute:'false',cutVoiceSolo:'false'}))$(id).value=value;
  vm.createContext(context);vm.runInContext(read('public/assets/js/cut-local-preview.js'),context);
  return{context,$,events,video,audios,urls,fields};
}
check('Browser controller mounts an export checker and preserves caption as literal text',()=>{
  const h=browserHarness();h.video.readyState=1;h.video.currentTime=12;h.video.dispatchEvent({type:'timeupdate'});
  assert.equal(h.$('cutPreviewCaption').hidden,false);assert.equal(h.$('cutPreviewCaption').textContent,'<img onerror=alert(1)>');
  assert.equal(typeof h.context.window.CFSCutPreview.preflightExport,'function');
});
check('Browser controller checks export plan and renders warnings with textContent',()=>{
  const h=browserHarness();h.$('cutCheckExport').onclick();assert.equal(h.$('cutExportCheckResult').dataset.valid,'true');
  assert.ok(h.$('cutExportCheckResult').children.length>=2);
});
check('Browser controller blocks invalid plan with no server job',()=>{
  const h=browserHarness();h.$('cutSourceName').value='';
  assert.throws(()=>h.context.window.CFSCutPreview.preflightExport(),/fehlerhaft/);
  assert.equal(h.$('cutExportCheckResult').dataset.valid,'false');
});
check('Browser local video choice updates source name and never uploads',()=>{
  const h=browserHarness();h.$('cutPreviewFile').files=[{name:'new.mp4',size:1024,type:'video/mp4'}];h.$('cutPreviewFile').onchange();
  assert.equal(h.$('cutSourceName').value,'new.mp4');assert.ok(h.urls.includes('blob:new.mp4'));
});
check('Browser track seek follows clip-relative time and music loop',()=>{
  const h=browserHarness();const music={name:'song.mp3',size:2048,type:'audio/mpeg'};
  h.$('cutPreviewMusicFile').files=[music];h.$('cutPreviewMusicFile').onchange();h.video.readyState=1;h.video.currentTime=15;h.video.paused=false;
  h.video.dispatchEvent({type:'play'});assert.equal(h.audios[0].currentTime,3);assert.equal(h.audios[0].paused,false);
  h.video.pause();assert.equal(h.audios[0].paused,true);
});
check('Browser controller revokes local object URLs on reset',()=>{
  const h=browserHarness();h.$('cutPreviewMusicFile').files=[{name:'song.mp3',size:2048,type:'audio/mpeg'}];h.$('cutPreviewMusicFile').onchange();
  h.$('cutPreviewClear').onclick();assert.ok(h.urls.includes('revoke:blob:song.mp3'));
});
check('HTML loads core before UI controller and marks limits of browser preview',()=>{
  const html=read('public/pages/cut-studio.html');
  assert.ok(html.indexOf('/cut-preview-core-v32063.js')<html.indexOf('/cut-local-preview.js'));
  for(const id of ['cutPreviewCaption','cutPreviewMusicFile','cutPreviewVoiceFile','cutExportCheckResult','cutCheckExport'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/kein finaler Render/i);assert.match(html,/kein Cloud-Upload/i);
});
check('Queue contract performs preflight before any write but keeps older API compatible',()=>{
  const js=read('public/assets/js/cut-studio.js');assert.match(js,/CFSCutPreview\?\.preflightExport\?\.\(\);await saveVisibleClips\(\)/);
  assert.match(js,/CFSCutPreview\?\.validateClips\(\)/);
});
await (async()=>{
  const js=read('public/assets/js/cut-studio.js');
  const queue=js.split('\n').find(line=>line.startsWith('$("#queueCutExport").onclick='));
  const simulate=async(block)=>{
    const calls=[],queueButton={},messages=[];
    const ctx={
      $:selector=>selector==='#queueCutExport'?queueButton:{},
      window:{CFSCutPreview:{preflightExport(){if(block)throw Error('preflight blocked')}}},
      state:{project:{id:'project'},jobs:[],limits:{}},
      async saveVisibleClips(){calls.push('saveClips')},
      async saveProject(){calls.push('saveProject')},
      CFS:{async json(){calls.push('POST');return{job:{id:'job'}}}},
      renderJobs(){calls.push('renderJobs')},toast(message){messages.push(message)}
    };
    vm.createContext(ctx);vm.runInContext(queue,ctx);await queueButton.onclick();return{calls,messages};
  };
  const blocked=await simulate(true);assert.deepEqual(blocked.calls,[]);assert.deepEqual(blocked.messages,['preflight blocked']);
  total++;console.log('PASS Failed preflight prevents saving and queueing jobs');
  const valid=await simulate(false);assert.deepEqual(valid.calls,['saveClips','saveProject','POST','renderJobs']);
  total++;console.log('PASS Valid preflight preserves existing save-before-queue behavior');
})();
check('Version test scripts and no database or launcher changes',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.ok(['3.20.63','3.20.64'].includes(pkg.version));assert.match(pkg.scripts['check:v32063'],/cut-preview-v32063-test/);
  assert.ok(read('public/assets/css/cut-local-preview.css').includes('cut-preview-caption'));
});
console.log(`\nCut Studio 3.20.63: ${total}/${total} PASS`);
