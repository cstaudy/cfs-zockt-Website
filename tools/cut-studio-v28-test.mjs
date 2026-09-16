import {createRequire} from "node:module";const require=createRequire(import.meta.url);const {sanitizeCutProject,sanitizeCutClip,CUT_FORMATS}=require("../lib/creator-cut-studio.js");
const p=sanitizeCutProject({title:" Test ",format:"vertical",status:"ready",export_preset:{fps:120,quality:"bad"}});if(p.title!=="Test"||p.status!=="ready"||p.export_preset.width!==1080||p.export_preset.height!==1920||p.export_preset.fps!==60||p.export_preset.quality!=="high")throw new Error("project");
const c=sanitizeCutClip({label:"Clip 1",in_ms:5000,out_ms:1000});if(c.in_ms!==5000||c.out_ms<5100)throw new Error("clip range");
if(Object.keys(CUT_FORMATS).length!==3)throw new Error("formats");
console.log(JSON.stringify({ok:true,formats:Object.keys(CUT_FORMATS),clip_duration:c.out_ms-c.in_ms}));