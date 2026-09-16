import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeCutProject,sanitizeCutClip}=require("../lib/creator-cut-studio.js");
const {buildCutJobManifest}=require("../lib/creator-cut-jobs.js");

const project=sanitizeCutProject({title:"V35",export_preset:{
  source_audio_gain_db:99,source_audio_mute:true,source_audio_solo:true,source_audio_pan:-9,
  music_enabled:true,music_mute:false,music_solo:true,music_pan:9,
  voiceover_enabled:true,voiceover_mute:true,voiceover_solo:false,voiceover_pan:-.35,
  sfx_tracks:[{id:"hit",name:"Hit",gain_db:-3,mute:true,solo:true,pan:.75}]
}});
if(project.export_preset.source_audio_gain_db!==12||project.export_preset.source_audio_pan!==-1)throw new Error("source mixer sanitize");
if(!project.export_preset.music_solo||project.export_preset.music_pan!==1)throw new Error("music mixer sanitize");
if(!project.export_preset.voiceover_mute||project.export_preset.voiceover_pan!==-.35)throw new Error("voice mixer sanitize");
if(!project.export_preset.sfx_tracks[0].mute||!project.export_preset.sfx_tracks[0].solo||project.export_preset.sfx_tracks[0].pan!==.75)throw new Error("sfx mixer sanitize");

const clip=sanitizeCutClip({in_ms:0,out_ms:2500,keyframe_enabled:true,visual_keyframes:[
 {at:0,zoom:1,pan_x:0,pan_y:0,rotation:-999,opacity:-4,easing:"linear"},
 {at:.5,zoom:1.3,pan_x:.2,pan_y:-.1,rotation:45,opacity:.55,easing:"ease_in_out"},
 {at:1,zoom:1.1,pan_x:0,pan_y:0,rotation:999,opacity:4,easing:"linear"}
]});
if(clip.visual_keyframes[0].rotation!==-180||clip.visual_keyframes[0].opacity!==0)throw new Error("visual lower clamp");
if(clip.visual_keyframes[2].rotation!==180||clip.visual_keyframes[2].opacity!==1)throw new Error("visual upper clamp");

const manifest=buildCutJobManifest({id:"p35",...project},[{id:"c35",...clip}]);
if(manifest.schema<6)throw new Error("schema6+");
if(manifest.clips[0].visual_keyframes[1].rotation!==45||manifest.clips[0].visual_keyframes[1].opacity!==.55)throw new Error("visual manifest");
if(!manifest.export_preset.source_audio_solo||!manifest.export_preset.music_solo||manifest.export_preset.sfx_tracks[0].pan!==.75)throw new Error("mixer manifest");

console.log(JSON.stringify({ok:true,schema:6,rotation:true,opacity:true,mixer:true}));
