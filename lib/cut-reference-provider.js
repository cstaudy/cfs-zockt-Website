"use strict";

const {profileId,sanitizeReferenceSample}=require("./cut-reference-learning");
const DEFAULT_GEMINI_MODEL="gemini-2.5-flash";
const PROVIDER_ORIGIN="https://generativelanguage.googleapis.com";
const MAX_RESPONSE_BYTES=1024*1024;

function text(value,max=500){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function extractJson(value){
  const raw=String(value||"").trim();
  const fenced=raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate=(fenced?.[1]||raw).trim();
  const first=candidate.indexOf("{"),last=candidate.lastIndexOf("}");
  if(first<0||last<=first)throw Object.assign(new Error("Reference Provider lieferte kein JSON."),{statusCode:502});
  try{return JSON.parse(candidate.slice(first,last+1))}catch{throw Object.assign(new Error("Reference Provider lieferte ungültiges JSON."),{statusCode:502})}
}
async function analyzeCutReferenceWithGemini({url,gameProfile="generic",apiKey,model=DEFAULT_GEMINI_MODEL,timeoutMs=90000}={}){
  const key=text(apiKey,256);if(!key)throw Object.assign(new Error("Reference Provider ist nicht konfiguriert."),{statusCode:503});
  const referenceUrl=new URL(String(url||""));
  if(referenceUrl.protocol!=="https:"||!['www.youtube.com','youtube.com','m.youtube.com','youtu.be'].includes(referenceUrl.hostname.toLowerCase()))throw Object.assign(new Error("Ungültige Referenz-URL."),{statusCode:400});
  const safeModel=text(model,80,DEFAULT_GEMINI_MODEL).replace(/[^a-zA-Z0-9._-]/g,"")||DEFAULT_GEMINI_MODEL;
  const endpoint=`${PROVIDER_ORIGIN}/v1beta/models/${encodeURIComponent(safeModel)}:generateContent?key=${encodeURIComponent(key)}`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(110000,Number(timeoutMs)||90000)));
  const prompt=`Analyze this public YouTube gameplay reference only for editing guidance. URL: ${referenceUrl.toString()}\nGame profile: ${profileId(gameProfile)}\nReturn strict JSON with title, channel, summary, reference_score (0-100), hook_seconds, ideal_short_seconds, action_density (0-1), pacing, lessons (max 8), and events (max 30) using only allowed game-profile categories. Do not claim facts you cannot infer.`;
  try{
    const response=await fetch(endpoint,{method:"POST",redirect:"error",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:.1}}),signal:controller.signal});
    if(!response.ok)throw Object.assign(new Error(`Reference Provider HTTP ${response.status}.`),{statusCode:502});
    const bodyText=await response.text();if(Buffer.byteLength(bodyText)>MAX_RESPONSE_BYTES)throw Object.assign(new Error("Reference Provider Antwort ist zu groß."),{statusCode:502});
    let envelope;try{envelope=JSON.parse(bodyText)}catch{throw Object.assign(new Error("Reference Provider Antwort ist ungültig."),{statusCode:502})}
    const providerText=(envelope?.candidates?.[0]?.content?.parts||[]).map(part=>part?.text||"").join("\n");
    const parsed=extractJson(providerText);
    const sample=sanitizeReferenceSample({...parsed,url:referenceUrl.toString(),status:"analyzed",analyzed_at:new Date().toISOString()},profileId(gameProfile));
    if(!sample)throw Object.assign(new Error("Reference Provider Analyse konnte nicht validiert werden."),{statusCode:502});
    return{provider:"gemini",model:safeModel,sample};
  }catch(error){
    if(error?.name==="AbortError")throw Object.assign(new Error("Reference Provider Timeout."),{statusCode:504});
    throw error;
  }finally{clearTimeout(timer)}
}
module.exports={DEFAULT_GEMINI_MODEL,analyzeCutReferenceWithGemini};
