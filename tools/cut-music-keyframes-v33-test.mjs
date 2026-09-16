import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeCutProject,sanitizeCutClip}=require("../lib/creator-cut-studio.js");
const {buildCutJobManifest}=require("../lib/creator-cut-jobs.js");

const project=sanitizeCutProject({title:"V33",format:"vertical",export_preset:{mode:"both",music_enabled:true,music_name:"beat.mp3",music_gain_db:-99,music_start_ms:1234,music_loop:false,music_fade_in_ms:99999,music_fade_out_ms:500,transition:"fade"}});
if(!project.export_preset.music_enabled||project.export_preset.music_name!=="beat.mp3")throw new Error("music meta");
if(project.export_preset.music_gain_db!==-36||project.export_preset.music_fade_in_ms!==10000||project.export_preset.music_loop!==false)throw new Error("music sanitize");

const clip=sanitizeCutClip({in_ms:0,out_ms:2000,keyframe_enabled:true,keyframe_zoom_start:.5,keyframe_zoom_end:99,keyframe_pan_x_start:-9,keyframe_pan_x_end:.4,keyframe_pan_y_start:.2,keyframe_pan_y_end:9,keyframe_easing:"ease_in_out"});
if(!clip.keyframe_enabled||clip.keyframe_zoom_start!==1||clip.keyframe_zoom_end!==2.5)throw new Error("zoom sanitize");
if(clip.keyframe_pan_x_start!==-1||clip.keyframe_pan_y_end!==1||clip.keyframe_easing!=="ease_in_out")throw new Error("pan sanitize");

const manifest=buildCutJobManifest({id:"p33",...project},[{id:"c33",...clip}]);
if(manifest.schema<4)throw new Error("schema 4+");
if(!manifest.export_preset.music_enabled||manifest.export_preset.music_name!=="beat.mp3")throw new Error("manifest music");
if(!manifest.clips[0].keyframe_enabled||manifest.clips[0].keyframe_zoom_end!==2.5)throw new Error("manifest keyframe");

console.log(JSON.stringify({ok:true,schema:4,music:true,keyframes:true}));
