"use strict";

const PLAN_ORDER=Object.freeze(["free","creator","pro"]);

const PLAN_CATALOG=Object.freeze({
  free:{
    key:"free",label:"FREE",product_name:"Starter",price_eur_monthly:0,price_status:"active",
    description:"Basis für Creator Account, TikTok Profil und erste Cloud-Widgets.",
    entitlements:{
      dashboard:true,account:true,editor:true,widget_studio:true,tiktok:true,launcher:true,device_link:true,scene_studio:true,
      live_bridge:false,live_widgets:false,alerts:false,auto_thanks:false,local_output:false,stream_deck:false,
      cut_studio:false,games:false,nexus:false,audio_studio:false,twitch:false,obs:false,advanced_output:false,custom_branding:false,
      max_widgets:2,max_scenes:1,max_stream_deck_buttons:0,max_active_devices:1,max_cut_projects:0,max_cut_clips_per_project:0,max_game_rules:0,max_pending_cut_jobs:0,
      themes:["cfs"],widget_templates:["cfs-standard","minimal"],output_profiles:["obs","tiktok_vertical","landscape"]
    }
  },
  creator:{
    key:"creator",label:"CREATOR",product_name:"Creator",price_eur_monthly:6.99,price_status:"planned",
    description:"LIVE-Werkzeuge, Alerts, AutoThanks, Local Output und Creator Tools.",
    entitlements:{
      dashboard:true,account:true,editor:true,widget_studio:true,tiktok:true,launcher:true,device_link:true,scene_studio:true,
      live_bridge:true,live_widgets:true,alerts:true,auto_thanks:true,local_output:true,stream_deck:true,
      cut_studio:true,games:true,nexus:false,audio_studio:false,twitch:false,obs:false,advanced_output:false,custom_branding:false,
      max_widgets:6,max_scenes:4,max_stream_deck_buttons:8,max_active_devices:3,max_cut_projects:5,max_cut_clips_per_project:20,max_game_rules:8,max_pending_cut_jobs:10,
      themes:["cfs","neon","ice"],widget_templates:["cfs-standard","minimal","neon","glass","compact","wide"],output_profiles:["obs","tiktok_vertical","landscape"]
    }
  },
  pro:{
    key:"pro",label:"PRO",product_name:"Pro",price_eur_monthly:12.99,price_status:"planned",
    description:"Komplette Creator Suite mit maximalen Limits und Pro-Erweiterungen.",
    entitlements:{
      dashboard:true,account:true,editor:true,widget_studio:true,tiktok:true,launcher:true,device_link:true,scene_studio:true,
      live_bridge:true,live_widgets:true,alerts:true,auto_thanks:true,local_output:true,stream_deck:true,
      cut_studio:true,games:true,nexus:true,audio_studio:true,twitch:true,obs:true,advanced_output:true,custom_branding:true,
      max_widgets:12,max_scenes:12,max_stream_deck_buttons:12,max_active_devices:5,max_cut_projects:25,max_cut_clips_per_project:100,max_game_rules:24,max_pending_cut_jobs:50,
      themes:["cfs","neon","ice","void"],widget_templates:["cfs-standard","minimal","neon","glass","compact","wide","blank"],output_profiles:["obs","tiktok_vertical","landscape"]
    }
  }
});

const BETA_GRANTS=Object.freeze({
  live_bridge:true,live_widgets:true,alerts:true,auto_thanks:true,local_output:true,stream_deck:true,
  cut_studio:true,games:true,advanced_output:true,custom_branding:true,
  max_widgets:12,max_scenes:12,max_stream_deck_buttons:12,max_active_devices:5,max_cut_projects:25,max_cut_clips_per_project:100,max_game_rules:24,max_pending_cut_jobs:50,
  themes:["cfs","neon","ice","void"],widget_templates:["cfs-standard","minimal","neon","glass","compact","wide","blank"],output_profiles:["obs","tiktok_vertical","landscape"]
});

const TEMPLATE_MINIMUM_PLAN=Object.freeze({
  "cfs-standard":"free","minimal":"free","neon":"creator","glass":"creator","compact":"creator","wide":"creator","blank":"pro"
});

function normalizePlan(value){
  const key=String(value||"free").trim().toLowerCase();
  return PLAN_ORDER.includes(key)?key:"free";
}
function planRank(value){return PLAN_ORDER.indexOf(normalizePlan(value));}
function cloneValue(value){return Array.isArray(value)?[...value]:value;}
function basePlanEntitlements(value){
  const source=PLAN_CATALOG[normalizePlan(value)].entitlements;
  return Object.fromEntries(Object.entries(source).map(([key,val])=>[key,cloneValue(val)]));
}
function mergeUnique(a,b){return [...new Set([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])])];}
function resolveCreatorEntitlements(value,{betaActive=false}={}){
  const plan=normalizePlan(value),base=basePlanEntitlements(plan),effective={...base};
  if(betaActive){
    for(const [key,val] of Object.entries(BETA_GRANTS)){
      if(Array.isArray(val))effective[key]=mergeUnique(effective[key],val);
      else if(typeof val==="number")effective[key]=Math.max(Number(effective[key]||0),val);
      else if(typeof val==="boolean")effective[key]=Boolean(effective[key])||val;
      else effective[key]=val;
    }
  }
  effective.plan=plan;
  effective.beta_active=Boolean(betaActive);
  effective.access_source=betaActive?"plan_plus_beta":"plan";
  return effective;
}
function minimumPlanForTemplate(templateKey){return TEMPLATE_MINIMUM_PLAN[String(templateKey||"")]||"free";}
function templateAllowed(templateKey,entitlements={}){return Array.isArray(entitlements.widget_templates)&&entitlements.widget_templates.includes(String(templateKey||""));}
function publicPlanCatalog(){
  return PLAN_ORDER.map(key=>{const plan=PLAN_CATALOG[key];return {key:plan.key,label:plan.label,product_name:plan.product_name,price_eur_monthly:plan.price_eur_monthly,price_status:plan.price_status,description:plan.description,entitlements:basePlanEntitlements(key)};});
}

module.exports={PLAN_ORDER,PLAN_CATALOG,BETA_GRANTS,TEMPLATE_MINIMUM_PLAN,normalizePlan,planRank,basePlanEntitlements,resolveCreatorEntitlements,minimumPlanForTemplate,templateAllowed,publicPlanCatalog};
