"use strict";

const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

const TRACK_KEYS=new Set(["mix","mic","game","discord","music","alerts","audio1","audio2"]);
function text(value,max=240){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function safeId(value){return text(value,120).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120)}
function iso(value){const d=value?new Date(value):new Date();return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString()}
function durationMs(startedAt,stoppedAt,fallback=0){const a=new Date(startedAt||0).getTime(),b=new Date(stoppedAt||0).getTime();return Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.round(b-a):Math.max(0,Math.round(Number(fallback||0)))}
function sourceTracks(audioTracks=[]){
  const rows=(Array.isArray(audioTracks)?audioTracks:[]).slice(0,8).map((row,index)=>({
    key:TRACK_KEYS.has(String(row?.key||""))?String(row.key):safeId(row?.key)||`audio${index+1}`,
    label:text(row?.title,80)||`Audio ${index+1}`,
    stream_index:index,
    enabled:String(row?.key||"")!=="mix",
    gain_db:0,
    mute:false,
    solo:false,
    pan:0,
    analysis:{available:false,peak_db:null,mean_db:null,duration_ms:null,waveform_path:"",waveform:[],analyzed_at:null},
    preview:{preview_path:"",duration_ms:0,created_at:null}
  }));
  if(rows.length&&!rows.some(row=>row.enabled))rows[0].enabled=true;
  if(rows.length===1)rows[0].enabled=true;
  return rows;
}
function normalizeAnalysis(value={}){return{available:value?.available===true,peak_db:value?.peak_db===null||value?.peak_db===undefined?null:(Number.isFinite(Number(value.peak_db))?Number(value.peak_db):null),mean_db:value?.mean_db===null||value?.mean_db===undefined?null:(Number.isFinite(Number(value.mean_db))?Number(value.mean_db):null),duration_ms:value?.duration_ms===null||value?.duration_ms===undefined?null:(Number.isFinite(Number(value.duration_ms))?Math.max(0,Math.round(Number(value.duration_ms))):null),waveform_path:text(value?.waveform_path,1200),waveform:(Array.isArray(value?.waveform)?value.waveform:[]).slice(0,128).map(v=>Math.max(0,Math.min(1,Number(v)||0))),analyzed_at:value?.analyzed_at?iso(value.analyzed_at):null}}
function normalizePreview(value={}){return{preview_path:text(value?.preview_path,1200),duration_ms:Math.max(0,Math.round(Number(value?.duration_ms||0))),created_at:value?.created_at?iso(value.created_at):null}}
function normalizeTrack(row={},index=0){return{key:safeId(row?.key)||`audio${index+1}`,label:text(row?.label||row?.title,80)||`Audio ${index+1}`,stream_index:Math.max(0,Math.min(15,Math.round(Number(row?.stream_index??row?.streamIndex??index)))),enabled:row?.enabled!==false,gain_db:Math.max(-36,Math.min(12,Number(row?.gain_db||0))),mute:row?.mute===true,solo:row?.solo===true,pan:Math.max(-1,Math.min(1,Number(row?.pan||0))),analysis:normalizeAnalysis(row?.analysis),preview:normalizePreview(row?.preview)}}
function publicItem(item){
  if(!item)return null;
  const exists=Boolean(item.filePath&&fs.existsSync(item.filePath));
  const mixPreview=normalizePreview(item.mixPreview);mixPreview.exists=Boolean(mixPreview.preview_path&&fs.existsSync(mixPreview.preview_path));
  return {...item,exists,fileName:path.basename(item.filePath||item.fileName||""),filePath:item.filePath||"",mixPreview,tracks:(item.tracks||[]).map((row,index)=>{const track=normalizeTrack(row,index);track.analysis.waveform_exists=Boolean(track.analysis.waveform_path&&fs.existsSync(track.analysis.waveform_path));track.preview.exists=Boolean(track.preview.preview_path&&fs.existsSync(track.preview.preview_path));return track})};
}
class RecordingHandoffStore{
  constructor(filePath,{maxItems=30}={}){
    this.filePath=filePath;this.maxItems=Math.max(5,Math.min(100,Number(maxItems)||30));
    fs.mkdirSync(path.dirname(filePath),{recursive:true});this.state=this.load();
  }
  empty(){return{schema:2,pass:"21.10.26",items:[]}}
  load(){try{const raw=JSON.parse(fs.readFileSync(this.filePath,"utf8"));const items=(Array.isArray(raw?.items)?raw.items:[]).slice(0,this.maxItems).map(item=>({...item,tracks:(Array.isArray(item?.tracks)?item.tracks:[]).map(normalizeTrack),mixPreview:normalizePreview(item?.mixPreview)}));return{schema:2,pass:"21.10.26",items}}catch{return this.empty()}}
  persist(){const tmp=this.filePath+".tmp";fs.writeFileSync(tmp,JSON.stringify(this.state,null,2),"utf8");fs.renameSync(tmp,this.filePath)}
  create(input={}){
    const filePath=path.resolve(String(input.filePath||""));
    if(!filePath||!fs.existsSync(filePath)||!fs.statSync(filePath).isFile())throw new Error("Recording-Datei für Cut-Handoff wurde nicht gefunden.");
    const createdAt=iso(input.stoppedAt||Date.now()),seed=`${filePath}|${createdAt}|${fs.statSync(filePath).size}`;
    const id=`rec_${crypto.createHash("sha256").update(seed).digest("hex").slice(0,16)}`;
    const existing=this.state.items.find(row=>row.id===id);if(existing)return publicItem(existing);
    const item={
      id,createdAt,startedAt:iso(input.startedAt||createdAt),stoppedAt:createdAt,status:"pending",error:"",
      filePath,fileName:path.basename(filePath),bytes:Math.max(0,Number(fs.statSync(filePath).size||0)),
      durationMs:durationMs(input.startedAt,input.stoppedAt,input.durationMs),profile:text(input.profile,40),encoder:text(input.encoder,40),
      sceneId:text(input.sceneId,120),sceneName:text(input.sceneName,120),format:text(input.format,12)||"mkv",
      tracks:sourceTracks(input.audioTracks),mixPreview:normalizePreview(),projectId:"",projectTitle:"",linkedAt:null
    };
    this.state.items.unshift(item);this.state.items=this.state.items.slice(0,this.maxItems);this.persist();return publicItem(item);
  }
  setProject(id,{projectId="",projectTitle=""}={}){const row=this.state.items.find(item=>item.id===safeId(id));if(!row)throw new Error("Recording-Handoff wurde nicht gefunden.");row.status="linking";row.error="";row.projectId=text(projectId,120);row.projectTitle=text(projectTitle,120);this.persist();return publicItem(row)}
  markLinked(id,{projectId="",projectTitle=""}={}){const row=this.state.items.find(item=>item.id===safeId(id));if(!row)throw new Error("Recording-Handoff wurde nicht gefunden.");row.status="ready";row.error="";row.projectId=text(projectId||row.projectId,120);row.projectTitle=text(projectTitle||row.projectTitle,120);row.linkedAt=new Date().toISOString();this.persist();return publicItem(row)}
  markError(id,error){const row=this.state.items.find(item=>item.id===safeId(id));if(!row)return null;row.status="error";row.error=text(error?.message||error,500);this.persist();return publicItem(row)}
  setTrackAnalysis(id,trackKey,analysis={}){const row=this.state.items.find(item=>item.id===safeId(id));if(!row)throw new Error("Recording-Handoff wurde nicht gefunden.");const track=(row.tracks||[]).find(item=>item.key===safeId(trackKey));if(!track)throw new Error("Recording-Stem wurde nicht gefunden.");track.analysis=normalizeAnalysis(analysis);this.persist();return publicItem(row)}
  setTrackPreview(id,trackKey,preview={}){const row=this.state.items.find(item=>item.id===safeId(id));if(!row)throw new Error("Recording-Handoff wurde nicht gefunden.");const track=(row.tracks||[]).find(item=>item.key===safeId(trackKey));if(!track)throw new Error("Recording-Stem wurde nicht gefunden.");track.preview=normalizePreview(preview);this.persist();return publicItem(row)}
  setMixPreview(id,preview={}){const row=this.state.items.find(item=>item.id===safeId(id));if(!row)throw new Error("Recording-Handoff wurde nicht gefunden.");row.mixPreview=normalizePreview(preview);this.persist();return publicItem(row)}
  get(id){return publicItem(this.state.items.find(item=>item.id===safeId(id))||null)}
  remove(id){const before=this.state.items.length;this.state.items=this.state.items.filter(item=>item.id!==safeId(id));if(this.state.items.length!==before)this.persist();return before!==this.state.items.length}
  snapshot(){return{schema:2,pass:"21.10.26",maxItems:this.maxItems,pending:this.state.items.filter(x=>x.status!=="ready").length,ready:this.state.items.filter(x=>x.status==="ready").length,items:this.state.items.map(publicItem)}}
}
module.exports={RecordingHandoffStore,sourceTracks,durationMs,normalizeAnalysis,normalizePreview};
