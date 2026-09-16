"use strict";

const fs=require("node:fs");
const path=require("node:path");

const MAX_BUTTONS=12;
const BUTTON_COLORS=new Set(["auto","cyan","blue","green","orange","red","white"]);
const PROFILE_IDS=new Set(["live","gaming","obs","creator"]);

const ACTION_CATALOG=Object.freeze([
  {key:"live_toggle",label:"LIVE Start / Stop",icon:"●",target_kind:"none"},
  {key:"scene_next",label:"Nächste Scene",icon:"↻",target_kind:"none"},
  {key:"scene_start",label:"Bestimmte Scene starten",icon:"◈",target_kind:"scene"},
  {key:"output_stop",label:"Local Output stoppen",icon:"■",target_kind:"none"},
  {key:"output_reload",label:"Local Output neu laden",icon:"⟳",target_kind:"none"},
  {key:"alert_follow",label:"Follow Alert testen",icon:"+1",target_kind:"none"},
  {key:"alert_gift",label:"Gift Alert testen",icon:"◆",target_kind:"none"},
  {key:"alert_share",label:"Share Alert testen",icon:"↗",target_kind:"none"},
  {key:"autothanks_toggle",label:"AutoThanks An / Aus",icon:"♫",target_kind:"none"},
  {key:"widget_toggle",label:"Widget lokal An / Aus",icon:"▣",target_kind:"widget",widget_filter:"all"},
  {key:"counter_plus_1",label:"Counter +1",icon:"+1",target_kind:"widget",widget_filter:"manual_counter"},
  {key:"counter_minus_1",label:"Counter -1",icon:"-1",target_kind:"widget",widget_filter:"manual_counter"},
  {key:"counter_plus_5",label:"Counter +5",icon:"+5",target_kind:"widget",widget_filter:"manual_counter"},
  {key:"counter_reset",label:"Counter zurücksetzen",icon:"↺",target_kind:"widget",widget_filter:"manual_counter"},
  {key:"timer_toggle",label:"Timer Start / Pause",icon:"▶",target_kind:"widget",widget_filter:"manual_timer"},
  {key:"timer_reset",label:"Timer zurücksetzen",icon:"↺",target_kind:"widget",widget_filter:"manual_timer"},
  {key:"timer_plus_60",label:"Timer +1 Minute",icon:"+1m",target_kind:"widget",widget_filter:"manual_timer"},
  {key:"timer_minus_60",label:"Timer -1 Minute",icon:"-1m",target_kind:"widget",widget_filter:"manual_timer"},
  {key:"refresh_library",label:"Creator Daten aktualisieren",icon:"↻",target_kind:"none"},
  {key:"open_dashboard",label:"Dashboard öffnen",icon:"⌂",target_kind:"none"},
  {key:"open_widget_studio",label:"Widget Studio öffnen",icon:"W",target_kind:"none"},
  {key:"open_scene_studio",label:"Scene Studio öffnen",icon:"S",target_kind:"none"},
  {key:"game_toggle",label:"Game Start / Stop",icon:"G",target_kind:"none"},
  {key:"game_score_a",label:"Game Team A +1",icon:"A+",target_kind:"none"},
  {key:"game_score_b",label:"Game Team B +1",icon:"B+",target_kind:"none"},
  {key:"game_reset",label:"Game Runde resetten",icon:"↺",target_kind:"none"},
  {key:"open_games",label:"Games öffnen",icon:"G",target_kind:"none"},
  {key:"open_cut_project",label:"Cut-Projekt öffnen",icon:"C",target_kind:"cut_project"},
  {key:"open_cut_studio",label:"Cut Studio öffnen",icon:"C",target_kind:"none"},
  {key:"none",label:"Nicht belegt",icon:"·",target_kind:"none"}
]);

const ACTION_MAP=new Map(ACTION_CATALOG.map(item=>[item.key,item]));

// Legacy/Default-Seite. Bleibt absichtlich kompatibel mit dem bisherigen 12-Tasten-Layout.
const DEFAULT_BUTTONS=Object.freeze([
  {id:"slot_1",label:"LIVE",action:"live_toggle",target:""},
  {id:"slot_2",label:"NÄCHSTE SCENE",action:"scene_next",target:""},
  {id:"slot_3",label:"OUTPUT STOP",action:"output_stop",target:""},
  {id:"slot_4",label:"FOLLOW TEST",action:"alert_follow",target:""},
  {id:"slot_5",label:"GIFT TEST",action:"alert_gift",target:""},
  {id:"slot_6",label:"SHARE TEST",action:"alert_share",target:""},
  {id:"slot_7",label:"AUTOTHANKS",action:"autothanks_toggle",target:""},
  {id:"slot_8",label:"OUTPUT RELOAD",action:"output_reload",target:""},
  {id:"slot_9",label:"WIDGET STUDIO",action:"open_widget_studio",target:""},
  {id:"slot_10",label:"SCENE STUDIO",action:"open_scene_studio",target:""},
  {id:"slot_11",label:"GAME START/STOP",action:"game_toggle",target:""},
  {id:"slot_12",label:"CUT STUDIO",action:"open_cut_studio",target:""}
]);

const PROFILE_CATALOG=Object.freeze([
  {id:"live",label:"TikTok LIVE",short:"LIVE",description:"LIVE, Alerts, AutoThanks und Creator-Tools"},
  {id:"gaming",label:"Gaming",short:"GAME",description:"Counter, Timer, Game-Steuerung und Szenen"},
  {id:"obs",label:"OBS / Output",short:"OBS",description:"Szenen, Output, Widgets und Tests"},
  {id:"creator",label:"Creator Tools",short:"TOOLS",description:"Dashboard, Studios, Sync und Tools"}
]);

const PROFILE_DEFAULTS=Object.freeze({
  live:DEFAULT_BUTTONS,
  gaming:Object.freeze([
    {label:"LIVE",action:"live_toggle"},
    {label:"SIEG +1",action:"counter_plus_1"},
    {label:"TOD +1",action:"counter_plus_1"},
    {label:"TIMER ▶ / ‖",action:"timer_toggle"},
    {label:"TIMER RESET",action:"timer_reset"},
    {label:"GAME START/STOP",action:"game_toggle"},
    {label:"TEAM A +1",action:"game_score_a"},
    {label:"TEAM B +1",action:"game_score_b"},
    {label:"RUNDE RESET",action:"game_reset"},
    {label:"NÄCHSTE SCENE",action:"scene_next"},
    {label:"WIDGET STUDIO",action:"open_widget_studio"},
    {label:"FREI",action:"none"}
  ]),
  obs:Object.freeze([
    {label:"NÄCHSTE SCENE",action:"scene_next"},
    {label:"OUTPUT RELOAD",action:"output_reload"},
    {label:"OUTPUT STOP",action:"output_stop"},
    {label:"WIDGET AN/AUS",action:"widget_toggle"},
    {label:"FOLLOW TEST",action:"alert_follow"},
    {label:"GIFT TEST",action:"alert_gift"},
    {label:"SHARE TEST",action:"alert_share"},
    {label:"SCENE STUDIO",action:"open_scene_studio"},
    {label:"WIDGET STUDIO",action:"open_widget_studio"},
    {label:"DATEN SYNC",action:"refresh_library"},
    {label:"DASHBOARD",action:"open_dashboard"},
    {label:"FREI",action:"none"}
  ]),
  creator:Object.freeze([
    {label:"DASHBOARD",action:"open_dashboard"},
    {label:"WIDGET STUDIO",action:"open_widget_studio"},
    {label:"SCENE STUDIO",action:"open_scene_studio"},
    {label:"CUT STUDIO",action:"open_cut_studio"},
    {label:"GAMES",action:"open_games"},
    {label:"DATEN SYNC",action:"refresh_library"},
    {label:"LIVE",action:"live_toggle"},
    {label:"AUTOTHANKS",action:"autothanks_toggle"},
    {label:"FOLLOW TEST",action:"alert_follow"},
    {label:"GIFT TEST",action:"alert_gift"},
    {label:"OUTPUT RELOAD",action:"output_reload"},
    {label:"FREI",action:"none"}
  ])
});

function cleanLabel(value,fallback="BUTTON"){
  const text=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  return (text||fallback).slice(0,28);
}

function cleanTarget(value){
  return String(value??"").trim().slice(0,160);
}

function cleanColor(value){
  const key=String(value||"auto").trim().toLowerCase();
  return BUTTON_COLORS.has(key)?key:"auto";
}

function cleanIcon(value){
  return String(value??"").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,4);
}

function normalizeProfileId(value){
  const id=String(value||"live").trim().toLowerCase();
  return PROFILE_IDS.has(id)?id:"live";
}

function profileDefaults(profileId){
  return PROFILE_DEFAULTS[normalizeProfileId(profileId)]||DEFAULT_BUTTONS;
}

function sanitizeButton(input,index=0,fallbackLayout=DEFAULT_BUTTONS){
  const fallback=fallbackLayout[index]||DEFAULT_BUTTONS[index]||{id:`slot_${index+1}`,label:`BUTTON ${index+1}`,action:"none",target:""};
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const id=`slot_${index+1}`;
  const fallbackAction=ACTION_MAP.has(String(fallback.action||""))?String(fallback.action):"none";
  const action=ACTION_MAP.has(String(source.action||""))?String(source.action):fallbackAction;
  const def=ACTION_MAP.get(action)||ACTION_MAP.get("none");
  const target=def.target_kind==="none"?"":cleanTarget(source.target);
  return {
    id,
    label:cleanLabel(source.label,fallback.label),
    action,
    target,
    color:cleanColor(source.color),
    icon:cleanIcon(source.icon)
  };
}

function sanitizeLayout(input,fallbackLayout=DEFAULT_BUTTONS){
  const source=Array.isArray(input)?input:[];
  return Array.from({length:MAX_BUTTONS},(_,index)=>sanitizeButton(source[index],index,fallbackLayout));
}

function defaultProfiles(){
  return Object.fromEntries(PROFILE_CATALOG.map(profile=>[profile.id,sanitizeLayout(profileDefaults(profile.id),profileDefaults(profile.id))]));
}

class StreamDeckStore{
  constructor(filePath){
    this.filePath=filePath;
    fs.mkdirSync(path.dirname(filePath),{recursive:true});
    const loaded=this.load();
    this.activeProfile=loaded.activeProfile;
    this.profiles=loaded.profiles;
  }

  load(){
    try{
      const parsed=JSON.parse(fs.readFileSync(this.filePath,"utf8"));
      const activeProfile=normalizeProfileId(parsed?.active_profile);
      const profiles=defaultProfiles();
      if(parsed?.profiles&&typeof parsed.profiles==="object"&&!Array.isArray(parsed.profiles)){
        for(const profile of PROFILE_CATALOG){
          profiles[profile.id]=sanitizeLayout(parsed.profiles[profile.id],profileDefaults(profile.id));
        }
      }else{
        // Migration vom bisherigen Einzel-Deck: bisherige Belegung bleibt auf TikTok LIVE erhalten.
        profiles.live=sanitizeLayout(parsed?.buttons,DEFAULT_BUTTONS);
      }
      return {activeProfile,profiles};
    }catch{
      return {activeProfile:"live",profiles:defaultProfiles()};
    }
  }

  persist(){
    const payload={
      schema:1,
      updated_at:new Date().toISOString(),
      active_profile:this.activeProfile,
      // buttons bleibt für ältere Diagnosen/Tests kompatibel und spiegelt die aktive Seite.
      buttons:this.profiles[this.activeProfile],
      profiles:this.profiles
    };
    const tmp=this.filePath+".tmp";
    fs.writeFileSync(tmp,JSON.stringify(payload,null,2),"utf8");
    fs.renameSync(tmp,this.filePath);
  }

  snapshot(){
    const buttons=this.profiles[this.activeProfile]||this.profiles.live;
    return {
      schema:1,
      max_buttons:MAX_BUTTONS,
      active_profile:this.activeProfile,
      profiles:PROFILE_CATALOG.map(profile=>({...profile})),
      buttons:buttons.map(button=>({...button})),
      action_catalog:ACTION_CATALOG.map(action=>({...action}))
    };
  }

  setActiveProfile(profileId){
    this.activeProfile=normalizeProfileId(profileId);
    this.persist();
    return this.snapshot();
  }

  getButton(id){
    const key=String(id||"");
    const buttons=this.profiles[this.activeProfile]||[];
    const index=buttons.findIndex(button=>button.id===key);
    return index>=0?{...buttons[index]}:null;
  }

  updateButton(id,patch={}){
    const key=String(id||"");
    const buttons=this.profiles[this.activeProfile]||[];
    const index=buttons.findIndex(button=>button.id===key);
    if(index<0)throw new Error("Stream-Deck Button nicht gefunden.");
    buttons[index]=sanitizeButton({...buttons[index],...(patch||{})},index,profileDefaults(this.activeProfile));
    this.profiles[this.activeProfile]=buttons;
    this.persist();
    return this.snapshot();
  }

  reset(){
    this.profiles[this.activeProfile]=sanitizeLayout(profileDefaults(this.activeProfile),profileDefaults(this.activeProfile));
    this.persist();
    return this.snapshot();
  }
}

module.exports={StreamDeckStore,ACTION_CATALOG,DEFAULT_BUTTONS,PROFILE_CATALOG,PROFILE_DEFAULTS,MAX_BUTTONS,sanitizeButton,sanitizeLayout};
