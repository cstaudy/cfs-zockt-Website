import {createRequire} from "node:module";const require=createRequire(import.meta.url);const {sanitizeGameProfile,sanitizeScoreAction,initialGameState,gamePublicToken,publicGameRuntime,gameSceneSource}=require("../lib/creator-games.js");
const p=sanitizeGameProfile({title:" Battle ",game_type:"bad",target_score:0,round_seconds:99999,team_a_name:"Blue",team_b_name:"Red"});if(p.game_type!=="chat_battle"||p.target_score!==1||p.round_seconds!==7200)throw new Error("profile sanitize");
const a=sanitizeScoreAction({team:"B",delta:5000});if(a.team!=="b"||a.delta!==1000)throw new Error("score sanitize");
const state=initialGameState(p);if(state.score_a!==0||state.target_score!==1)throw new Error("initial state");
const token=gamePublicToken();if(!token.startsWith("cfsg_"))throw new Error("token");
const runtime=publicGameRuntime({creator_id:"c1",public_token:token,status:"running",title:p.title,game_type:p.game_type,config:p,state,version:2},"https://cfs-zockt.de");if(!runtime.source_url.includes("/games/runtime.html#token=")||runtime.canvas.width!==900)throw new Error("runtime");
const scene=gameSceneSource(runtime);if(scene.id!=="game_runtime"||scene.widget_type!=="game_runtime"||scene.status!=="live")throw new Error("scene source");
console.log(JSON.stringify({ok:true,game_type:p.game_type,scene_layer:scene.id,canvas:runtime.canvas}));