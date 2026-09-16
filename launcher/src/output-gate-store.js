"use strict";

const fs=require("node:fs");
const path=require("node:path");

const CHECKS=Object.freeze([
  {key:"local_output_opens",label:"Lokaler Output öffnet"},
  {key:"scene_renders",label:"Scene rendert vollständig"},
  {key:"obs_window_capture",label:"OBS Window Capture erkennt Output"},
  {key:"obs_transparency",label:"OBS Transparenz / Alpha korrekt"},
  {key:"obs_browser_source",label:"OBS Browser Source korrekt"},
  {key:"tiktok_window_visible",label:"TikTok LIVE Studio erkennt Output-Fenster"},
  {key:"tiktok_capture_quality",label:"TikTok Capture Qualität korrekt"},
  {key:"live_data_updates",label:"LIVE-Daten aktualisieren sichtbar"},
  {key:"alerts_render",label:"Alerts / Animationen sichtbar"},
  {key:"simultaneous_obs_tiktok",label:"OBS + TikTok gleichzeitig stabil"},
  {key:"sustained_30min",label:"30 Minuten Lasttest stabil"}
]);

function validStatus(value){
  return ["untested","pass","fail"].includes(String(value))?String(value):"untested";
}

class OutputGateStore{
  constructor(filePath,{version="",platform=process.platform}={}){
    this.filePath=filePath;
    this.version=String(version||"");
    this.platform=String(platform||"");
    this.data=this.load();
  }

  empty(){
    return {
      schema:1,
      launcher_version:this.version,
      platform:this.platform,
      created_at:new Date().toISOString(),
      updated_at:new Date().toISOString(),
      scene:null,
      checks:Object.fromEntries(CHECKS.map(c=>[c.key,{status:"untested",note:"",updated_at:null}])),
      history:[]
    };
  }

  load(){
    try{
      const parsed=JSON.parse(fs.readFileSync(this.filePath,"utf8"));
      const base=this.empty();
      for(const c of CHECKS){
        const current=parsed?.checks?.[c.key]||{};
        base.checks[c.key]={
          status:validStatus(current.status),
          note:String(current.note||"").slice(0,500),
          updated_at:current.updated_at||null
        };
      }
      base.created_at=parsed.created_at||base.created_at;
      base.updated_at=parsed.updated_at||base.updated_at;
      base.scene=parsed.scene||null;
      base.history=Array.isArray(parsed.history)?parsed.history.slice(-100):[];
      return base;
    }catch{return this.empty()}
  }

  persist(){
    fs.mkdirSync(path.dirname(this.filePath),{recursive:true});
    const tmp=this.filePath+".tmp";
    fs.writeFileSync(tmp,JSON.stringify(this.data,null,2),"utf8");
    fs.renameSync(tmp,this.filePath);
  }

  snapshot(){
    const checks=CHECKS.map(def=>({
      ...def,
      ...(this.data.checks[def.key]||{status:"untested",note:"",updated_at:null})
    }));
    const pass=checks.filter(c=>c.status==="pass").length;
    const fail=checks.filter(c=>c.status==="fail").length;
    const untested=checks.length-pass-fail;
    return {
      schema:1,
      launcher_version:this.version,
      platform:this.platform,
      scene:this.data.scene,
      created_at:this.data.created_at,
      updated_at:this.data.updated_at,
      checks,
      summary:{total:checks.length,pass,fail,untested,complete:untested===0&&fail===0},
      history:this.data.history.slice(-30)
    };
  }

  setScene(scene){
    this.data.scene=scene?{
      id:String(scene.id||""),
      name:String(scene.name||"Scene").slice(0,120),
      profile:String(scene.profile||""),
      source_url:String(scene.source_url||"").replace(/([#?&](?:token|key|secret)=)[^&#]+/gi,"$1***")
    }:null;
    this.data.updated_at=new Date().toISOString();
    this.persist();
    return this.snapshot();
  }

  update(key,status,note=""){
    const def=CHECKS.find(c=>c.key===String(key));
    if(!def)throw new Error("Unbekannter Output-Test.");
    const next=validStatus(status);
    const now=new Date().toISOString();
    this.data.checks[def.key]={status:next,note:String(note||"").slice(0,500),updated_at:now};
    this.data.updated_at=now;
    this.data.history.push({key:def.key,status:next,note:String(note||"").slice(0,200),at:now});
    this.data.history=this.data.history.slice(-100);
    this.persist();
    return this.snapshot();
  }

  reset(){
    this.data=this.empty();
    this.persist();
    return this.snapshot();
  }
}

module.exports={OutputGateStore,CHECKS};
