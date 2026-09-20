(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CFSCutAuditionAudioTransport=api.CutAuditionWebAudioTransport;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
  "use strict";

  function clamp(value,min,max,fallback=0){
    const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
  }
  function segmentShape(input={}){
    const start=Math.max(0,Math.round(Number(input.cacheStartMs||0))),duration=Math.max(0,Math.round(Number(input.cacheDurationMs||input.durationMs||0)));
    return{cacheStartMs:start,cacheDurationMs:duration,playOffsetMs:Math.max(0,Math.round(Number(input.playOffsetMs||0))),durationMs:Math.max(0,Math.round(Number(input.durationMs||duration))),cacheHit:input.cacheHit===true};
  }
  function loopShape({loopEnabled=false,loopStartMs=0,loopEndMs=0,loopCrossfadeMs=0,startMs=0,endMs=0}={}){
    const start=Math.max(0,Math.round(Number(startMs)||0)),end=Math.max(start+1,Math.round(Number(endMs)||0));
    const a=clamp(Math.round(Number(loopStartMs)||start),start,end,start),b=clamp(Math.round(Number(loopEndMs)||end),start,end,end),lo=Math.min(a,b),hi=Math.max(a,b);
    const enabled=loopEnabled===true&&hi-lo>=500,length=enabled?hi-lo:0,requested=Math.max(0,Math.min(50,Math.round(Number(loopCrossfadeMs)||0))),crossfade=enabled?Math.min(requested,Math.floor(length/4)):0;
    return{loopEnabled:enabled,loopStartMs:enabled?lo:start,loopEndMs:enabled?hi:end,loopLengthMs:length,loopCrossfadeMs:crossfade};
  }
  function wrapLoopPosition(value,start,end){
    const a=Math.max(0,Number(start)||0),b=Math.max(a,Number(end)||a),length=b-a;if(length<=0)return a;
    const rel=((Number(value??a)-a)%length+length)%length;return a+rel;
  }

  class CutAuditionWebAudioTransport{
    constructor({AudioContextCtor=null,loadSegmentBytes=null,leadSeconds=.08,maxDecodedSegments=5,maxQueuedSources=12,onState=null,onNeedPrefetch=null,onEnded=null,onError=null}={}){
      this.AudioContextCtor=AudioContextCtor||globalThis.AudioContext||globalThis.webkitAudioContext||null;
      this.loadSegmentBytes=loadSegmentBytes;
      this.leadSeconds=clamp(leadSeconds,.02,.5,.08);
      this.maxDecodedSegments=Math.max(2,Math.min(12,Math.round(Number(maxDecodedSegments)||5)));
      this.maxQueuedSources=Math.max(4,Math.min(32,Math.round(Number(maxQueuedSources)||12)));
      this.onState=onState;this.onNeedPrefetch=onNeedPrefetch;this.onEnded=onEnded;this.onError=onError;
      this.context=null;this.destination=null;this.session=null;this.segments=new Map();this.sources=[];this.generation=0;
      this.anchorContextTime=0;this.anchorTimelineMs=0;this.pausedTimelineMs=0;this.scheduledThroughMs=0;this.scheduling=false;
      this.scheduleCursorMs=0;this.scheduleCursorContextTime=0;this.scheduleFadeInMs=0;
      this.stats={decoded:0,decodeHits:0,scheduled:0,gaplessTransitions:0,loopTransitions:0,loopCrossfades:0,loopCrossfadeFallbacks:0,lateTransitions:0,stops:0};
    }
    snapshot(){
      return{active:Boolean(this.session),paused:Boolean(this.session?.paused),sessionId:String(this.session?.id||""),projectId:String(this.session?.projectId||""),positionMs:Math.round(this.positionMs()),scheduledThroughMs:Math.round(this.scheduledThroughMs||0),loopEnabled:this.session?.loopEnabled===true,loopStartMs:Number(this.session?.loopStartMs||0),loopEndMs:Number(this.session?.loopEndMs||0),loopLengthMs:Number(this.session?.loopLengthMs||0),loopCrossfadeMs:Number(this.session?.loopCrossfadeMs||0),decodedSegments:[...this.segments.values()].filter(row=>row.buffer).length,queuedSources:this.sources.filter(row=>!row.ended).length,stats:{...this.stats}};
    }
    emit(){try{this.onState?.(this.snapshot())}catch{}return this.snapshot()}
    async ensureContext(){
      if(!this.AudioContextCtor)throw new Error("WebAudio AudioContext ist nicht verfügbar.");
      if(!this.context){this.context=new this.AudioContextCtor({latencyHint:"interactive",sampleRate:48000});this.destination=this.context.destination}
      if(this.context.state==="suspended")await this.context.resume();return this.context;
    }
    async decodeSegment(row){
      if(row.buffer){this.stats.decodeHits++;return row.buffer}
      if(row.decodePromise)return row.decodePromise;
      if(typeof this.loadSegmentBytes!=="function")throw new Error("Lokaler Audition-Segment-Loader fehlt.");
      row.decodePromise=(async()=>{
        const raw=await this.loadSegmentBytes({sessionId:String(this.session?.id||""),cacheStartMs:row.cacheStartMs});
        const bytes=raw instanceof Uint8Array?raw:new Uint8Array(raw?.data||raw||[]);if(bytes.byteLength<44)throw new Error("Lokales Audition-Segment ist leer.");
        const copy=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),buffer=await (await this.ensureContext()).decodeAudioData(copy);
        row.buffer=buffer;row.lastUsed=Date.now();this.stats.decoded++;this.pruneDecoded();this.emit();return buffer;
      })().catch(error=>{row.decodePromise=null;this.onError?.(error);throw error});
      return row.decodePromise;
    }
    pruneDecoded(){
      const rows=[...this.segments.values()].filter(row=>row.buffer).sort((a,b)=>(b.lastUsed||0)-(a.lastUsed||0));
      for(const row of rows.slice(this.maxDecodedSegments)){row.buffer=null;row.decodePromise=null}
    }
    async startSession({sessionId,projectId="",startMs=0,endMs=0,positionMs=null,segment=null,loopEnabled=false,loopStartMs=0,loopEndMs=0,loopCrossfadeMs=0}={}){
      this.stop({clearSession:true,silent:true});await this.ensureContext();
      const start=Math.max(0,Math.round(Number(startMs)||0)),end=Math.max(start+1,Math.round(Number(endMs)||0)),loop=loopShape({loopEnabled,loopStartMs,loopEndMs,loopCrossfadeMs,startMs:start,endMs:end});
      const requested=positionMs===null?start:Math.round(Number(positionMs)||start),initial=loop.loopEnabled?wrapLoopPosition(requested,loop.loopStartMs,loop.loopEndMs):clamp(requested,start,end,start);
      this.session={id:String(sessionId||""),projectId:String(projectId||""),startMs:loop.loopEnabled?loop.loopStartMs:start,endMs:loop.loopEnabled?loop.loopEndMs:end,paused:false,...loop};this.pausedTimelineMs=initial;this.scheduledThroughMs=initial;
      if(segment)this.addSegment(segment,{schedule:false});await this.scheduleFrom(initial,{resetAnchor:true});this.emit();return this.snapshot();
    }
    addSegment(input={}, {schedule=true}={}){
      if(!this.session)return null;const row=segmentShape(input),existing=this.segments.get(row.cacheStartMs)||{};const next={...existing,...row,lastUsed:Date.now()};this.segments.set(row.cacheStartMs,next);
      this.decodeSegment(next).then(()=>{if(schedule&&!this.session?.paused)this.scheduleAvailable().catch(error=>this.onError?.(error))}).catch(()=>{});this.emit();return next;
    }
    positionMs(){
      if(!this.session)return 0;if(this.session.paused)return clamp(this.pausedTimelineMs,this.session.startMs,this.session.endMs,this.session.startMs);
      if(!this.context||!this.anchorContextTime)return clamp(this.anchorTimelineMs||this.session.startMs,this.session.startMs,this.session.endMs,this.session.startMs);
      const elapsed=Math.max(0,this.context.currentTime-this.anchorContextTime)*1000;
      if(this.session.loopEnabled&&this.session.loopLengthMs>=500)return wrapLoopPosition(this.anchorTimelineMs+elapsed,this.session.loopStartMs,this.session.loopEndMs);
      return clamp(this.anchorTimelineMs+elapsed,this.session.startMs,this.session.endMs,this.session.startMs);
    }
    stopSources(){
      const generation=++this.generation;for(const row of this.sources){try{row.source.onended=null;row.source.stop()}catch{}row.ended=true}this.sources=[];this.scheduling=false;return generation;
    }
    async pause(){
      if(!this.session||this.session.paused)return this.snapshot();this.pausedTimelineMs=this.positionMs();this.session.paused=true;this.stopSources();this.stats.stops++;this.emit();return this.snapshot();
    }
    async resume(){
      if(!this.session)return this.snapshot();await this.ensureContext();const pos=this.session.paused?this.pausedTimelineMs:this.positionMs();this.session.paused=false;await this.scheduleFrom(pos,{resetAnchor:true});this.emit();return this.snapshot();
    }
    stop({clearSession=true,silent=false}={}){
      if(this.session&&!clearSession)this.pausedTimelineMs=this.positionMs();this.stopSources();this.stats.stops++;
      if(clearSession){this.session=null;this.segments.clear();this.anchorContextTime=0;this.anchorTimelineMs=0;this.pausedTimelineMs=0;this.scheduledThroughMs=0;this.scheduleCursorMs=0;this.scheduleCursorContextTime=0;this.scheduleFadeInMs=0}else if(this.session){this.session.paused=true}
      if(!silent)this.emit();return this.snapshot();
    }
    findSegment(positionMs){
      const pos=Math.max(0,Number(positionMs)||0),rows=[...this.segments.values()].sort((a,b)=>a.cacheStartMs-b.cacheStartMs);
      return rows.find(row=>pos>=row.cacheStartMs&&pos<row.cacheStartMs+row.cacheDurationMs)||rows.find(row=>row.cacheStartMs>=pos)||null;
    }
    async scheduleFrom(positionMs,{resetAnchor=false}={}){
      if(!this.session||this.session.paused)return this.snapshot();await this.ensureContext();const min=this.session.loopEnabled?this.session.loopStartMs:this.session.startMs,max=this.session.loopEnabled?this.session.loopEndMs:this.session.endMs,pos=this.session.loopEnabled?wrapLoopPosition(positionMs,min,max):clamp(positionMs,min,max,min);
      if(resetAnchor){this.stopSources();this.anchorTimelineMs=pos;this.anchorContextTime=this.context.currentTime+this.leadSeconds;this.scheduledThroughMs=pos;this.scheduleCursorMs=pos;this.scheduleCursorContextTime=this.anchorContextTime;this.scheduleFadeInMs=0}
      return this.scheduleAvailable();
    }
    async scheduleAvailable(){
      if(this.scheduling||!this.session||this.session.paused)return this.snapshot();this.scheduling=true;const gen=this.generation;
      try{
        let cursor=Number.isFinite(this.scheduleCursorMs)?this.scheduleCursorMs:this.positionMs(),scheduleWhen=Number.isFinite(this.scheduleCursorContextTime)&&this.scheduleCursorContextTime>0?this.scheduleCursorContextTime:this.context.currentTime+this.leadSeconds;
        while(this.session&&!this.session.paused&&gen===this.generation&&this.sources.filter(row=>!row.ended).length<this.maxQueuedSources){
          const boundary=this.session.loopEnabled?this.session.loopEndMs:this.session.endMs;
          if(cursor>=boundary-1){if(this.session.loopEnabled){cursor=this.session.loopStartMs;this.stats.loopTransitions++}else break}
          const row=this.findSegment(cursor);if(!row){this.onNeedPrefetch?.(cursor);break}
          const rowEnd=Math.min(boundary,row.cacheStartMs+row.cacheDurationMs);if(cursor<row.cacheStartMs){this.stats.lateTransitions++;this.onNeedPrefetch?.(cursor);break}
          let buffer;try{buffer=await this.decodeSegment(row)}catch{break}if(!this.session||this.session.paused||gen!==this.generation)break;
          const offsetMs=Math.max(0,cursor-row.cacheStartMs),availableMs=Math.min(rowEnd-cursor,Math.max(0,buffer.duration*1000-offsetMs));if(availableMs<1){cursor=rowEnd;continue}
          const now=this.context.currentTime;if(scheduleWhen<now-.01){this.stats.lateTransitions++;this.anchorTimelineMs=cursor;this.anchorContextTime=now+this.leadSeconds;scheduleWhen=this.anchorContextTime}
          scheduleWhen=Math.max(now+.005,scheduleWhen);
          const reachesLoopBoundary=this.session.loopEnabled&&cursor+availableMs>=boundary-1,requestedCrossfadeMs=reachesLoopBoundary?Number(this.session.loopCrossfadeMs||0):0,incomingFadeMs=Math.min(Math.max(0,Number(this.scheduleFadeInMs||0)),availableMs);
          let crossfadeMs=0;
          if(requestedCrossfadeMs>0&&typeof this.context.createGain==="function"){
            const headRow=this.findSegment(this.session.loopStartMs),headAvailable=headRow?Math.max(0,headRow.cacheStartMs+headRow.cacheDurationMs-this.session.loopStartMs):0;
            crossfadeMs=Math.min(requestedCrossfadeMs,availableMs,headAvailable);
          }
          if(requestedCrossfadeMs>0&&crossfadeMs<1)this.stats.loopCrossfadeFallbacks++;
          const source=this.context.createBufferSource();source.buffer=buffer;
          if((incomingFadeMs>0||crossfadeMs>0)&&typeof this.context.createGain==="function"){
            const gain=this.context.createGain(),param=gain.gain;param.setValueAtTime(incomingFadeMs>0?0:1,scheduleWhen);
            if(incomingFadeMs>0)param.linearRampToValueAtTime(1,scheduleWhen+incomingFadeMs/1000);
            if(crossfadeMs>0){const fadeStart=scheduleWhen+Math.max(0,availableMs-crossfadeMs)/1000;param.setValueAtTime(1,fadeStart);param.linearRampToValueAtTime(0,scheduleWhen+availableMs/1000)}
            source.connect(gain);gain.connect(this.destination);
          }else source.connect(this.destination);
          this.scheduleFadeInMs=0;
          const entry={source,startTimelineMs:cursor,endTimelineMs:cursor+availableMs,startContextTime:scheduleWhen,endContextTime:scheduleWhen+availableMs/1000,ended:false,crossfadeMs,incomingFadeMs};this.sources.push(entry);row.lastUsed=Date.now();
          source.onended=()=>{if(gen!==this.generation)return;entry.ended=true;this.sources=this.sources.filter(item=>!item.ended);if(!this.session||this.session.paused)return;if(!this.session.loopEnabled&&this.positionMs()>=this.session.endMs-10&&this.sources.length===0){const ended=this.session;this.stop({clearSession:true,silent:true});this.onEnded?.({sessionId:ended.id,projectId:ended.projectId});this.emit();return}this.scheduleAvailable().catch(error=>this.onError?.(error))};
          source.start(scheduleWhen,offsetMs/1000,availableMs/1000);this.stats.scheduled++;if(this.sources.length>1)this.stats.gaplessTransitions++;scheduleWhen+=availableMs/1000;cursor+=availableMs;
          if(reachesLoopBoundary){cursor=this.session.loopStartMs;this.scheduleFadeInMs=crossfadeMs;if(crossfadeMs>0)this.stats.loopCrossfades++;this.stats.loopTransitions++}
          this.scheduleCursorMs=cursor;this.scheduleCursorContextTime=scheduleWhen;this.scheduledThroughMs=cursor;
          const nextNeeded=cursor;if(!this.findSegment(nextNeeded)){this.onNeedPrefetch?.(nextNeeded);break}
        }
      }finally{this.scheduling=false;this.pruneDecoded();this.emit()}
      return this.snapshot();
    }
  }

  return{CutAuditionWebAudioTransport,segmentShape,loopShape,wrapLoopPosition};
});
