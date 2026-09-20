const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PROFILE_SCHEMA = 1;
const PROFILE_PASS = "21.10.24";
const MAX_PROFILES = 12;
const OUTPUT_PROFILES = new Set(["1080p60","1080p30","720p60","vertical1080p60"]);
const ENCODERS = new Set(["auto","software","nvenc","amd","qsv"]);
const AUDIO_BITRATES = new Set([96,128,160,192,256,320]);
const TRACK_KEYS = Object.freeze(["mix","mic","game","discord","music","alerts"]);
const AUDIO_KEYS = Object.freeze(["mic","game","discord","music","alerts"]);
const CLOUD_AUDIO_KEYS = Object.freeze(["microphone","game","discord","music","alerts"]);
const TARGET_ID_RX = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function text(value,max=120,fallback=""){const out=String(value??"").trim();return (out||fallback).slice(0,max)}
function bool(value,fallback=false){return typeof value==="boolean"?value:Boolean(fallback)}
function iso(value){const d=value instanceof Date?value:new Date(value||Date.now());return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString()}
function clone(value){try{return JSON.parse(JSON.stringify(value))}catch{return {}}}
function atomicWriteJson(filePath,value){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const temp=`${filePath}.tmp`,payload=`${JSON.stringify(value,null,2)}\n`;
  let fd=null;
  try{fd=fs.openSync(temp,"w",0o600);fs.writeFileSync(fd,payload,"utf8");fs.fsyncSync(fd)}finally{if(fd!==null)fs.closeSync(fd)}
  try{fs.chmodSync(temp,0o600)}catch{}
  fs.renameSync(temp,filePath);
  try{fs.chmodSync(filePath,0o600)}catch{}
}
function normalizeProfileId(value){const id=text(value,80).toLowerCase().replace(/[^a-z0-9_-]/g,"_");return id&&/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)?id:""}
function normalizeOutputProfile(value,fallback="1080p60"){return OUTPUT_PROFILES.has(String(value||""))?String(value):fallback}
function normalizeEncoder(value,fallback="auto"){return ENCODERS.has(String(value||""))?String(value):fallback}
function normalizeAudioBitrate(value,fallback=160){const n=Math.round(Number(value));return AUDIO_BITRATES.has(n)?n:fallback}
function sanitizeRecordingTracks(input={}){const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};const out={};for(const key of TRACK_KEYS)out[key]=source[key]!==false;if(!Object.values(out).some(Boolean))out.mix=true;return out}
function sanitizeStudioAudio(input={}){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};const out={};
  for(const key of CLOUD_AUDIO_KEYS){const raw=source[key]&&typeof source[key]==="object"?source[key]:{};const legacy=key==="game"&&source.desktop&&typeof source.desktop==="object"?source.desktop:{};const row=Object.keys(raw).length?raw:legacy;out[key]={level:Math.round(clamp(row.level,0,100,key==="music"?65:key==="alerts"?90:key==="microphone"?85:80)),muted:row.muted===true}}
  return out;
}
function sanitizeLocalAudioSources(input={}){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};const out={};
  for(const key of AUDIO_KEYS){const raw=source[key]&&typeof source[key]==="object"&&!Array.isArray(source[key])?source[key]:{};const base={enabled:raw.enabled===true,volume:clamp(raw.volume,0,2,1),muted:raw.muted===true,delayMs:Math.round(clamp(raw.delayMs,0,2000,0))};if(key==="mic")out[key]={...base,deviceName:text(raw.deviceName,220)};else out[key]={...base,processId:Math.round(clamp(raw.processId,0,0x7fffffff,0)),processName:text(raw.processName,160),includeTree:raw.includeTree!==false};}
  return out;
}
function sanitizeLocalSettings(input={}){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  return {
    streamAudioDevice:text(source.streamAudioDevice??source.audioDevice,220),streamAudioDevice2:text(source.streamAudioDevice2??source.audioDevice2,220),
    streamAudioVolume:clamp(source.streamAudioVolume??source.audioVolume,0,2,1),streamAudioVolume2:clamp(source.streamAudioVolume2??source.audioVolume2,0,2,1),
    streamAudioMute:bool(source.streamAudioMute??source.audioMute,false),streamAudioMute2:bool(source.streamAudioMute2??source.audioMute2,false),
    streamAudioDelayMs:Math.round(clamp(source.streamAudioDelayMs??source.audioDelayMs,0,2000,0)),streamAudioDelayMs2:Math.round(clamp(source.streamAudioDelayMs2??source.audioDelayMs2,0,2000,0)),
    streamAudioSources:sanitizeLocalAudioSources(source.streamAudioSources??source.audioSources??{}),
    streamRecordingEnabled:bool(source.streamRecordingEnabled??source.recordingEnabled,false)
  };
}
function sanitizeOutput(input={}){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  return {profile:normalizeOutputProfile(source.profile),encoder:normalizeEncoder(source.encoder),bitrate_kbps:Math.round(clamp(source.bitrate_kbps,1000,30000,6000)),audio_bitrate_kbps:normalizeAudioBitrate(source.audio_bitrate_kbps),recording_format:["mkv","mp4"].includes(String(source.recording_format||""))?String(source.recording_format):"mkv",recording_tracks:sanitizeRecordingTracks(source.recording_tracks)};
}
function sanitizeTarget(input={},index=0){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};const id=text(source.id,64).toLowerCase().replace(/[^a-z0-9_-]/g,"_");if(!TARGET_ID_RX.test(id))return null;
  return {id,label:text(source.label,48,`Target ${index+1}`),provider:text(source.provider,32,"custom_rtmp").toLowerCase(),enabled:source.enabled===true,profile:normalizeOutputProfile(source.profile,String(source.provider)==="tiktok"?"vertical1080p60":"1080p60"),bitrate_kbps:Math.round(clamp(source.bitrate_kbps,1000,30000,String(source.provider)==="tiktok"?4500:6000)),audio_bitrate_kbps:normalizeAudioBitrate(source.audio_bitrate_kbps)};
}
function profileSummary(profile={}){const targets=Array.isArray(profile.targets)?profile.targets:[],enabled=targets.filter(row=>row.enabled);return{id:profile.id,name:profile.name,createdAt:profile.createdAt,updatedAt:profile.updatedAt,output:profile.output,targetCount:targets.length,enabledTargets:enabled.map(row=>({id:row.id,label:row.label,provider:row.provider,profile:row.profile,bitrate_kbps:row.bitrate_kbps})),recordingEnabled:profile.local?.streamRecordingEnabled===true,audioSources:Object.entries(profile.local?.streamAudioSources||{}).filter(([,row])=>row?.enabled===true).map(([key])=>key)}}
function captureProfile({id="",name="",config={},settings={},createdAt="",now=Date.now()}={}){
  const source=config&&typeof config==="object"&&!Array.isArray(config)?config:{};const rawTargets=Array.isArray(source?.multistream?.destinations)?source.multistream.destinations:[];const targets=[];const seen=new Set();for(let i=0;i<rawTargets.length&&targets.length<8;i++){const target=sanitizeTarget(rawTargets[i],i);if(!target||seen.has(target.id))continue;seen.add(target.id);targets.push(target)}
  return {id:normalizeProfileId(id),name:text(name,48,"Streaming Profil"),createdAt:createdAt?iso(createdAt):iso(now),updatedAt:iso(now),output:sanitizeOutput(source.output),studioAudio:sanitizeStudioAudio(source.audio),targets,local:sanitizeLocalSettings(settings)};
}
function sanitizeStoredProfile(input={}){const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};const id=normalizeProfileId(source.id);if(!id)return null;const profile=captureProfile({id,name:source.name,config:{output:source.output,audio:source.studioAudio,multistream:{destinations:source.targets}},settings:source.local,createdAt:source.createdAt||source.created_at,now:source.updatedAt||source.updated_at||Date.now()});profile.updatedAt=iso(source.updatedAt||source.updated_at||Date.now());return profile}
function applyProfileToConfig(baseConfig={},profile=null,limit=8){
  const config=clone(baseConfig&&typeof baseConfig==="object"?baseConfig:{});if(!profile)return{config,profile:null,warnings:[]};const clean=sanitizeStoredProfile(profile)||profile,warnings=[];
  config.output={...(config.output||{}),...sanitizeOutput(clean.output)};
  config.audio={...(config.audio||{}),...sanitizeStudioAudio(clean.studioAudio)};
  const current=Array.isArray(config?.multistream?.destinations)?config.multistream.destinations:[],saved=new Map((clean.targets||[]).map(row=>[row.id,row])),max=Math.max(1,Math.min(8,Math.round(Number(limit)||1)));let seenEnabled=0;
  const destinations=current.map((row,index)=>{const id=text(row?.id,64).toLowerCase(),preset=saved.get(id);if(!preset){return{...row,enabled:false}}if(text(row?.provider,32).toLowerCase()!==preset.provider){warnings.push(`${preset.label}: Provider hat sich geändert; Ziel bleibt deaktiviert.`);return{...row,enabled:false}}let enabled=preset.enabled===true;if(enabled){seenEnabled+=1;if(seenEnabled>max){enabled=false;warnings.push(`${preset.label}: wegen aktuellem Plan-Limit deaktiviert.`)}}return{...row,enabled,profile:preset.profile,bitrate_kbps:preset.bitrate_kbps,audio_bitrate_kbps:preset.audio_bitrate_kbps}});
  for(const preset of clean.targets||[]){if(!current.some(row=>String(row?.id)===preset.id))warnings.push(`${preset.label}: Ziel existiert in der aktuellen Studio-Konfiguration nicht mehr.`)}
  config.multistream={...(config.multistream||{}),destinations};
  return{config,profile:profileSummary(clean),warnings};
}
function localSettingsPatch(profile={}){const local=sanitizeLocalSettings(profile.local||{});return{streamAudioDevice:local.streamAudioDevice,streamAudioDevice2:local.streamAudioDevice2,streamAudioVolume:local.streamAudioVolume,streamAudioVolume2:local.streamAudioVolume2,streamAudioMute:local.streamAudioMute,streamAudioMute2:local.streamAudioMute2,streamAudioDelayMs:local.streamAudioDelayMs,streamAudioDelayMs2:local.streamAudioDelayMs2,streamAudioSources:local.streamAudioSources,streamRecordingEnabled:local.streamRecordingEnabled}}

class StreamProfileStore{
  constructor(filePath,{logger=null,nowFn=()=>Date.now(),idFactory=()=>`profile_${crypto.randomUUID().replace(/-/g,"").slice(0,12)}`}={}){this.filePath=filePath;this.logger=logger;this.nowFn=nowFn;this.idFactory=idFactory}
  readRaw(){try{const parsed=JSON.parse(fs.readFileSync(this.filePath,"utf8"));if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("invalid");const profiles=[];const seen=new Set();for(const row of Array.isArray(parsed.profiles)?parsed.profiles:[]){const clean=sanitizeStoredProfile(row);if(!clean||seen.has(clean.id)||profiles.length>=MAX_PROFILES)continue;seen.add(clean.id);profiles.push(clean)}const active=normalizeProfileId(parsed.activeProfileId||parsed.active_profile_id);return{schema:PROFILE_SCHEMA,pass:PROFILE_PASS,activeProfileId:profiles.some(row=>row.id===active)?active:"",profiles}}catch(error){if(error?.code!=="ENOENT")this.logger?.warn?.("Stream profiles could not be read",error?.message);return{schema:PROFILE_SCHEMA,pass:PROFILE_PASS,activeProfileId:"",profiles:[]}}}
  writeRaw(raw){const profiles=(Array.isArray(raw?.profiles)?raw.profiles:[]).map(sanitizeStoredProfile).filter(Boolean).slice(0,MAX_PROFILES);const active=normalizeProfileId(raw?.activeProfileId);atomicWriteJson(this.filePath,{schema:PROFILE_SCHEMA,pass:PROFILE_PASS,activeProfileId:profiles.some(row=>row.id===active)?active:"",profiles})}
  get(id){const wanted=normalizeProfileId(id);return this.readRaw().profiles.find(row=>row.id===wanted)||null}
  active(){const raw=this.readRaw();return raw.profiles.find(row=>row.id===raw.activeProfileId)||null}
  save({id="",name="",config={},settings={}}={}){const raw=this.readRaw(),wanted=normalizeProfileId(id);let existing=wanted?raw.profiles.find(row=>row.id===wanted):null;if(!existing&&raw.profiles.length>=MAX_PROFILES)throw new Error(`Maximal ${MAX_PROFILES} Streaming-Profile können gespeichert werden.`);const finalName=text(name,48,existing?.name||"Streaming Profil");const duplicate=raw.profiles.find(row=>row.id!==wanted&&row.name.toLowerCase()===finalName.toLowerCase());if(duplicate)throw new Error("Ein Streaming-Profil mit diesem Namen existiert bereits.");const finalId=existing?.id||normalizeProfileId(this.idFactory());if(!finalId)throw new Error("Streaming-Profil-ID konnte nicht erzeugt werden.");const next=captureProfile({id:finalId,name:finalName,config,settings,createdAt:existing?.createdAt,now:this.nowFn()});const index=raw.profiles.findIndex(row=>row.id===finalId);if(index>=0)raw.profiles[index]=next;else raw.profiles.push(next);this.writeRaw(raw);return next}
  activate(id){const raw=this.readRaw(),wanted=normalizeProfileId(id);if(!raw.profiles.some(row=>row.id===wanted))throw new Error("Streaming-Profil wurde nicht gefunden.");raw.activeProfileId=wanted;this.writeRaw(raw);return this.get(wanted)}
  clearActive(){const raw=this.readRaw();raw.activeProfileId="";this.writeRaw(raw);return this.snapshot()}
  remove(id){const raw=this.readRaw(),wanted=normalizeProfileId(id),before=raw.profiles.length;raw.profiles=raw.profiles.filter(row=>row.id!==wanted);if(raw.activeProfileId===wanted)raw.activeProfileId="";this.writeRaw(raw);return before!==raw.profiles.length}
  apply(baseConfig={},limit=8){return applyProfileToConfig(baseConfig,this.active(),limit)}
  snapshot(){const raw=this.readRaw(),active=raw.profiles.find(row=>row.id===raw.activeProfileId)||null;return{schema:PROFILE_SCHEMA,pass:PROFILE_PASS,maxProfiles:MAX_PROFILES,activeProfileId:raw.activeProfileId,activeProfile:active?profileSummary(active):null,profiles:raw.profiles.map(profileSummary),secretFieldsPersisted:false,cloudConfigMutated:false}}
}

module.exports={StreamProfileStore,PROFILE_SCHEMA,PROFILE_PASS,MAX_PROFILES,OUTPUT_PROFILES,ENCODERS,AUDIO_BITRATES,captureProfile,sanitizeStoredProfile,applyProfileToConfig,localSettingsPatch,profileSummary,sanitizeLocalSettings,sanitizeStudioAudio};
