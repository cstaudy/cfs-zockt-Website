import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeCutProject,sanitizeCutClip}=require("../lib/creator-cut-studio.js");
const {buildCutJobManifest}=require("../lib/creator-cut-jobs.js");

const project=sanitizeCutProject({title:"V32",format:"landscape",export_preset:{mode:"both",transition:"dissolve",transition_ms:9999,encoder:"nvenc",audio_normalize:true,audio_bitrate_kbps:999}});
if(project.export_preset.transition!=="dissolve"||project.export_preset.transition_ms!==1500)throw new Error("transition sanitize");
if(project.export_preset.encoder!=="nvenc"||project.export_preset.audio_bitrate_kbps!==320||!project.export_preset.audio_normalize)throw new Error("project audio/gpu");

const clip=sanitizeCutClip({in_ms:1000,out_ms:3000,audio_gain_db:99,audio_fade_in_ms:9999,audio_fade_out_ms:600,caption:"Test"});
if(clip.audio_gain_db!==12||clip.audio_fade_in_ms!==1950||clip.audio_fade_out_ms!==600)throw new Error("clip audio sanitize");

const manifest=buildCutJobManifest({id:"p32",...project},[{id:"c32",...clip}]);
if(manifest.schema<3)throw new Error("schema 3+");
if(manifest.export_preset.transition!=="dissolve"||manifest.export_preset.encoder!=="nvenc")throw new Error("manifest project options");
if(manifest.clips[0].audio_gain_db!==12||manifest.clips[0].audio_fade_out_ms!==600)throw new Error("manifest audio");

console.log(JSON.stringify({ok:true,schema:3,transition:"dissolve",encoder:"nvenc",audio:true}));
