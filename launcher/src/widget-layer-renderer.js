"use strict";

const { EventEmitter } = require("node:events");

function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback}
function safeText(value,max=240){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function validWidgetUrl(value){
  const raw=safeText(value,1800);if(!raw)return"";
  try{
    const url=new URL(raw);
    const local=url.hostname==="127.0.0.1"||url.hostname==="localhost";
    if(url.protocol!=="https:"&&!local)return"";
    if(!/^\/widgets\//i.test(url.pathname))return"";
    return url.toString();
  }catch{return""}
}
function normalizeWidgetSpec(input={}){
  const key=safeText(input.key,220),url=validWidgetUrl(input.url),width=clamp(input.width,32,4096,600),height=clamp(input.height,32,4096,120),fps=clamp(input.fps,1,30,30);
  if(!key||!url)return null;
  return{key,url,width,height,fps};
}

class WidgetLayerRenderer extends EventEmitter{
  constructor({BrowserWindow,logger=null}={}){
    super();
    if(!BrowserWindow)throw new Error("BrowserWindow fehlt für den Widget-Compositor.");
    this.BrowserWindow=BrowserWindow;
    this.logger=logger;
    this.sources=new Map();
    this.attachments=new Set();
  }

  normalizeWanted(specs=[]){
    const wanted=new Map();
    for(const raw of Array.isArray(specs)?specs:[]){const spec=normalizeWidgetSpec(raw);if(spec)wanted.set(spec.key,spec)}
    return wanted;
  }

  async ensure(specs=[]){
    const wanted=this.normalizeWanted(specs);
    for(const [key,entry] of [...this.sources.entries()]){
      const next=wanted.get(key);
      if(next&&(next.url!==entry.spec.url||next.width!==entry.spec.width||next.height!==entry.spec.height))this.destroySource(key);
    }
    for(const spec of wanted.values())if(!this.sources.has(spec.key))await this.createSource(spec);
    return this.snapshot();
  }

  async prepare(specs=[]){
    const wanted=this.normalizeWanted(specs);
    await this.ensure([...wanted.values()]);
    for(const key of [...this.sources.keys()])if(!wanted.has(key))this.destroySource(key);
    return this.snapshot();
  }

  async createSource(spec){
    const win=new this.BrowserWindow({
      width:spec.width,
      height:spec.height,
      useContentSize:true,
      show:false,
      frame:false,
      transparent:true,
      backgroundColor:"#00000000",
      resizable:false,
      movable:false,
      minimizable:false,
      maximizable:false,
      fullscreenable:false,
      webPreferences:{
        contextIsolation:true,
        nodeIntegration:false,
        sandbox:true,
        backgroundThrottling:false,
        offscreen:true
      }
    });
    const entry={spec,win,frame:Buffer.alloc(spec.width*spec.height*4),ready:false,loaded:false,lastPaintAt:0,error:""};
    this.sources.set(spec.key,entry);
    const wc=win.webContents;
    try{wc?.setFrameRate?.(spec.fps)}catch{}
    try{wc?.setAudioMuted?.(true)}catch{}
    try{wc?.setWindowOpenHandler?.(()=>({action:"deny"}))}catch{}
    let allowedOrigin="";try{allowedOrigin=new URL(spec.url).origin}catch{}
    wc?.on?.("will-navigate",(event,url)=>{try{const parsed=new URL(url);if(parsed.origin!==allowedOrigin||!/^\/widgets\//i.test(parsed.pathname))event.preventDefault()}catch{event.preventDefault()}});
    wc?.on?.("paint",(_event,_dirty,image)=>{
      try{
        let bitmap=image?.toBitmap?.({scaleFactor:1});
        if(!Buffer.isBuffer(bitmap)||bitmap.length!==spec.width*spec.height*4)bitmap=image?.resize?.({width:spec.width,height:spec.height,quality:"best"})?.toBitmap?.({scaleFactor:1});
        if(!Buffer.isBuffer(bitmap)||bitmap.length!==spec.width*spec.height*4)return;
        entry.frame=Buffer.from(bitmap);
        entry.ready=true;entry.lastPaintAt=Date.now();entry.error="";
      }catch(error){entry.error=safeText(error?.message||error,260)}
    });
    wc?.on?.("render-process-gone",(_event,details)=>{entry.ready=false;entry.error=`Widget Renderer beendet: ${safeText(details?.reason||"unknown",80)}`;this.emit("error",{key:spec.key,error:entry.error})});
    win.on?.("closed",()=>{if(this.sources.get(spec.key)?.win===win)this.sources.delete(spec.key)});
    try{wc?.startPainting?.()}catch{}
    try{
      await win.loadURL(spec.url);
      entry.loaded=true;
      try{wc?.invalidate?.()}catch{}
      return entry;
    }catch(error){
      entry.error=safeText(error?.message||error,260);
      this.destroySource(spec.key);
      throw new Error(`Widget-Layer konnte nicht geladen werden: ${entry.error}`);
    }
  }

  attach(key,writable,{fps=30}={}){
    const entry=this.sources.get(String(key||""));
    if(!entry)throw new Error("Widget-Layer ist nicht vorbereitet.");
    if(!writable||typeof writable.write!=="function")throw new Error("FFmpeg Widget-Pipe fehlt.");
    const intervalMs=Math.max(33,Math.round(1000/clamp(fps,1,30,30)));
    const attachment={key:entry.spec.key,writable,timer:null,blocked:false,closed:false};
    const write=()=>{
      if(attachment.closed||attachment.blocked||writable.destroyed||writable.writableEnded)return;
      try{if(writable.write(entry.frame)===false)attachment.blocked=true}catch{attachment.closed=true}
    };
    const onDrain=()=>{attachment.blocked=false;write()};
    const onClose=()=>detach();
    writable.on?.("drain",onDrain);writable.on?.("close",onClose);writable.on?.("error",onClose);
    attachment.timer=setInterval(write,intervalMs);attachment.timer.unref?.();
    write();this.attachments.add(attachment);
    const detach=()=>{
      if(attachment.closed&& !this.attachments.has(attachment))return;
      attachment.closed=true;clearInterval(attachment.timer);this.attachments.delete(attachment);
      writable.off?.("drain",onDrain);writable.off?.("close",onClose);writable.off?.("error",onClose);
      try{writable.end?.()}catch{}
    };
    attachment.detach=detach;
    return detach;
  }

  destroySource(key){
    const entry=this.sources.get(String(key||""));if(!entry)return;
    this.sources.delete(String(key||""));
    try{entry.win?.destroy?.()}catch{}
  }

  releaseAll(){
    for(const attachment of [...this.attachments])try{attachment.detach?.()}catch{}
    for(const key of [...this.sources.keys()])this.destroySource(key);
  }

  snapshot(){
    return{prepared:this.sources.size,sources:[...this.sources.values()].map(entry=>({key:entry.spec.key,width:entry.spec.width,height:entry.spec.height,fps:entry.spec.fps,ready:entry.ready,loaded:entry.loaded,lastPaintAt:entry.lastPaintAt||0,error:safeText(entry.error,180)}))};
  }
}

module.exports={WidgetLayerRenderer,normalizeWidgetSpec,validWidgetUrl};
