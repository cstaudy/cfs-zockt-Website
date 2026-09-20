(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CFSCutAuditionClock=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
  "use strict";
  const STATES=new Set(["playing","paused","stopped","ended","stale","idle"]);
  function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function clamp(value,min,max){return Math.max(min,Math.min(max,finite(value,min)))}
  function sanitizeRuntime(input={}){
    const state=STATES.has(String(input.state||""))?String(input.state):"idle";
    const start=Math.max(0,Math.round(finite(input.start_ms??input.startMs,0)));
    const end=Math.max(start,Math.round(finite(input.end_ms??input.endMs,start)));
    const position=Math.round(clamp(input.position_ms??input.positionMs,start,end||start)),loopStart=Math.round(clamp(input.loop_start_ms??input.loopStartMs,start,end)),loopEnd=Math.round(clamp(input.loop_end_ms??input.loopEndMs,loopStart,end)),loopEnabled=(input.loop_enabled===true||input.loopEnabled===true)&&loopEnd-loopStart>=500;
    return{active:input.active===true&&["playing","paused"].includes(state),state,session_id:String(input.session_id??input.sessionId??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,96),position_ms:position,start_ms:start,end_ms:end,loop_enabled:loopEnabled,loop_start_ms:loopEnabled?loopStart:0,loop_end_ms:loopEnabled?loopEnd:0,transport:String(input.transport||""),revision:Math.max(0,Math.round(finite(input.revision,0))),sampled_at_ms:Math.max(0,Math.round(finite(input.sampled_at_ms??input.sampledAtMs,0))),updated_at:input.updated_at||null,fresh:input.fresh===true};
  }
  function estimatePosition(input={},nowMs=Date.now()){
    const row=sanitizeRuntime(input),base=row.position_ms;if(row.state!=="playing"||!row.active||!row.sampled_at_ms)return base;
    const elapsed=clamp(finite(nowMs,Date.now())-row.sampled_at_ms,0,5000);if(row.loop_enabled){const length=row.loop_end_ms-row.loop_start_ms,rel=((base-row.loop_start_ms+elapsed)%length+length)%length;return Math.round(row.loop_start_ms+rel)}return Math.round(clamp(base+elapsed,row.start_ms,row.end_ms||base));
  }
  function statusLabel(input={}){
    const row=sanitizeRuntime(input),state=row.state;return state==="playing"?(row.loop_enabled?"LOCAL LOOPING":"LOCAL PLAYING"):state==="paused"?(row.loop_enabled?"LOOP PAUSED":"LOCAL PAUSED"):state==="stale"?"LAUNCHER STALE":state==="ended"?"LOCAL ENDED":state==="stopped"?"LOCAL STOPPED":"LOCAL IDLE";
  }
  return{sanitizeRuntime,estimatePosition,statusLabel};
});
