"use strict";

const {profileId,sanitizeReferenceLearning}=require("./cut-reference-learning");

const CUT_FORMATS=Object.freeze({
  vertical:{key:"vertical",label:"9:16 Vertical",width:1080,height:1920},
  landscape:{key:"landscape",label:"16:9 Landscape",width:1920,height:1080},
  square:{key:"square",label:"1:1 Square",width:1080,height:1080}
});
const CUT_STATUSES=new Set(["draft","ready","archived"]);
const CUT_EXPORT_MODES=new Set(["clips","reel","both"]);
const CUT_CAPTION_POSITIONS=new Set(["top","center","bottom"]);
const CUT_CAPTION_STYLES=new Set(["box","outline","clean"]);
const CUT_TRANSITIONS=new Set(["cut","fade","dissolve","wipeleft","wiperight","slideleft","slideright"]);
const CUT_ENCODERS=new Set(["software","nvenc","qsv","amf"]);
const CUT_KEYFRAME_EASINGS=new Set(["linear","ease_in_out","bezier"]);

function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function text(value,max=120,fallback=""){const out=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();return(out||fallback).slice(0,max)}

function safeTrackId(value,prefix="track"){
  const out=String(value??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,64);
  return out||`${prefix}_${Math.random().toString(36).slice(2,10)}`;
}
function sanitizeVisualKeyframes(value,fallback={}){
  const raw=Array.isArray(value)?value:[];
  const points=raw.slice(0,8).map((p,index)=>({
    at:Number(clamp(p?.at,0,1,index===0?0:index===raw.length-1?1:index/Math.max(1,raw.length-1)).toFixed(4)),
    zoom:Number(clamp(p?.zoom,1,2.5,1).toFixed(3)),
    pan_x:Number(clamp(p?.pan_x,-1,1,0).toFixed(3)),
    pan_y:Number(clamp(p?.pan_y,-1,1,0).toFixed(3)),
    rotation:Number(clamp(p?.rotation,-180,180,0).toFixed(2)),
    opacity:Number(clamp(p?.opacity,0,1,1).toFixed(3)),
    easing:CUT_KEYFRAME_EASINGS.has(String(p?.easing||""))?String(p.easing):"linear",
    bezier_y1:Number(clamp(p?.bezier_y1,0,1,.25).toFixed(3)),
    bezier_y2:Number(clamp(p?.bezier_y2,0,1,.75).toFixed(3))
  })).sort((a,b)=>a.at-b.at);

  const dedup=[];
  for(const point of points){
    if(dedup.length&&Math.abs(dedup.at(-1).at-point.at)<0.0001)dedup[dedup.length-1]=point;
    else dedup.push(point);
  }
  if(dedup.length>=2){
    if(dedup[0].at>0)dedup.unshift({...dedup[0],at:0});
    if(dedup.at(-1).at<1)dedup.push({...dedup.at(-1),at:1});
    return dedup.slice(0,8);
  }
  return[
    {at:0,zoom:Number(fallback.zoom_start||1),pan_x:Number(fallback.pan_x_start||0),pan_y:Number(fallback.pan_y_start||0),rotation:0,opacity:1,easing:"linear",bezier_y1:.25,bezier_y2:.75},
    {at:1,zoom:Number(fallback.zoom_end||1),pan_x:Number(fallback.pan_x_end||0),pan_y:Number(fallback.pan_y_end||0),rotation:0,opacity:1,easing:String(fallback.easing||"linear"),bezier_y1:.25,bezier_y2:.75}
  ];
}
function sanitizeSfxTracks(value){
  const raw=Array.isArray(value)?value:[];
  const seen=new Set(),out=[];
  for(const item of raw.slice(0,8)){
    let id=safeTrackId(item?.id,"sfx");
    if(seen.has(id))id=`${id}_${out.length+1}`;
    seen.add(id);
    out.push({
      id,
      enabled:item?.enabled!==false,
      name:text(item?.name,240,`SFX ${out.length+1}`),
      start_ms:Math.round(clamp(item?.start_ms,0,24*60*60*1000,0)),
      gain_db:Number(clamp(item?.gain_db,-36,12,-6).toFixed(1)),
      fade_in_ms:Math.round(clamp(item?.fade_in_ms,0,5000,0)),
      fade_out_ms:Math.round(clamp(item?.fade_out_ms,0,5000,0)),
      mute:item?.mute===true,
      solo:item?.solo===true,
      pan:Number(clamp(item?.pan,-1,1,0).toFixed(2))
    });
  }
  return out;
}
function sanitizeExtraAudioTracks(value,kind="music"){
  const raw=Array.isArray(value)?value:[];
  const max=3,seen=new Set(),out=[];
  for(const item of raw.slice(0,max)){
    let id=safeTrackId(item?.id,kind);
    if(seen.has(id))id=`${id}_${out.length+1}`;
    seen.add(id);
    const isMusic=kind==="music";
    out.push({
      id,
      enabled:item?.enabled!==false,
      name:text(item?.name,240,`${isMusic?"Musik":"Voice"} ${out.length+2}`),
      start_ms:Math.round(clamp(item?.start_ms,0,24*60*60*1000,0)),
      gain_db:Number(clamp(item?.gain_db,isMusic?-36:-24,12,isMusic?-18:0).toFixed(1)),
      fade_in_ms:Math.round(clamp(item?.fade_in_ms,0,isMusic?10000:5000,isMusic?800:100)),
      fade_out_ms:Math.round(clamp(item?.fade_out_ms,0,isMusic?10000:5000,isMusic?1200:300)),
      loop:isMusic?item?.loop!==false:false,
      mute:item?.mute===true,
      solo:item?.solo===true,
      pan:Number(clamp(item?.pan,-1,1,0).toFixed(2))
    });
  }
  return out;
}
function sanitizeSourceTracks(value){
  const raw=Array.isArray(value)?value:[],seen=new Set(),out=[];
  for(const item of raw.slice(0,8)){
    const key=safeTrackId(item?.key||item?.id,`source_${out.length+1}`);
    if(seen.has(key))continue;seen.add(key);
    out.push({
      key,
      label:text(item?.label||item?.title,80,`Audio ${out.length+1}`),
      stream_index:Math.round(clamp(item?.stream_index??item?.streamIndex,0,15,out.length)),
      enabled:item?.enabled!==false,
      gain_db:Number(clamp(item?.gain_db,-36,12,0).toFixed(1)),
      mute:item?.mute===true,
      solo:item?.solo===true,
      pan:Number(clamp(item?.pan,-1,1,0).toFixed(2)),
      waveform:(Array.isArray(item?.waveform)?item.waveform:[]).slice(0,64).map(value=>Number(clamp(value,0,1,0).toFixed(3))),
      peak_db:item?.peak_db===null||item?.peak_db===undefined?null:Number(clamp(item.peak_db,-120,12,-120).toFixed(1)),
      mean_db:item?.mean_db===null||item?.mean_db===undefined?null:Number(clamp(item.mean_db,-120,12,-120).toFixed(1)),
      analyzed_at:text(item?.analyzed_at,40,"")
    });
  }
  return out;
}
function sanitizeCutProject(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const format=CUT_FORMATS[String(s.format||"")]?String(s.format):"vertical";
  const status=CUT_STATUSES.has(String(s.status||""))?String(s.status):"draft";
  const exportMode=CUT_EXPORT_MODES.has(String(s.export_preset?.mode||""))?String(s.export_preset.mode):"clips";
  const transition=CUT_TRANSITIONS.has(String(s.export_preset?.transition||""))?String(s.export_preset.transition):"cut";
  const encoder=CUT_ENCODERS.has(String(s.export_preset?.encoder||""))?String(s.export_preset.encoder):"software";
  return{
    title:text(s.title,120,"Neues Cut Projekt"),
    status,
    format,
    notes:text(s.notes,5000,""),
    source_name:text(s.source_name,240,""),
    export_preset:{
      width:CUT_FORMATS[format].width,
      height:CUT_FORMATS[format].height,
      fps:Math.round(clamp(s.export_preset?.fps,24,60,30)),
      quality:["standard","high"].includes(String(s.export_preset?.quality||""))?String(s.export_preset.quality):"high",
      mode:exportMode,
      transition,
      transition_ms:transition==="cut"?0:Math.round(clamp(s.export_preset?.transition_ms,100,1500,350)),
      encoder,
      audio_normalize:s.export_preset?.audio_normalize===true,
      audio_bitrate_kbps:Math.round(clamp(s.export_preset?.audio_bitrate_kbps,96,320,160)),
      source_audio_gain_db:Number(clamp(s.export_preset?.source_audio_gain_db,-24,12,0).toFixed(1)),
      source_audio_mute:s.export_preset?.source_audio_mute===true,
      source_audio_solo:s.export_preset?.source_audio_solo===true,
      source_audio_pan:Number(clamp(s.export_preset?.source_audio_pan,-1,1,0).toFixed(2)),
      source_tracks:sanitizeSourceTracks(s.export_preset?.source_tracks),
      source_handoff_id:text(s.export_preset?.source_handoff_id,120,""),
      audition_playhead_ms:Math.round(clamp(s.export_preset?.audition_playhead_ms,0,24*60*60*1000,0)),
      audition_a_ms:Math.round(clamp(s.export_preset?.audition_a_ms,0,24*60*60*1000,0)),
      audition_b_ms:Math.round(clamp(s.export_preset?.audition_b_ms,0,24*60*60*1000,0)),
      audition_loop_crossfade_ms:Math.round(clamp(s.export_preset?.audition_loop_crossfade_ms,0,50,12)),
      audition_zero_cross_radius_ms:Math.round(clamp(s.export_preset?.audition_zero_cross_radius_ms,5,50,20)),
      music_enabled:s.export_preset?.music_enabled===true,
      music_name:text(s.export_preset?.music_name,240,""),
      music_gain_db:Number(clamp(s.export_preset?.music_gain_db,-36,6,-18).toFixed(1)),
      music_start_ms:Math.round(clamp(s.export_preset?.music_start_ms,0,24*60*60*1000,0)),
      music_loop:s.export_preset?.music_loop!==false,
      music_fade_in_ms:Math.round(clamp(s.export_preset?.music_fade_in_ms,0,10000,800)),
      music_fade_out_ms:Math.round(clamp(s.export_preset?.music_fade_out_ms,0,10000,1200)),
      music_mute:s.export_preset?.music_mute===true,
      music_solo:s.export_preset?.music_solo===true,
      music_pan:Number(clamp(s.export_preset?.music_pan,-1,1,0).toFixed(2)),
      music_tracks:sanitizeExtraAudioTracks(s.export_preset?.music_tracks,"music"),
      voiceover_enabled:s.export_preset?.voiceover_enabled===true,
      voiceover_name:text(s.export_preset?.voiceover_name,240,""),
      voiceover_gain_db:Number(clamp(s.export_preset?.voiceover_gain_db,-24,12,0).toFixed(1)),
      voiceover_start_ms:Math.round(clamp(s.export_preset?.voiceover_start_ms,0,24*60*60*1000,0)),
      voiceover_fade_in_ms:Math.round(clamp(s.export_preset?.voiceover_fade_in_ms,0,5000,100)),
      voiceover_fade_out_ms:Math.round(clamp(s.export_preset?.voiceover_fade_out_ms,0,5000,300)),
      voiceover_mute:s.export_preset?.voiceover_mute===true,
      voiceover_solo:s.export_preset?.voiceover_solo===true,
      voiceover_pan:Number(clamp(s.export_preset?.voiceover_pan,-1,1,0).toFixed(2)),
      voice_tracks:sanitizeExtraAudioTracks(s.export_preset?.voice_tracks,"voice"),
      ducking_enabled:s.export_preset?.ducking_enabled===true,
      ducking_ratio:Number(clamp(s.export_preset?.ducking_ratio,2,20,8).toFixed(1)),
      sfx_tracks:sanitizeSfxTracks(s.export_preset?.sfx_tracks),
      game_profile:profileId(s.export_preset?.game_profile),
      reference_learning:sanitizeReferenceLearning(s.export_preset?.reference_learning,profileId(s.export_preset?.game_profile))
    }
  };
}

function sanitizeCutClip(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const start=Math.round(clamp(s.in_ms,0,24*60*60*1000,0));
  const end=Math.round(clamp(s.out_ms,start+100,24*60*60*1000,start+15000));
  const duration=Math.max(100,end-start);
  const kfEnabled=s.keyframe_enabled===true;
  return{
    label:text(s.label,120,"Clip"),
    in_ms:start,
    out_ms:end,
    caption:text(s.caption,3000,""),
    selected:s.selected!==false,
    sort_order:Math.round(clamp(s.sort_order,0,100000,0)),
    caption_enabled:s.caption_enabled===true,
    caption_position:CUT_CAPTION_POSITIONS.has(String(s.caption_position||""))?String(s.caption_position):"bottom",
    caption_size:Math.round(clamp(s.caption_size,18,120,52)),
    caption_style:CUT_CAPTION_STYLES.has(String(s.caption_style||""))?String(s.caption_style):"box",
    audio_gain_db:Number(clamp(s.audio_gain_db,-24,12,0).toFixed(1)),
    audio_fade_in_ms:Math.round(clamp(s.audio_fade_in_ms,0,Math.min(5000,duration-50),0)),
    audio_fade_out_ms:Math.round(clamp(s.audio_fade_out_ms,0,Math.min(5000,duration-50),0)),
    keyframe_enabled:kfEnabled,
    keyframe_zoom_start:Number(clamp(s.keyframe_zoom_start,1,2.5,1).toFixed(3)),
    keyframe_zoom_end:Number(clamp(s.keyframe_zoom_end,1,2.5,1).toFixed(3)),
    keyframe_pan_x_start:Number(clamp(s.keyframe_pan_x_start,-1,1,0).toFixed(3)),
    keyframe_pan_x_end:Number(clamp(s.keyframe_pan_x_end,-1,1,0).toFixed(3)),
    keyframe_pan_y_start:Number(clamp(s.keyframe_pan_y_start,-1,1,0).toFixed(3)),
    keyframe_pan_y_end:Number(clamp(s.keyframe_pan_y_end,-1,1,0).toFixed(3)),
    keyframe_easing:CUT_KEYFRAME_EASINGS.has(String(s.keyframe_easing||""))?String(s.keyframe_easing):"linear",
    visual_keyframes:sanitizeVisualKeyframes(s.visual_keyframes,{
      zoom_start:clamp(s.keyframe_zoom_start,1,2.5,1),
      zoom_end:clamp(s.keyframe_zoom_end,1,2.5,1),
      pan_x_start:clamp(s.keyframe_pan_x_start,-1,1,0),
      pan_x_end:clamp(s.keyframe_pan_x_end,-1,1,0),
      pan_y_start:clamp(s.keyframe_pan_y_start,-1,1,0),
      pan_y_end:clamp(s.keyframe_pan_y_end,-1,1,0),
      easing:CUT_KEYFRAME_EASINGS.has(String(s.keyframe_easing||""))?String(s.keyframe_easing):"linear"
    })
  };
}

function publicCutProject(row,clipCount=0){
  if(!row)return null;
  return{
    id:String(row.id),creator_id:String(row.creator_id),title:String(row.title||"Cut Projekt"),
    status:String(row.status||"draft"),format:String(row.format||"vertical"),notes:String(row.notes||""),
    source_name:String(row.source_name||""),export_preset:row.export_preset||{},
    clip_count:Number(row.clip_count??clipCount??0),created_at:row.created_at||null,updated_at:row.updated_at||null
  };
}

function publicCutClip(row){
  if(!row)return null;
  return{
    id:String(row.id),project_id:String(row.project_id),creator_id:String(row.creator_id),
    label:String(row.label||"Clip"),in_ms:Number(row.in_ms||0),out_ms:Number(row.out_ms||0),
    caption:String(row.caption||""),selected:row.selected!==false,sort_order:Number(row.sort_order||0),
    caption_enabled:row.caption_enabled===true,caption_position:String(row.caption_position||"bottom"),
    caption_size:Number(row.caption_size||52),caption_style:String(row.caption_style||"box"),
    audio_gain_db:Number(row.audio_gain_db||0),audio_fade_in_ms:Number(row.audio_fade_in_ms||0),
    audio_fade_out_ms:Number(row.audio_fade_out_ms||0),
    keyframe_enabled:row.keyframe_enabled===true,
    keyframe_zoom_start:Number(row.keyframe_zoom_start||1),keyframe_zoom_end:Number(row.keyframe_zoom_end||1),
    keyframe_pan_x_start:Number(row.keyframe_pan_x_start||0),keyframe_pan_x_end:Number(row.keyframe_pan_x_end||0),
    keyframe_pan_y_start:Number(row.keyframe_pan_y_start||0),keyframe_pan_y_end:Number(row.keyframe_pan_y_end||0),
    keyframe_easing:String(row.keyframe_easing||"linear"),
    visual_keyframes:Array.isArray(row.visual_keyframes)?row.visual_keyframes:[],
    created_at:row.created_at||null,updated_at:row.updated_at||null
  };
}

module.exports={
  CUT_FORMATS,CUT_STATUSES,CUT_EXPORT_MODES,CUT_CAPTION_POSITIONS,CUT_CAPTION_STYLES,
  CUT_TRANSITIONS,CUT_ENCODERS,CUT_KEYFRAME_EASINGS,
  sanitizeVisualKeyframes,sanitizeSfxTracks,sanitizeExtraAudioTracks,sanitizeSourceTracks,
  sanitizeCutProject,sanitizeCutClip,publicCutProject,publicCutClip
};
