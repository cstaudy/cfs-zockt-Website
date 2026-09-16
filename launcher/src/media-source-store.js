"use strict";

const fs=require("node:fs");
const path=require("node:path");

function cleanText(value,max=240){
  return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
}
function cleanTrackId(value){
  return String(value??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,64);
}
function cleanAnalysis(value){
  const a=value&&typeof value==="object"?value:{};
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  return{
    available:a.available===true,
    peak_db:num(a.peak_db),
    mean_db:num(a.mean_db),
    duration_ms:num(a.duration_ms),
    waveform_path:cleanText(a.waveform_path,500,""),
    analyzed_at:cleanText(a.analyzed_at,80,"")
  };
}
function fileItem(projectId,{sourceName="",filePath="",analysis=null}={}){
  const id=cleanText(projectId,120);
  const full=path.resolve(String(filePath||""));
  if(!id)throw new Error("Cut-Projekt-ID fehlt.");
  if(!filePath||!fs.existsSync(full)||!fs.statSync(full).isFile())throw new Error("Lokale Datei wurde nicht gefunden.");
  return{
    projectId:id,
    sourceName:cleanText(sourceName||path.basename(full),240),
    filePath:full,
    fileName:path.basename(full),
    analysis:cleanAnalysis(analysis),
    updatedAt:new Date().toISOString()
  };
}
function trackItem(projectId,trackId,input={}){
  const item=fileItem(projectId,input),id=cleanTrackId(trackId);
  if(!id)throw new Error("Audio-Track-ID fehlt.");
  return{...item,trackId:id};
}
function snapshotItem(item){
  if(!item)return null;
  return{...item,analysis:cleanAnalysis(item.analysis),exists:Boolean(item.filePath&&fs.existsSync(item.filePath))};
}

class MediaSourceStore{
  constructor(filePath){
    this.filePath=filePath;
    fs.mkdirSync(path.dirname(filePath),{recursive:true});
    this.state=this.load();
  }
  empty(){return{schema:4,sources:{},music:{},voice:{},musicTracks:{},voiceTracks:{},sfx:{}}}
  load(){
    try{
      const raw=JSON.parse(fs.readFileSync(this.filePath,"utf8"));
      return{
        schema:4,
        sources:raw?.sources&&typeof raw.sources==="object"?raw.sources:{},
        music:raw?.music&&typeof raw.music==="object"?raw.music:{},
        voice:raw?.voice&&typeof raw.voice==="object"?raw.voice:{},
        musicTracks:raw?.musicTracks&&typeof raw.musicTracks==="object"?raw.musicTracks:{},
        voiceTracks:raw?.voiceTracks&&typeof raw.voiceTracks==="object"?raw.voiceTracks:{},
        sfx:raw?.sfx&&typeof raw.sfx==="object"?raw.sfx:{}
      };
    }catch{return this.empty()}
  }
  persist(){
    const tmp=this.filePath+".tmp";
    fs.writeFileSync(tmp,JSON.stringify(this.state,null,2),"utf8");
    fs.renameSync(tmp,this.filePath);
  }
  set(projectId,input={}){
    const item=fileItem(projectId,input);this.state.sources[item.projectId]=item;this.persist();return this.get(item.projectId);
  }
  get(projectId){return snapshotItem(this.state.sources[cleanText(projectId,120)]||null)}
  remove(projectId){delete this.state.sources[cleanText(projectId,120)];this.persist();return true}
  setMusic(projectId,input={}){
    const item=fileItem(projectId,input);this.state.music[item.projectId]=item;this.persist();return this.getMusic(item.projectId);
  }
  getMusic(projectId){return snapshotItem(this.state.music[cleanText(projectId,120)]||null)}
  removeMusic(projectId){delete this.state.music[cleanText(projectId,120)];this.persist();return true}
  setVoice(projectId,input={}){
    const item=fileItem(projectId,input);this.state.voice[item.projectId]=item;this.persist();return this.getVoice(item.projectId);
  }
  getVoice(projectId){return snapshotItem(this.state.voice[cleanText(projectId,120)]||null)}
  removeVoice(projectId){delete this.state.voice[cleanText(projectId,120)];this.persist();return true}
  setMusicTrack(projectId,trackId,input={}){return this._setTrack("musicTracks",projectId,trackId,input)}
  getMusicTrack(projectId,trackId){return this._getTrack("musicTracks",projectId,trackId)}
  removeMusicTrack(projectId,trackId){return this._removeTrack("musicTracks",projectId,trackId)}
  setVoiceTrack(projectId,trackId,input={}){return this._setTrack("voiceTracks",projectId,trackId,input)}
  getVoiceTrack(projectId,trackId){return this._getTrack("voiceTracks",projectId,trackId)}
  removeVoiceTrack(projectId,trackId){return this._removeTrack("voiceTracks",projectId,trackId)}
  setSfx(projectId,trackId,input={}){return this._setTrack("sfx",projectId,trackId,input)}
  getSfx(projectId,trackId){return this._getTrack("sfx",projectId,trackId)}
  removeSfx(projectId,trackId){return this._removeTrack("sfx",projectId,trackId)}
  _setTrack(bucket,projectId,trackId,input={}){
    const item=trackItem(projectId,trackId,input),pid=item.projectId;
    if(!this.state[bucket][pid]||typeof this.state[bucket][pid]!=="object")this.state[bucket][pid]={};
    this.state[bucket][pid][item.trackId]=item;this.persist();return this._getTrack(bucket,pid,item.trackId);
  }
  _getTrack(bucket,projectId,trackId){
    const pid=cleanText(projectId,120),tid=cleanTrackId(trackId);
    return snapshotItem(this.state[bucket][pid]?.[tid]||null);
  }
  _removeTrack(bucket,projectId,trackId){
    const pid=cleanText(projectId,120),tid=cleanTrackId(trackId);
    if(this.state[bucket][pid])delete this.state[bucket][pid][tid];
    if(this.state[bucket][pid]&&!Object.keys(this.state[bucket][pid]).length)delete this.state[bucket][pid];
    this.persist();return true;
  }
  snapshot(){
    const out={schema:4,sources:{},music:{},voice:{},musicTracks:{},voiceTracks:{},sfx:{}};
    for(const key of ["sources","music","voice"]){
      for(const [id,item] of Object.entries(this.state[key]||{}))out[key][id]=snapshotItem(item);
    }
    for(const key of ["musicTracks","voiceTracks","sfx"]){
      for(const [pid,tracks] of Object.entries(this.state[key]||{})){
        out[key][pid]={};
        for(const [tid,item] of Object.entries(tracks||{}))out[key][pid][tid]=snapshotItem(item);
      }
    }
    return out;
  }
}

module.exports={MediaSourceStore};
