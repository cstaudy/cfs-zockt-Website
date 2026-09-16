import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const R=require("../public/assets/js/cfs-widget-renderer.js");

const config={
 version:6,widgetType:"follower_goal",
 data:{metric:"profile.followers",eventType:""},
 canvas:{width:620,height:132,background:"transparent"},
 settings:{goal:250,offlineBehavior:"hold"},
 outputs:{
  obs:{enabled:true,anchor:"top-left",offsetX:0,offsetY:0,scale:1,safeArea:false},
  tiktok_vertical:{enabled:true,anchor:"top-center",offsetX:0,offsetY:180,scale:1,safeArea:true},
  landscape:{enabled:true,anchor:"bottom-center",offsetX:0,offsetY:-90,scale:1,safeArea:true}
 },
 elements:[
  {id:"title",type:"text",visible:true,position:{x:0,y:0},size:{width:300,height:30},rotation:0,opacity:1,zIndex:1,data:{text:"{{displayName}}"},style:{fontSize:20,fontWeight:800,color:"#fff",textAlign:"left"}},
  {id:"counter",type:"counter",visible:true,position:{x:0,y:40},size:{width:300,height:30},rotation:0,opacity:1,zIndex:2,data:{format:"{{current}} / {{target}}"},style:{fontSize:18,fontWeight:800,color:"#fff",textAlign:"left"}}
 ]
};

const payloadA={
 widget:{config,definition:{mode:"goal",metric:"profile.followers",source_kind:"profile"}},
 creator:{display_name:"Creator A"},
 data:{profile:{connected:true,display_name:"Creator A",avatar_url:"a.jpg",followers:156,likes_total:5000},live:{},bridge:{}}
};
const payloadB={
 widget:{config,definition:{mode:"goal",metric:"profile.followers",source_kind:"profile"}},
 creator:{display_name:"Creator B"},
 data:{profile:{connected:true,display_name:"Creator B",avatar_url:"b.jpg",followers:912,likes_total:22000},live:{},bridge:{}}
};
const a=R.runtimeData(payloadA),b=R.runtimeData(payloadB);
if(a.current!==156||b.current!==912)throw new Error("Creator data isolation failed");
if(a.displayName===b.displayName)throw new Error("Creator names were mixed");
const htmlA=R.renderElements(config,a,{prefix:"cfs-render"});
if(!htmlA.includes("156 / 250")||!htmlA.includes("Creator A"))throw new Error("Renderer binding failed");

const obs=R.profileScene(config,"obs");
const vertical=R.profileScene(config,"tiktok_vertical");
const landscape=R.profileScene(config,"landscape");
if(obs.width!==620||obs.height!==132)throw new Error("OBS intrinsic size failed");
if(vertical.width!==1080||vertical.height!==1920)throw new Error("TikTok profile dimensions failed");
if(landscape.width!==1920||landscape.height!==1080)throw new Error("Landscape dimensions failed");
if(vertical.placement.top<=0)throw new Error("TikTok placement missing");

console.log(JSON.stringify({ok:true,creatorA:a.current,creatorB:b.current,vertical:vertical.placement,landscape:landscape.placement}));
