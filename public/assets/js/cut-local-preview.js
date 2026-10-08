(()=>{
'use strict';
const core=window.CFSCutPreviewCore,$=id=>document.getElementById(id),video=$('cutLocalVideo');
if(!core||!video)return;
const list=$('cutClipList'),select=$('cutPreviewClip'),sources={video:{url:'',name:''},music:{url:'',name:''},voice:{url:'',name:''}};
const tracks={music:new Audio(),voice:new Audio()};
for(const audio of Object.values(tracks))audio.preload='metadata';
let project='',range=null,changingVideo=false,playSerial=0;
const rows=()=>Array.from(list.querySelectorAll('[data-clip]'));
const row=()=>rows().find(x=>x.dataset.clip===select.value);
const field=(r,key)=>r?.querySelector(`[data-field="${key}"]`)?.value??'';
const get=(id)=>$(id)?.value??'';
const say=(message)=>{$('cutPreviewStatus').textContent=message};
const audioInfo=()=>{$('cutPreviewAudioStatus').textContent=`Musik: ${sources.music.name||'nicht geladen'} · Voiceover: ${sources.voice.name||'nicht geladen'}. Lokale Hörprobe, kein finaler Audiomix.`};
function stopTracks(){for(const audio of Object.values(tracks))audio.pause()}
function clearSource(kind){
  if(kind==='video'){video.pause();stopTracks();video.removeAttribute('src');video.load();range=null;video.muted=false;}
  else{const audio=tracks[kind];audio.pause();audio.removeAttribute('src');audio.load();}
  if(sources[kind].url)URL.revokeObjectURL(sources[kind].url);
  sources[kind]={url:'',name:''};
  if(kind==='video'){$('cutPreviewFile').value='';$('cutPreviewSeek').value=0;$('cutPreviewSeek').max=0;$('cutPreviewTime').textContent='0.00 s';say('Wähle eine lokale Videodatei für die Schnittvorschau.');}
  else $(kind==='music'?'cutPreviewMusicFile':'cutPreviewVoiceFile').value='';
  audioInfo();updateCaption();
}
function clearAll(){clearSource('video');clearSource('music');clearSource('voice');renderAudit(null)}
function loadSource(kind,file){
  if(!file)return;
  try{core.checkFile(file,kind==='video'?'video':'audio')}catch(e){say(e.message);return}
  clearSource(kind);
  const url=URL.createObjectURL(file);sources[kind]={url,name:file.name};
  if(kind==='video'){
    video.src=url;
    const source=$('cutSourceName');if(source){source.value=file.name;source.dispatchEvent(new Event('input',{bubbles:true}));}
    say('Videodatei wird lokal geöffnet …');
  }else{
    tracks[kind].src=url;
    const name=$(kind==='music'?'cutMusicName':'cutVoiceName');if(name&&!name.value.trim()){name.value=file.name;name.dispatchEvent(new Event('input',{bubbles:true}));}
    say(`${kind==='music'?'Musik':'Voiceover'} lokal geladen. Für die Hörprobe einen Clip starten.`);
  }
  audioInfo();renderAudit(null);
}
function options(){
  const old=select.value;select.replaceChildren();
  for(const r of rows()){const option=document.createElement('option');option.value=r.dataset.clip;option.textContent=field(r,'label')||'Clip';select.append(option)}
  if(rows().some(r=>r.dataset.clip===old))select.value=old;
  updateCaption();
}
function getClip(){
  const r=row();if(!r)throw Error('Wähle zuerst einen vorhandenen Clip.');
  const bounds=core.clipBounds({start:field(r,'in_s'),end:field(r,'out_s')},video.readyState?video.duration:NaN);
  return{row:r,...bounds};
}
function updateCaption(){
  const r=row(),caption=$('cutPreviewCaption');
  if(!r||field(r,'caption_enabled')!=='true'||!String(field(r,'caption')).trim()){caption.hidden=true;caption.textContent='';return}
  const start=Number(field(r,'in_s')),end=Number(field(r,'out_s'));
  const active=video.readyState&&video.currentTime>=start&&video.currentTime<end;
  caption.textContent=String(field(r,'caption')).slice(0,500);
  caption.hidden=!active;
  caption.dataset.position=field(r,'caption_position')==='top'?'top':'bottom';
  caption.dataset.style=['box','outline','minimal'].includes(field(r,'caption_style'))?field(r,'caption_style'):'box';
}
function syncTracks(force=false){
  updateCaption();
  const r=row();let clip;try{clip=getClip()}catch{stopTracks();return}
  const within=video.currentTime>=clip.start&&video.currentTime<clip.end&&video.readyState>0;
  const solo={source:get('cutSourceSolo')==='true',music:get('cutMusicSolo')==='true',voice:get('cutVoiceSolo')==='true'};
  const anySolo=Object.values(solo).some(Boolean);
  video.muted=get('cutSourceMute')==='true'||(anySolo&&!solo.source);
  video.volume=core.gainVolume(get('cutSourceGain'));
  for(const kind of ['music','voice']){
    const audio=tracks[kind];
    const active=get(kind==='music'?'cutMusicEnabled':'cutVoiceEnabled')==='true';
    const mute=get(kind==='music'?'cutMusicMute':'cutVoiceMute')==='true';
    const gain=get(kind==='music'?'cutMusicGain':'cutVoiceGain');
    const start=Math.max(0,Number(get(kind==='music'?'cutMusicStart':'cutVoiceStart'))||0);
    const loop=kind==='music'&&get('cutMusicLoop')==='true';
    const position=core.trackPosition(video.currentTime,clip.start,start,audio.duration,loop);
    audio.loop=loop;audio.volume=core.gainVolume(gain);
    if(!within||!active||mute||(anySolo&&!solo[kind])||!sources[kind].url||position===null||video.paused||video.ended){audio.pause();continue}
    if(force||audio.paused||Math.abs(audio.currentTime-position)>.22){try{audio.currentTime=position}catch{}}
    audio.playbackRate=video.playbackRate;
    if(audio.paused){audio.play().catch(()=>say('Zusatzton wurde vom Browser blockiert. Starte die Vorschau über „Ausschnitt abspielen“.'))}
  }
}
function renderAudit(audit){
  const box=$('cutExportCheckResult');box.replaceChildren();
  if(!audit){box.textContent='Noch keine Prüfung gestartet. Der Export-Check prüft den Plan, ersetzt aber keinen fertigen Medien-Export.';return}
  const title=document.createElement('strong');title.textContent=audit.ok?`Exportplan geprüft · ${audit.selectedCount} Clip(s)`:`Exportplan: ${audit.errors.length} Fehler`;
  box.append(title);
  for(const [type,entries]of [['error',audit.errors],['warning',audit.warnings]])for(const message of entries){const item=document.createElement('p');item.dataset.level=type;item.textContent=(type==='error'?'Fehler: ':'Hinweis: ')+message;box.append(item)}
  box.dataset.valid=String(audit.ok);
}
function audit(){
  const clips=rows().map(r=>({label:field(r,'label'),start:field(r,'in_s'),end:field(r,'out_s'),selected:field(r,'selected')!=='false',caption_enabled:field(r,'caption_enabled')==='true',caption:field(r,'caption')}));
  return core.auditExport({clips,sourceName:get('cutSourceName'),localVideoName:sources.video.name,localDuration:video.readyState?video.duration:null,mode:get('cutExportMode'),musicEnabled:get('cutMusicEnabled')==='true',musicName:get('cutMusicName'),localMusicName:sources.music.name,voiceEnabled:get('cutVoiceEnabled')==='true',voiceName:get('cutVoiceName'),localVoiceName:sources.voice.name});
}
function preflightExport(){const result=audit();renderAudit(result);if(!result.ok)throw Error('Exportplan fehlerhaft. Siehe Export-Check.');return result}
video.addEventListener('loadedmetadata',()=>{
  if(!Number.isFinite(video.duration)||video.duration<=0){say('Videolänge konnte nicht erkannt werden.');return}
  $('cutPreviewSeek').max=String(video.duration);
  say(`${sources.video.name} · ${video.videoWidth} × ${video.videoHeight} · ${video.duration.toFixed(1)} Sekunden. Datei bleibt auf deinem Gerät.`);
});
video.addEventListener('error',()=>{range=null;stopTracks();say('Video kann nicht abgespielt werden. Versuche MP4 H.264/AAC oder den Launcher.')});
video.addEventListener('timeupdate',()=>{
  $('cutPreviewSeek').value=String(video.currentTime);$('cutPreviewTime').textContent=video.currentTime.toFixed(2)+' s';
  if(range&&video.currentTime>=range.end-.02){const end=range.end;range=null;video.pause();video.currentTime=end;stopTracks();say('Clip-Ende erreicht.');}
  else syncTracks();
});
video.addEventListener('seeking',()=>syncTracks(true));video.addEventListener('seeked',()=>syncTracks(true));
video.addEventListener('play',()=>syncTracks(true));video.addEventListener('pause',stopTracks);
video.addEventListener('ended',stopTracks);video.addEventListener('ratechange',()=>syncTracks(true));
$('cutPreviewSeek').oninput=()=>{range=null;if(video.readyState)video.currentTime=Number($('cutPreviewSeek').value)};
$('cutPreviewFile').onchange=()=>loadSource('video',$('cutPreviewFile').files?.[0]);
$('cutPreviewMusicFile').onchange=()=>loadSource('music',$('cutPreviewMusicFile').files?.[0]);
$('cutPreviewVoiceFile').onchange=()=>loadSource('voice',$('cutPreviewVoiceFile').files?.[0]);
$('cutPreviewChoose').onclick=()=>$('cutPreviewFile').click();
$('cutPreviewClear').onclick=clearAll;
$('cutPreviewClearMusic').onclick=()=>clearSource('music');
$('cutPreviewClearVoice').onclick=()=>clearSource('voice');
const drop=$('cutPreviewDrop');
drop.ondragover=e=>{if(Array.from(e.dataTransfer.types).includes('Files')){e.preventDefault();drop.classList.add('drag')}};
drop.ondragleave=()=>drop.classList.remove('drag');
drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');if(e.dataTransfer.files.length!==1){say('Bitte genau eine Videodatei ablegen.');return}loadSource('video',e.dataTransfer.files[0])};
for(const [id,key]of [['cutPreviewIn','in_s'],['cutPreviewOut','out_s']])$(id).onclick=()=>{
  const r=row();if(!r||!video.readyState){say('Wähle zuerst ein Video und einen Clip.');return}
  const input=r.querySelector(`[data-field="${key}"]`);input.value=(Math.floor(video.currentTime*1000)/1000).toFixed(3);
  input.dispatchEvent(new Event('input',{bubbles:true}));say('Schnittpunkt übernommen; zum Export müssen die Änderungen gespeichert werden.');updateCaption();
};
$('cutPreviewPlay').onclick=async()=>{
  if(!video.readyState){say('Wähle zuerst eine abspielbare Videodatei.');return}
  let clip;try{clip=getClip()}catch(e){say(e.message);return}
  video.pause();stopTracks();range={end:clip.end};video.currentTime=clip.start;
  const serial=++playSerial;
  try{await video.play();if(serial===playSerial)syncTracks(true)}catch{stopTracks();say('Wiedergabe konnte nicht gestartet werden.')}
};
select.onchange=()=>{playSerial++;range=null;video.pause();stopTracks();updateCaption()};
list.addEventListener('input',()=>{updateCaption();renderAudit(null)});
list.addEventListener('change',()=>{updateCaption();renderAudit(null)});
new MutationObserver(options).observe(list,{childList:true});options();
$('cutCheckExport').onclick=()=>renderAudit(audit());
for(const id of ['cutSourceName','cutExportMode','cutMusicEnabled','cutMusicName','cutVoiceEnabled','cutVoiceName'])$(id)?.addEventListener('input',()=>renderAudit(null));
window.CFSCutPreview={validateClips(){for(const r of rows()){
  if(field(r,'selected')==='false')continue;
  const named=field(r,'label')||'Clip';
  try{core.clipBounds({start:field(r,'in_s'),end:field(r,'out_s')},sources.video.name&&core.fileName(get('cutSourceName'))===core.fileName(sources.video.name)&&video.readyState?video.duration:NaN)}
  catch(e){throw Error(`${named}: ${e.message}`)}
}},preflightExport,audit};
document.addEventListener('cfs:cut-project-open',e=>{if(project&&project!==e.detail.id)clearAll();project=e.detail.id;range=null;stopTracks();renderAudit(null)});
window.addEventListener('pagehide',()=>{stopTracks();for(const item of Object.values(sources))if(item.url)URL.revokeObjectURL(item.url)});
audioInfo();renderAudit(null);
})();
