"use strict";

const CUT_JOB_STATUSES=Object.freeze(["queued","claimed","processing","completed","failed","canceled"]);

function text(value,max=240,fallback=""){
  const out=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  return(out||fallback).slice(0,max);
}
function sanitizeZeroCrossPoint(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  return{
    original_ms:Math.max(0,Math.min(24*60*60*1000,Math.round(Number(s.original_ms||0)))),
    suggested_ms:Math.max(0,Math.min(24*60*60*1000,Math.round(Number(s.suggested_ms||0)))),
    delta_ms:Math.max(-50,Math.min(50,Math.round(Number(s.delta_ms||0)))),
    level_dbfs:Math.max(-96,Math.min(0,Number(Number(s.level_dbfs??-96).toFixed(1)))),
    crossing:s.crossing===true
  };
}
function sanitizeCutJobResult(input={}){
  const s=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const out={
    output_name:text(s.output_name,240,""),
    duration_ms:Math.max(0,Math.round(Number(s.duration_ms||0))),
    bytes:Math.max(0,Math.round(Number(s.bytes||0))),
    codec:text(s.codec,80,""),
    note:text(s.note,1200,"")
  };
  if(s.zero_cross&&typeof s.zero_cross==="object"&&!Array.isArray(s.zero_cross))out.zero_cross={
    radius_ms:Math.max(5,Math.min(50,Math.round(Number(s.zero_cross.radius_ms||20)))),
    sample_rate:Math.max(8000,Math.min(96000,Math.round(Number(s.zero_cross.sample_rate||48000)))),
    analyzed_at:text(s.zero_cross.analyzed_at,80,""),
    a:sanitizeZeroCrossPoint(s.zero_cross.a),
    b:sanitizeZeroCrossPoint(s.zero_cross.b)
  };
  return out;
}
function buildCutJobManifest(project={},clips=[]){
  const preset=project.export_preset&&typeof project.export_preset==="object"?project.export_preset:{};
  const mode=["clips","reel","both"].includes(String(preset.mode||""))?String(preset.mode):"clips";
  const transition=["cut","fade","dissolve","wipeleft","wiperight","slideleft","slideright"].includes(String(preset.transition||""))?String(preset.transition):"cut";
  const encoder=["software","nvenc","qsv","amf"].includes(String(preset.encoder||""))?String(preset.encoder):"software";
  const list=(Array.isArray(clips)?clips:[])
    .filter(c=>c?.selected!==false)
    .slice()
    .sort((a,b)=>Number(a?.sort_order||0)-Number(b?.sort_order||0))
    .map(c=>({
      clip_id:String(c.id||""),
      label:text(c.label,120,"Clip"),
      in_ms:Math.max(0,Math.round(Number(c.in_ms||0))),
      out_ms:Math.max(0,Math.round(Number(c.out_ms||0))),
      caption:text(c.caption,3000,""),
      sort_order:Math.max(0,Math.round(Number(c.sort_order||0))),
      caption_enabled:c.caption_enabled===true,
      caption_position:["top","center","bottom"].includes(String(c.caption_position||""))?String(c.caption_position):"bottom",
      caption_size:Math.max(18,Math.min(120,Math.round(Number(c.caption_size||52)))),
      caption_style:["box","outline","clean"].includes(String(c.caption_style||""))?String(c.caption_style):"box",
      audio_gain_db:Math.max(-24,Math.min(12,Number(c.audio_gain_db||0))),
      audio_fade_in_ms:Math.max(0,Math.min(5000,Math.round(Number(c.audio_fade_in_ms||0)))),
      audio_fade_out_ms:Math.max(0,Math.min(5000,Math.round(Number(c.audio_fade_out_ms||0)))),
      keyframe_enabled:c.keyframe_enabled===true,
      keyframe_zoom_start:Math.max(1,Math.min(2.5,Number(c.keyframe_zoom_start||1))),
      keyframe_zoom_end:Math.max(1,Math.min(2.5,Number(c.keyframe_zoom_end||1))),
      keyframe_pan_x_start:Math.max(-1,Math.min(1,Number(c.keyframe_pan_x_start||0))),
      keyframe_pan_x_end:Math.max(-1,Math.min(1,Number(c.keyframe_pan_x_end||0))),
      keyframe_pan_y_start:Math.max(-1,Math.min(1,Number(c.keyframe_pan_y_start||0))),
      keyframe_pan_y_end:Math.max(-1,Math.min(1,Number(c.keyframe_pan_y_end||0))),
      keyframe_easing:["linear","ease_in_out"].includes(String(c.keyframe_easing||""))?String(c.keyframe_easing):"linear",
      visual_keyframes:(Array.isArray(c.visual_keyframes)?c.visual_keyframes:[]).slice(0,8).map(p=>({
        at:Math.max(0,Math.min(1,Number(p.at||0))),
        zoom:Math.max(1,Math.min(2.5,Number(p.zoom||1))),
        pan_x:Math.max(-1,Math.min(1,Number(p.pan_x||0))),
        pan_y:Math.max(-1,Math.min(1,Number(p.pan_y||0))),
        rotation:Math.max(-180,Math.min(180,Number(p.rotation||0))),
        opacity:Math.max(0,Math.min(1,Number(p.opacity??1))),
        easing:["linear","ease_in_out","bezier"].includes(String(p.easing||""))?String(p.easing):"linear",
        bezier_y1:Math.max(0,Math.min(1,Number(p.bezier_y1??.25))),
        bezier_y2:Math.max(0,Math.min(1,Number(p.bezier_y2??.75)))
      })).sort((a,b)=>a.at-b.at)
    }))
    .filter(c=>c.clip_id&&c.out_ms>c.in_ms);

  return{
    schema:7,
    project_id:String(project.id||""),
    project_title:text(project.title,120,"Cut Projekt"),
    source_name:text(project.source_name,240,""),
    format:text(project.format,24,"vertical"),
    export_preset:{
      ...preset,
      mode,
      transition,
      transition_ms:transition==="cut"?0:Math.max(100,Math.min(1500,Math.round(Number(preset.transition_ms||350)))),
      encoder,
      audio_normalize:preset.audio_normalize===true,
      audio_bitrate_kbps:Math.max(96,Math.min(320,Math.round(Number(preset.audio_bitrate_kbps||160)))),
      source_audio_gain_db:Math.max(-24,Math.min(12,Number(preset.source_audio_gain_db||0))),
      source_audio_mute:preset.source_audio_mute===true,
      source_audio_solo:preset.source_audio_solo===true,
      source_audio_pan:Math.max(-1,Math.min(1,Number(preset.source_audio_pan||0))),
      source_tracks:(Array.isArray(preset.source_tracks)?preset.source_tracks:[]).slice(0,8).map((track,index)=>({
        key:text(track.key,64,`source_${index+1}`).replace(/[^a-zA-Z0-9_-]/g,""),
        label:text(track.label||track.title,80,`Audio ${index+1}`),
        stream_index:Math.max(0,Math.min(15,Math.round(Number(track.stream_index??track.streamIndex??index)))),
        enabled:track.enabled!==false,
        gain_db:Math.max(-36,Math.min(12,Number(track.gain_db||0))),
        mute:track.mute===true,
        solo:track.solo===true,
        pan:Math.max(-1,Math.min(1,Number(track.pan||0)))
      })),
      source_handoff_id:text(preset.source_handoff_id,120,""),
      audition_playhead_ms:Math.max(0,Math.min(24*60*60*1000,Math.round(Number(preset.audition_playhead_ms||0)))),
      audition_a_ms:Math.max(0,Math.min(24*60*60*1000,Math.round(Number(preset.audition_a_ms||0)))),
      audition_b_ms:Math.max(0,Math.min(24*60*60*1000,Math.round(Number(preset.audition_b_ms||0)))),
      audition_zero_cross_radius_ms:Math.max(5,Math.min(50,Math.round(Number(preset.audition_zero_cross_radius_ms||20)))),
      music_enabled:preset.music_enabled===true,
      music_name:text(preset.music_name,240,""),
      music_gain_db:Math.max(-36,Math.min(6,Number(preset.music_gain_db??-18))),
      music_start_ms:Math.max(0,Math.round(Number(preset.music_start_ms||0))),
      music_loop:preset.music_loop!==false,
      music_fade_in_ms:Math.max(0,Math.min(10000,Math.round(Number(preset.music_fade_in_ms||800)))),
      music_fade_out_ms:Math.max(0,Math.min(10000,Math.round(Number(preset.music_fade_out_ms||1200)))),
      music_mute:preset.music_mute===true,
      music_solo:preset.music_solo===true,
      music_pan:Math.max(-1,Math.min(1,Number(preset.music_pan||0))),
      music_tracks:(Array.isArray(preset.music_tracks)?preset.music_tracks:[]).slice(0,3).map((track,index)=>({
        id:text(track.id,64,`music_${index+2}`).replace(/[^a-zA-Z0-9_-]/g,""),
        enabled:track.enabled!==false,
        name:text(track.name,240,`Musik ${index+2}`),
        start_ms:Math.max(0,Math.round(Number(track.start_ms||0))),
        gain_db:Math.max(-36,Math.min(12,Number(track.gain_db??-18))),
        fade_in_ms:Math.max(0,Math.min(10000,Math.round(Number(track.fade_in_ms||800)))),
        fade_out_ms:Math.max(0,Math.min(10000,Math.round(Number(track.fade_out_ms||1200)))),
        loop:track.loop!==false,
        mute:track.mute===true,
        solo:track.solo===true,
        pan:Math.max(-1,Math.min(1,Number(track.pan||0)))
      })),
      voiceover_enabled:preset.voiceover_enabled===true,
      voiceover_name:text(preset.voiceover_name,240,""),
      voiceover_gain_db:Math.max(-24,Math.min(12,Number(preset.voiceover_gain_db||0))),
      voiceover_start_ms:Math.max(0,Math.round(Number(preset.voiceover_start_ms||0))),
      voiceover_fade_in_ms:Math.max(0,Math.min(5000,Math.round(Number(preset.voiceover_fade_in_ms||100)))),
      voiceover_fade_out_ms:Math.max(0,Math.min(5000,Math.round(Number(preset.voiceover_fade_out_ms||300)))),
      voiceover_mute:preset.voiceover_mute===true,
      voiceover_solo:preset.voiceover_solo===true,
      voiceover_pan:Math.max(-1,Math.min(1,Number(preset.voiceover_pan||0))),
      voice_tracks:(Array.isArray(preset.voice_tracks)?preset.voice_tracks:[]).slice(0,3).map((track,index)=>({
        id:text(track.id,64,`voice_${index+2}`).replace(/[^a-zA-Z0-9_-]/g,""),
        enabled:track.enabled!==false,
        name:text(track.name,240,`Voice ${index+2}`),
        start_ms:Math.max(0,Math.round(Number(track.start_ms||0))),
        gain_db:Math.max(-24,Math.min(12,Number(track.gain_db||0))),
        fade_in_ms:Math.max(0,Math.min(5000,Math.round(Number(track.fade_in_ms||100)))),
        fade_out_ms:Math.max(0,Math.min(5000,Math.round(Number(track.fade_out_ms||300)))),
        loop:false,
        mute:track.mute===true,
        solo:track.solo===true,
        pan:Math.max(-1,Math.min(1,Number(track.pan||0)))
      })),
      ducking_enabled:preset.ducking_enabled===true,
      ducking_ratio:Math.max(2,Math.min(20,Number(preset.ducking_ratio||8))),
      sfx_tracks:(Array.isArray(preset.sfx_tracks)?preset.sfx_tracks:[]).slice(0,8).map((track,index)=>({
        id:text(track.id,64,`sfx_${index+1}`).replace(/[^a-zA-Z0-9_-]/g,""),
        enabled:track.enabled!==false,
        name:text(track.name,240,`SFX ${index+1}`),
        start_ms:Math.max(0,Math.round(Number(track.start_ms||0))),
        gain_db:Math.max(-36,Math.min(12,Number(track.gain_db??-6))),
        fade_in_ms:Math.max(0,Math.min(5000,Math.round(Number(track.fade_in_ms||0)))),
        fade_out_ms:Math.max(0,Math.min(5000,Math.round(Number(track.fade_out_ms||0)))),
        mute:track.mute===true,
        solo:track.solo===true,
        pan:Math.max(-1,Math.min(1,Number(track.pan||0)))
      }))
    },
    clips:list
  };
}
function publicCutJob(row){
  if(!row)return null;
  return{
    id:String(row.id),
    creator_id:String(row.creator_id),
    project_id:String(row.project_id),
    status:CUT_JOB_STATUSES.includes(String(row.status||""))?String(row.status):"queued",
    manifest:row.manifest&&typeof row.manifest==="object"?row.manifest:{},
    bridge_id:row.bridge_id?String(row.bridge_id):null,
    attempts:Number(row.attempts||0),
    result:row.result&&typeof row.result==="object"?row.result:{},
    error_message:String(row.error_message||""),
    requested_at:row.requested_at||null,
    claimed_at:row.claimed_at||null,
    started_at:row.started_at||null,
    completed_at:row.completed_at||null,
    updated_at:row.updated_at||null
  };
}
function canTransitionCutJob(from,to){
  const allowed={
    queued:new Set(["claimed","canceled"]),
    claimed:new Set(["processing","queued","failed","canceled"]),
    processing:new Set(["completed","failed","canceled"]),
    completed:new Set(),
    failed:new Set(["queued","canceled"]),
    canceled:new Set()
  };
  return Boolean(allowed[String(from||"")]?.has(String(to||"")));
}

module.exports={CUT_JOB_STATUSES,buildCutJobManifest,sanitizeCutJobResult,publicCutJob,canTransitionCutJob};
