"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const MODES=new Set(["active","recent","none"]), PLATFORMS=new Set(["playstation_5","playstation_4","pc","xbox_series","xbox_one","switch","unknown"]), SOURCES=new Set(["launcher_manual","stream_capture",""]);
function text(v,max=120){return String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function iso(v){const d=v?new Date(v):new Date();return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString()}
function normalize(input={}){const game=text(input.game_name||input.title,120);const mode=game&&MODES.has(String(input.mode||""))?String(input.mode):"none";return{mode,game_name:game,normalized_title:text(input.normalized_title||game.toLowerCase(),120),game_id:text(input.game_id,120),platform:PLATFORMS.has(String(input.platform||""))?String(input.platform):"unknown",source:SOURCES.has(String(input.source||""))?String(input.source):"",started_at:input.started_at?iso(input.started_at):null,last_played_at:input.last_played_at?iso(input.last_played_at):null,presence_id:/^cfsgp_[a-f0-9]{32}$/.test(String(input.presence_id||""))?String(input.presence_id):"",resumed_after_restart:input.resumed_after_restart===true,captured_at:iso(input.captured_at)}}
function idFor(ctx,started){return `cfsgc_${crypto.createHash("sha256").update(JSON.stringify(ctx)+"|"+started).digest("hex").slice(0,32)}`}
function atomic(filePath,value){fs.mkdirSync(path.dirname(filePath),{recursive:true});const tmp=`${filePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2),"utf8");fs.renameSync(tmp,filePath)}
class StreamGameContextStore{
  constructor(filePath,{maxSessions=30}={}){this.filePath=filePath;this.maxSessions=Math.max(5,Math.min(100,Number(maxSessions)||30));this.state=this.load();if(this.state.active){const now=iso();this.state.sessions.unshift({...this.state.active,stopped_at:now,stop_reason:"launcher_restart",interrupted:true});this.state.active=null;this.persist()}}
  empty(){return{schema:1,pass:"v140-stream-game-context",active:null,sessions:[],derived_game_time:false}}
  load(){try{const raw=JSON.parse(fs.readFileSync(this.filePath,"utf8"));return{schema:1,pass:"v140-stream-game-context",active:raw?.active||null,sessions:Array.isArray(raw?.sessions)?raw.sessions.slice(0,this.maxSessions):[],derived_game_time:false}}catch{return this.empty()}}
  persist(){this.state.sessions=this.state.sessions.slice(0,this.maxSessions);atomic(this.filePath,this.state)}
  start(context={},meta={}){const ctx=normalize(context);const started=iso();if(this.state.active)this.stop("stream_restarted");this.state.active={context_id:idFor(ctx,started),...ctx,scene_name:text(meta.scene_name,120),stream_started_at:started,observed_at:started};this.persist();return this.snapshot()}
  observe(context={}){if(!this.state.active)return this.snapshot();const ctx=normalize(context);this.state.active={...this.state.active,...ctx,context_id:this.state.active.context_id,stream_started_at:this.state.active.stream_started_at,observed_at:iso()};this.persist();return this.snapshot()}
  stop(reason="stream_stop"){if(!this.state.active)return this.snapshot();const ended=iso();this.state.sessions.unshift({...this.state.active,stopped_at:ended,stop_reason:text(reason,80),interrupted:false});this.state.active=null;this.persist();return this.snapshot()}
  snapshot(){return{schema:1,pass:"v140-stream-game-context",active:this.state.active?{...this.state.active}:null,sessions:this.state.sessions.slice(0,this.maxSessions).map(x=>({...x})),derived_game_time:false,secrets_exposed:false}}
}
module.exports={StreamGameContextStore,normalizeStreamGameContext:normalize};
