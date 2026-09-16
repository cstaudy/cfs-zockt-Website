"use strict";
const fs=require("node:fs");const path=require("node:path");
class BetaSessionStore{
  constructor(filePath){this.filePath=filePath;fs.mkdirSync(path.dirname(filePath),{recursive:true});this.state=this.load()}
  empty(){return{schema:1,active:false,sessionId:null,label:"",startedAt:null,lastError:""}}
  load(){try{const d=JSON.parse(fs.readFileSync(this.filePath,"utf8"));return{schema:1,active:Boolean(d.active&&d.sessionId),sessionId:d.sessionId?String(d.sessionId):null,label:String(d.label||"").slice(0,120),startedAt:d.startedAt||null,lastError:String(d.lastError||"").slice(0,500)}}catch{return this.empty()}}
  persist(){const tmp=this.filePath+".tmp";fs.writeFileSync(tmp,JSON.stringify(this.state,null,2),"utf8");fs.renameSync(tmp,this.filePath)}
  start(session){if(!session?.id)throw new Error("Beta Session-ID fehlt.");this.state={schema:1,active:true,sessionId:String(session.id),label:String(session.label||"Beta Test").slice(0,120),startedAt:session.started_at||new Date().toISOString(),lastError:""};this.persist();return this.snapshot()}
  fail(message){this.state.lastError=String(message||"").slice(0,500);this.persist();return this.snapshot()}
  clear(){this.state=this.empty();this.persist();return this.snapshot()}
  snapshot(){return{...this.state}}
}
module.exports={BetaSessionStore};
