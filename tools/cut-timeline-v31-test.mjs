import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeCutProject,sanitizeCutClip}=require("../lib/creator-cut-studio.js");
const {buildCutJobManifest}=require("../lib/creator-cut-jobs.js");

const project=sanitizeCutProject({title:"Timeline",format:"vertical",export_preset:{fps:60,quality:"high",mode:"both"}});
if(project.export_preset.mode!=="both"||project.export_preset.width!==1080||project.export_preset.height!==1920)throw new Error("project mode");

const a={id:"a",...sanitizeCutClip({label:"Second",in_ms:2000,out_ms:3500,sort_order:1,caption:"Hallo Welt",caption_enabled:true,caption_position:"top",caption_size:200,caption_style:"outline"})};
const b={id:"b",...sanitizeCutClip({label:"First",in_ms:0,out_ms:1000,sort_order:0,caption:"Start",caption_enabled:true,caption_position:"bottom",caption_size:42,caption_style:"box"})};
if(a.caption_size!==120||a.caption_position!=="top"||a.caption_style!=="outline")throw new Error("caption sanitize");

const manifest=buildCutJobManifest({id:"p1",...project},[a,b]);
if(manifest.schema<2||manifest.export_preset.mode!=="both")throw new Error("manifest schema");
if(manifest.clips.map(c=>c.clip_id).join(",")!=="b,a")throw new Error("timeline order");
if(!manifest.clips[1].caption_enabled||manifest.clips[1].caption_size!==120)throw new Error("caption manifest");

console.log(JSON.stringify({ok:true,schema:manifest.schema,mode:manifest.export_preset.mode,order:manifest.clips.map(c=>c.clip_id),captions:true}));
