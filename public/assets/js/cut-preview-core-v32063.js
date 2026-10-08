(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CFSCutPreviewCore=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const MAX_VIDEO_BYTES=2*1024*1024*1024;
  const MAX_AUDIO_BYTES=100*1024*1024;
  const finite=(v)=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
  const seconds=(v)=>finite(v)?Number(v):NaN;
  const fileName=(s)=>String(s||'').replace(/\\/g,'/').split('/').pop().trim().toLowerCase();
  function checkFile(file,kind){
    if(!file||!Number.isFinite(file.size)||file.size<=0)throw Error('Die gewählte Datei ist leer.');
    const audio=kind==='audio',max=audio?MAX_AUDIO_BYTES:MAX_VIDEO_BYTES;
    if(file.size>max)throw Error(audio?'Audiodatei zu groß (max. 100 MB).':'Videodatei zu groß (max. 2 GB).');
    const extension=audio?/\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i:/\.(mp4|webm|mov|m4v|mkv)$/i;
    const mime=String(file.type||'').toLowerCase();
    if(!extension.test(String(file.name||''))||(mime&&!mime.startsWith(audio?'audio/':'video/')&&!(audio&&mime==='application/ogg')&&!(audio&&mime==='application/octet-stream')&&!(mime==='application/octet-stream')))
      throw Error(audio?'Bitte eine unterstützte Audiodatei wählen.':'Bitte eine unterstützte Videodatei wählen.');
    return true;
  }
  function clipBounds(clip,duration){
    const start=seconds(clip.start??clip.in_s),end=seconds(clip.end??clip.out_s);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start<.05)throw Error('Start und Ende müssen gültig und mindestens 0,05 Sekunden auseinander sein.');
    if(Number.isFinite(duration)&&duration>0&&end>duration+.05)throw Error('Schnittende liegt außerhalb der gewählten Videodatei.');
    return{start,end};
  }
  function trackPosition(videoTime,clipStart,trackStart,audioDuration,loop){
    const t=seconds(videoTime)-seconds(clipStart)-seconds(trackStart);
    if(!Number.isFinite(t)||t<0||!Number.isFinite(audioDuration)||audioDuration<=0)return null;
    if(!loop&&t>=audioDuration)return null;
    return loop?t%audioDuration:t;
  }
  function gainVolume(db){const n=seconds(db);return Number.isFinite(n)?Math.max(0,Math.min(1,Math.pow(10,Math.max(-60,Math.min(12,n))/20))):1}
  function auditExport({clips=[],sourceName='',localVideoName='',localDuration=null,mode='clips',musicEnabled=false,musicName='',voiceEnabled=false,voiceName='',localMusicName='',localVoiceName=''}={}){
    const errors=[],warnings=[],selected=clips.filter(c=>c.selected!==false&&c.selected!=='false');
    if(!String(sourceName).trim())errors.push('Name der Quellvideodatei fehlt.');
    if(!selected.length)errors.push('Mindestens einen Clip für den Export markieren.');
    if(!['clips','reel','both'].includes(mode))errors.push('Exportmodus ist ungültig.');
    const sameSource=Boolean(localVideoName)&&fileName(sourceName)===fileName(localVideoName);
    if(localVideoName&&!sameSource)warnings.push('Die lokale Vorschau-Datei hat einen anderen Namen als die Export-Quelle: Im Launcher die richtige Datei zuordnen.');
    if(!localVideoName)warnings.push('Noch keine lokale Videodatei zur Sichtprüfung geladen. Der Launcher benötigt die Quelldatei.');
    selected.forEach((clip,i)=>{
      try{clipBounds(clip,sameSource?Number(localDuration):NaN)}
      catch(e){errors.push(`${String(clip.label||`Clip ${i+1}`).slice(0,60)}: ${e.message}`)}
      if(clip.caption_enabled===true&&String(clip.caption||'').trim()==='')warnings.push(`${String(clip.label||`Clip ${i+1}`).slice(0,60)}: Caption aktiviert, aber kein Text eingegeben.`);
    });
    if(musicEnabled){if(!String(musicName||'').trim())errors.push('Musik aktiviert, aber kein Musik-Dateiname festgelegt.');else if(!localMusicName)warnings.push('Musik im Browser nicht vorgehört; im Launcher zuordnen.');else if(fileName(musicName)!==fileName(localMusicName))warnings.push('Musikdatei in Vorschau und Exportplan unterscheiden sich.');}
    if(voiceEnabled){if(!String(voiceName||'').trim())errors.push('Voiceover aktiviert, aber kein Voice-Dateiname festgelegt.');else if(!localVoiceName)warnings.push('Voiceover im Browser nicht vorgehört; im Launcher zuordnen.');else if(fileName(voiceName)!==fileName(localVoiceName))warnings.push('Voiceover-Datei in Vorschau und Exportplan unterscheiden sich.');}
    warnings.push('Vorschau ist ein Einzelclip-Check. Übergänge, mehrere Tracks, SFX, Ducking, Panorama, Keyframes und finale Audio-Normalisierung werden erst im Launcher gerendert.');
    return{ok:errors.length===0,errors,warnings,selectedCount:selected.length,previewMatchesSource:sameSource};
  }
  return{MAX_VIDEO_BYTES,MAX_AUDIO_BYTES,checkFile,clipBounds,trackPosition,gainVolume,auditExport,fileName};
});
