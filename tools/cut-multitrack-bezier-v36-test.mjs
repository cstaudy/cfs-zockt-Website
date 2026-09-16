import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeCutProject,sanitizeCutClip}=require("../lib/creator-cut-studio.js");
const {buildCutJobManifest}=require("../lib/creator-cut-jobs.js");

const project=sanitizeCutProject({title:"V36",export_preset:{
  music_enabled:true,music_name:"primary.mp3",
  music_tracks:[
    {id:"m2!",name:"Music 2",gain_db:99,start_ms:500,loop:false,mute:false,solo:true,pan:-9},
    {id:"m3",name:"Music 3",gain_db:-99},
    {id:"m4",name:"Music 4"},
    {id:"m5",name:"Too Many"}
  ],
  voiceover_enabled:true,voiceover_name:"voice1.wav",
  voice_tracks:[
    {id:"v2",name:"Voice 2",gain_db:99,start_ms:800,pan:9},
    {id:"v3",name:"Voice 3"},
    {id:"v4",name:"Voice 4"},
    {id:"v5",name:"Too Many"}
  ]
}});
if(project.export_preset.music_tracks.length!==3||project.export_preset.voice_tracks.length!==3)throw new Error("track cap");
if(project.export_preset.music_tracks[0].id!=="m2"||project.export_preset.music_tracks[0].gain_db!==12||project.export_preset.music_tracks[0].pan!==-1)throw new Error("music sanitize");
if(project.export_preset.voice_tracks[0].gain_db!==12||project.export_preset.voice_tracks[0].pan!==1)throw new Error("voice sanitize");

const clip=sanitizeCutClip({in_ms:0,out_ms:2000,keyframe_enabled:true,visual_keyframes:[
 {at:0,zoom:1,pan_x:0,pan_y:0,rotation:0,opacity:1,easing:"linear"},
 {at:.55,zoom:1.5,pan_x:.25,pan_y:-.2,rotation:15,opacity:.6,easing:"bezier",bezier_y1:-4,bezier_y2:9},
 {at:1,zoom:1.1,pan_x:0,pan_y:0,rotation:0,opacity:1,easing:"ease_in_out"}
]});
if(clip.visual_keyframes[1].easing!=="bezier"||clip.visual_keyframes[1].bezier_y1!==0||clip.visual_keyframes[1].bezier_y2!==1)throw new Error("bezier sanitize");

const manifest=buildCutJobManifest({id:"p36",...project},[{id:"c36",...clip}]);
if(manifest.schema!==7)throw new Error("schema7");
if(manifest.export_preset.music_tracks.length!==3||manifest.export_preset.voice_tracks.length!==3)throw new Error("manifest tracks");
if(manifest.clips[0].visual_keyframes[1].easing!=="bezier")throw new Error("manifest bezier");

console.log(JSON.stringify({ok:true,schema:7,music_tracks:4,voice_tracks:4,bezier:true}));
