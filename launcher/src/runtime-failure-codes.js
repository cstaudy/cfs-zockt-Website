"use strict";

const KNOWN = Object.freeze({
  STREAM_ENGINE_UNAVAILABLE:"Stream Engine ist nicht verfügbar.",
  STREAM_ENGINE_ERROR:"Stream Engine meldet einen Fehler.",
  STREAM_WATCHDOG_RESTART:"Stream Watchdog musste neu starten.",
  STREAM_RUNTIME_ERRORS:"Stream Runtime meldet Fehler.",
  STREAM_DROPPED_FRAMES:"Stream Runtime meldet erhöhte Frame-Verluste.",
  STREAM_TARGET_ERROR:"Mindestens ein Streaming-Ziel meldet einen Fehler.",
  STREAM_TARGET_RECONNECTING:"Mindestens ein Streaming-Ziel verbindet sich neu.",
  RECORDING_RUNTIME_ERROR:"Lokale Aufnahme meldet einen Fehler.",
  APPLICATION_AUDIO_UNAVAILABLE:"Anwendungs-Audio ist für eine konfigurierte Quelle nicht verfügbar.",
  APPLICATION_AUDIO_SOURCE_ERROR:"Mindestens eine Anwendungs-Audioquelle meldet einen Fehler.",
  GAME_CAPTURE_RUNTIME_UNVERIFIED:"Game Capture wurde auf diesem System noch nicht verifiziert.",
  GAME_CAPTURE_UNAVAILABLE:"Game Capture ist für eine konfigurierte Quelle nicht verfügbar.",
  GAME_CAPTURE_SOURCE_ERROR:"Mindestens eine Game-Capture-Quelle meldet einen Fehler.",
  RUNTIME_EVIDENCE_GUARD_FAILED:"Die Runtime-Evidence-Prüfung meldet einen Fehler."
});

function row(code,severity="warning",detail=""){
  return {code,severity,message:KNOWN[code]||code,detail:String(detail||"").slice(0,240)};
}
function rows(value){return Array.isArray(value)?value:[]}
function state(value){return String(value||"").toLowerCase()}

function classifyRuntimeFailures({streamEngine={},applicationAudio={},gameCapture={},runtimeEvidence={}}={}){
  const out=[];
  const engineState=state(streamEngine.status);
  const engineDesired=streamEngine.desiredRunning===true || ["starting","running","reconnecting"].includes(engineState);
  if(engineDesired && streamEngine.available===false) out.push(row("STREAM_ENGINE_UNAVAILABLE","critical",streamEngine.error));
  if(["error","failed"].includes(engineState) || (engineDesired&&streamEngine.error)) out.push(row("STREAM_ENGINE_ERROR","critical",streamEngine.error));
  if(Number(streamEngine.watchdogRestarts||streamEngine.watchdog_restarts||0)>0) out.push(row("STREAM_WATCHDOG_RESTART","warning",String(streamEngine.watchdogRestarts||streamEngine.watchdog_restarts)));
  const runtimeErrors=Number(streamEngine.runtimeErrors||streamEngine.runtime_errors||0);
  if(runtimeErrors>0) out.push(row("STREAM_RUNTIME_ERRORS",runtimeErrors>=3?"critical":"warning",String(runtimeErrors)));
  const dropped=Number(streamEngine.droppedFrames||streamEngine.dropped_frames||streamEngine.telemetry?.dropped_frames||0);
  if(dropped>=120) out.push(row("STREAM_DROPPED_FRAMES","warning",String(dropped)));
  const destinations=streamEngine.destinations&&typeof streamEngine.destinations==="object"?Object.values(streamEngine.destinations):[];
  if(destinations.some(x=>["error","failed"].includes(state(x?.status))||x?.error)) out.push(row("STREAM_TARGET_ERROR","critical"));
  if(destinations.some(x=>state(x?.status)==="reconnecting")) out.push(row("STREAM_TARGET_RECONNECTING","warning"));
  if(streamEngine.recording?.error || ["error","failed"].includes(state(streamEngine.recording?.status))) out.push(row("RECORDING_RUNTIME_ERROR","warning",streamEngine.recording?.error));

  const audioSources=rows(applicationAudio.sources);
  const audioConfigured=audioSources.some(x=>x?.enabled===true || x?.prepared===true);
  if(audioConfigured && applicationAudio.available===false) out.push(row("APPLICATION_AUDIO_UNAVAILABLE","warning",applicationAudio.error));
  if(audioSources.some(x=>x?.error || ["error","failed"].includes(state(x?.status)))) out.push(row("APPLICATION_AUDIO_SOURCE_ERROR","warning"));

  const captureSources=rows(gameCapture.sources);
  const captureConfigured=captureSources.some(x=>x?.enabled===true || x?.prepared===true) || streamEngine.captureType==="game";
  if(captureConfigured && gameCapture.runtimeVerified===false) out.push(row("GAME_CAPTURE_RUNTIME_UNVERIFIED","warning",gameCapture.error));
  if(captureConfigured && gameCapture.available===false) out.push(row("GAME_CAPTURE_UNAVAILABLE","critical",gameCapture.error));
  if(captureSources.some(x=>x?.error || ["error","failed"].includes(state(x?.status)))) out.push(row("GAME_CAPTURE_SOURCE_ERROR","warning"));

  if(runtimeEvidence.guardFailed===true || runtimeEvidence.guard_failed===true || state(runtimeEvidence.status)==="failed") out.push(row("RUNTIME_EVIDENCE_GUARD_FAILED","critical",runtimeEvidence.error));
  const unique=[...new Map(out.map(item=>[item.code,item])).values()];
  const critical=unique.filter(x=>x.severity==="critical").length;
  const warning=unique.length-critical;
  return {schema:1,status:critical?"critical":warning?"warning":"ok",critical,warning,total:unique.length,recent:unique,secrets_exposed:false,raw_media_exposed:false};
}

module.exports={classifyRuntimeFailures,KNOWN_RUNTIME_FAILURES:KNOWN};
