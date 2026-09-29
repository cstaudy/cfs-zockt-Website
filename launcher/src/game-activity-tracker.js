"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

const ALLOWED_SOURCES=new Set(["launcher_manual","stream_capture"]);
const ALLOWED_PLATFORMS=new Set(["playstation_5","playstation_4","pc","xbox_series","xbox_one","switch","unknown"]);
const CHECKPOINT_MS=15*60*1000;
const GAP_MS=90*1000;
const LOOP_MS=15*1000;
const MIN_EVENT_MS=30*1000;
const MAX_EVENT_MS=12*60*60*1000;
function nowIso(ms=Date.now()){return new Date(ms).toISOString()}
function text(v,max=80){return String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function eventId(){return `cfsga_${crypto.randomBytes(16).toString("hex")}`}
function presenceId(){return `cfsgp_${crypto.randomBytes(16).toString("hex")}`}
function atomic(filePath,value){fs.mkdirSync(path.dirname(filePath),{recursive:true});const tmp=`${filePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2),"utf8");fs.renameSync(tmp,filePath)}
function normalizeTarget(input={}){
  const source=ALLOWED_SOURCES.has(String(input.source||""))?String(input.source):"launcher_manual";
  const gameName=text(input.gameName||input.game_name,80);
  const platform=source==="stream_capture"?"pc":(ALLOWED_PLATFORMS.has(String(input.platform||""))?String(input.platform):"unknown");
  const enabled=input.enabled===true;
  const targetError=enabled&&!gameName?"Spielname fehlt.":enabled&&source==="launcher_manual"&&platform==="unknown"?"Für manuelle Erfassung muss eine Plattform gewählt werden.":"";
  return {enabled,source,game_name:gameName,platform,target_error:targetError};
}
function sameTarget(a,b){return !!a&&!!b&&a.game_name===b.game_name&&a.source===b.source&&a.platform===b.platform}

class GameActivityTracker{
  constructor({filePath,logger=null,submitter=null}={}){
    if(!filePath)throw new Error("GameActivityTracker benötigt filePath.");
    this.filePath=filePath;this.logger=logger;this.submitter=submitter;this.timer=null;this.flushing=false;
    this.state=this.load();this.recoverInterrupted();
  }
  empty(){return{schema:2,target:normalizeTarget({}),active:null,pending:[],presence_transition_id:presenceId(),presence_changed_at:nowIso(),last_error:"",retry_count:0,next_retry_at:null,last_submit_at:null}}
  load(){try{const raw=JSON.parse(fs.readFileSync(this.filePath,"utf8"));return{...this.empty(),...raw,pending:Array.isArray(raw?.pending)?raw.pending.slice(0,500):[]}}catch{return this.empty()}}
  persist(){atomic(this.filePath,this.state)}
  queueSegment(active,endedMs,reason="checkpoint"){
    if(!active)return false;const started=Date.parse(active.started_at),ended=Math.min(endedMs,started+MAX_EVENT_MS);if(!Number.isFinite(started)||!Number.isFinite(ended)||ended-started<MIN_EVENT_MS)return false;
    this.state.pending.push({client_event_id:eventId(),game_name:active.game_name,started_at:nowIso(started),ended_at:nowIso(ended),duration_seconds:Math.max(30,Math.round((ended-started)/1000)),source:active.source,platform:active.platform,reason:text(reason,60)});
    this.state.pending=this.state.pending.slice(-500);return true;
  }
  recoverInterrupted(){
    const active=this.state.active;if(!active)return;
    const last=Date.parse(active.last_seen_at||active.started_at),start=Date.parse(active.started_at);
    if(Number.isFinite(last)&&Number.isFinite(start))this.queueSegment(active,last,"launcher_restart");
    this.state.active=null;this.state.recovered_target={enabled:true,source:active.source,game_name:active.game_name,platform:active.platform};this.state.presence_transition_id=presenceId();this.state.presence_changed_at=nowIso();this.persist();
  }
  begin(target,{resumed=false,at=Date.now()}={}){
    this.state.active={game_name:target.game_name,source:target.source,platform:target.platform,started_at:nowIso(at),last_seen_at:nowIso(at),last_checkpoint_at:nowIso(at),resumed_after_restart:resumed===true};
    this.state.presence_transition_id=presenceId();this.state.presence_changed_at=nowIso(at);this.state.last_error="";
  }
  end(reason="disabled",at=Date.now()){
    const active=this.state.active;if(active)this.queueSegment(active,Math.min(at,Date.parse(active.last_seen_at||nowIso(at))),reason);
    this.state.active=null;this.state.presence_transition_id=presenceId();this.state.presence_changed_at=nowIso(at);this.persist();
  }
  configure(input={}){
    const target=normalizeTarget(input);const old=this.state.target||normalizeTarget({});this.state.target=target;
    if(target.target_error||!target.enabled){if(this.state.active)this.end(target.target_error?"invalid_target":"disabled");else this.persist();return this.snapshot()}
    if(this.state.active&&!sameTarget(this.state.active,target))this.end("game_changed");
    if(!this.state.active){const resumed=sameTarget(this.state.recovered_target,target);this.begin(target,{resumed});delete this.state.recovered_target;this.persist()}
    else if(!sameTarget(old,target)){this.state.presence_transition_id=presenceId();this.state.presence_changed_at=nowIso();this.persist()}
    return this.snapshot();
  }
  tick(){
    const active=this.state.active;if(!active)return this.snapshot();const now=Date.now();const last=Date.parse(active.last_seen_at||active.started_at);const start=Date.parse(active.started_at);
    if(Number.isFinite(last)&&now-last>GAP_MS){this.queueSegment(active,last,"scheduler_gap");const target=this.state.target;this.state.active=null;this.state.presence_transition_id=presenceId();this.state.presence_changed_at=nowIso(last);if(target?.enabled&&!target.target_error)this.begin(target,{resumed:true,at:now});this.persist();this.flush().catch(()=>{});return this.snapshot()}
    active.last_seen_at=nowIso(now);
    if(Number.isFinite(start)&&now-start>=CHECKPOINT_MS){const checkpoint=Math.min(now,start+CHECKPOINT_MS);if(this.queueSegment(active,checkpoint,"checkpoint")){active.started_at=nowIso(checkpoint);active.last_checkpoint_at=nowIso(checkpoint);active.resumed_after_restart=false}}
    this.persist();this.flush().catch(()=>{});return this.snapshot();
  }
  startLoop(){if(this.timer)return;this.timer=setInterval(()=>{try{this.tick()}catch(e){this.logger?.warn?.("Game activity tick failed",e?.message)}},LOOP_MS);this.timer.unref?.()}
  async flush({force=false}={}){
    if(this.flushing||!this.submitter)return this.snapshot();const nextAt=Date.parse(this.state.next_retry_at||"");if(!force&&Number.isFinite(nextAt)&&Date.now()<nextAt)return this.snapshot();this.flushing=true;
    try{
      while(this.state.pending.length){const item=this.state.pending[0];try{await this.submitter({...item});this.state.pending.shift();this.state.last_error="";this.state.retry_count=0;this.state.next_retry_at=null;this.state.last_submit_at=nowIso();this.persist()}catch(error){this.state.last_error=text(error?.message||error,300);this.state.retry_count=Math.min(12,Number(this.state.retry_count||0)+1);const delay=Math.min(5*60*1000,Math.max(2000,2000*2**(this.state.retry_count-1)));this.state.next_retry_at=nowIso(Date.now()+delay);this.persist();break}}
    }finally{this.flushing=false}return this.snapshot();
  }
  clearHistory({resume=true}={}){
    const target=this.state.target||normalizeTarget({});
    this.state.active=null;this.state.pending=[];this.state.last_error="";this.state.retry_count=0;this.state.next_retry_at=null;this.state.last_submit_at=null;this.state.recovered_target=null;this.state.presence_transition_id=presenceId();this.state.presence_changed_at=nowIso();
    if(resume&&target.enabled&&!target.target_error)this.begin(target,{resumed:false});
    this.persist();return this.snapshot();
  }
  stop(reason="manual_stop"){if(this.timer){clearInterval(this.timer);this.timer=null}if(reason==="privacy_clear")return this.clearHistory({resume:false});this.end(reason);return this.snapshot()}
  async shutdown(reason="app_quit"){if(this.timer){clearInterval(this.timer);this.timer=null}this.end(reason);await this.flush({force:true});return this.snapshot()}
  snapshot(){const active=this.state.active?{...this.state.active,elapsed_seconds:Math.max(0,Math.floor((Date.now()-Date.parse(this.state.active.started_at))/1000))}:null;const lastSeen=active?Date.parse(active.last_seen_at||""):NaN;return{schema:2,enabled:this.state.target?.enabled===true,target:{...(this.state.target||normalizeTarget({}))},target_error:String(this.state.target?.target_error||""),active,pending:this.state.pending.length,last_error:String(this.state.last_error||""),retry_count:Number(this.state.retry_count||0),next_retry_at:this.state.next_retry_at||null,last_submit_at:this.state.last_submit_at||null,last_seen_age_seconds:Number.isFinite(lastSeen)?Math.max(0,Math.round((Date.now()-lastSeen)/1000)):null,presence_transition_id:this.state.presence_transition_id,presence_changed_at:this.state.presence_changed_at,raw_paths_exposed:false,secrets_exposed:false}}
}
module.exports={GameActivityTracker,normalizeGameActivityTarget:normalizeTarget};
