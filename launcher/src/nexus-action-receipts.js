"use strict";
const fs=require("node:fs");
const path=require("node:path");

const SECRET_KEY=/(secret|token|password|credential|api[_-]?key|stream[_-]?key|authorization|cookie)/i;
function text(v,max=240){return String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function sanitize(value,depth=0){
  if(depth>5)return "[truncated]";
  if(value===null||value===undefined||typeof value==="boolean"||typeof value==="number")return value??null;
  if(typeof value==="string")return text(value,1000);
  if(Array.isArray(value))return value.slice(0,50).map(v=>sanitize(v,depth+1));
  if(typeof value==="object"){
    const out={};let count=0;
    for(const [key,val] of Object.entries(value)){if(count++>=80)break;out[text(key,80)]=SECRET_KEY.test(key)?"[redacted]":sanitize(val,depth+1)}
    return out;
  }
  return text(value,240);
}
function atomicWrite(filePath,value){fs.mkdirSync(path.dirname(filePath),{recursive:true});const tmp=`${filePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2),"utf8");fs.renameSync(tmp,filePath)}
class NexusActionReceiptStore{
  constructor(filePath,{maxItems=500,ttlMs=7*24*60*60*1000}={}){this.filePath=filePath;this.maxItems=Math.max(50,Math.min(2000,Number(maxItems)||500));this.ttlMs=Math.max(3600000,Number(ttlMs)||7*24*60*60*1000);this.state=this.load()}
  empty(){return{schema:1,receipts:[]}}
  load(){try{const raw=JSON.parse(fs.readFileSync(this.filePath,"utf8"));return{schema:1,receipts:Array.isArray(raw?.receipts)?raw.receipts:[]}}catch{return this.empty()}}
  prune(){const cutoff=Date.now()-this.ttlMs;this.state.receipts=this.state.receipts.filter(r=>{const t=Date.parse(r?.recorded_at||"");return r?.id&&Number.isFinite(t)&&t>=cutoff}).slice(0,this.maxItems)}
  persist(){this.prune();atomicWrite(this.filePath,this.state)}
  get(id){this.prune();const key=text(id,160);const r=this.state.receipts.find(x=>x.id===key);return r?{...r,result:sanitize(r.result)}:null}
  remember(id,actionName,result={}){const key=text(id,160);if(!key)throw new Error("Action-ID fehlt.");const existing=this.get(key);if(existing)return existing;const receipt={id:key,action:text(actionName,120),result:sanitize(result),recorded_at:new Date().toISOString()};this.state.receipts.unshift(receipt);this.persist();return receipt}
  snapshot(){this.prune();return{schema:1,count:this.state.receipts.length,receipts:this.state.receipts.slice(0,30).map(r=>({id:r.id,action:r.action,recorded_at:r.recorded_at})),secrets_exposed:false}}
}
module.exports={NexusActionReceiptStore,sanitizeReceiptValue:sanitize};
