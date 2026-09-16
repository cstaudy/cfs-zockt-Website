import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeCutProject,sanitizeCutClip}=require("../lib/creator-cut-studio.js");
const {buildCutJobManifest}=require("../lib/creator-cut-jobs.js");

const project=sanitizeCutProject({title:"V34",export_preset:{mode:"both",music_enabled:true,voiceover_enabled:true,voiceover_name:"voice.wav",voiceover_gain_db:99,voiceover_start_ms:1200,ducking_enabled:true,ducking_ratio:99,sfx_tracks:[
 {id:"boom!",name:"Boom",start_ms:500,gain_db:99,fade_in_ms:50,fade_out_ms:100},
 {id:"ding",name:"Ding",enabled:false}
]}});
if(!project.export_preset.voiceover_enabled||project.export_preset.voiceover_gain_db!==12||project.export_preset.ducking_ratio!==20)throw new Error("voice sanitize");
if(project.export_preset.sfx_tracks.length!==2||project.export_preset.sfx_tracks[0].id!=="boom")throw new Error("sfx sanitize");

const clip=sanitizeCutClip({in_ms:0,out_ms:3000,keyframe_enabled:true,visual_keyframes:[
 {at:.8,zoom:1.8,pan_x:.4,pan_y:-.2,easing:"ease_in_out"},
 {at:0,zoom:1,pan_x:-.4,pan_y:0,easing:"linear"},
 {at:.35,zoom:1.3,pan_x:0,pan_y:.2,easing:"linear"},
 {at:1,zoom:1.1,pan_x:.2,pan_y:0,easing:"linear"}
]});
if(clip.visual_keyframes.length!==4||clip.visual_keyframes[0].at!==0||clip.visual_keyframes[2].at!==.8)throw new Error("free keyframe sort");

const manifest=buildCutJobManifest({id:"p34",...project},[{id:"c34",...clip}]);
if(manifest.schema<5)throw new Error("schema5+");
if(manifest.clips[0].visual_keyframes.length!==4)throw new Error("keyframe manifest");
if(!manifest.export_preset.voiceover_enabled||manifest.export_preset.sfx_tracks.length!==2)throw new Error("audio manifest");

console.log(JSON.stringify({ok:true,schema:5,keyframe_points:4,voice:true,sfx:2,ducking:true}));
